/**
 * Outline-driven article engine for Briefzy.
 *
 * - The outline produced by the Briefzy AI SEO Assistant is the backbone: every outline
 *   section becomes one <h2> chapter and every subtopic one <h3>, in the same order.
 * - With Gemini: each chapter is written by its own model call (so no single response has to
 *   hold 3,000+ words), short chapters are re-expanded, and a deterministic top-up guarantees
 *   the final English article never ends below MIN_WORDS.
 * - Without Gemini: a deterministic template writer builds the article from the same outline.
 *   It is available natively in en / es / de / fr / ja.
 * - Translation: Gemini translates the finished HTML chapter by chapter (translateArticleWithAI),
 *   so non-English readers get the real article instead of regex-patched English.
 *
 * Nothing in here touches the DOM or Node APIs, so it runs in Express and Cloudflare Workers.
 */

export const MIN_WORDS = 3000;
/** We aim above the floor so small counting differences never drop us under 3,000. */
export const TARGET_WORDS = 3400;

export type TargetLang = 'es' | 'de' | 'fr' | 'ja';
export type AnyLang = 'en' | TargetLang;
export const TARGET_LANGS: TargetLang[] = ['es', 'de', 'fr', 'ja'];

export interface OutlineSection {
  heading: string;
  targetWords?: number;
  subtopics?: string[];
  keywordsToInclude?: string[];
  recommendedCitations?: string;
}

export interface Outline {
  workingTitle?: string;
  metaDescription?: string;
  suggestedSlug?: string;
  targetPrimaryKeyword?: string;
  sections?: OutlineSection[];
  faqSchemaCandidates?: string[];
  expertTakeawayTip?: string;
  [k: string]: any;
}

export interface ArticleFaq { question: string; answer: string }

export interface LocalizedFields {
  title: string;
  metaDescription: string;
  readingTime: string;
  keyTakeaways: string[];
  faqs: ArticleFaq[];
  content: string;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  metaDescription: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  readingTime: string;
  keyTakeaways: string[];
  content: string;
  faqs: ArticleFaq[];
  seoScore: number;
  estimatedCpc: string;
  author: string;
  wordCount: number;
  translations?: Partial<Record<TargetLang, LocalizedFields>>;
}

export type ModelCaller = (o: {
  system: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}) => Promise<string>;

// ---------------------------------------------------------------------------
// Counting helpers
// ---------------------------------------------------------------------------

export function htmlToText(html: string): string {
  return (html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
}

export function countHtmlWords(html: string): number {
  if (!html) return 0;
  return htmlToText(html).trim().split(/\s+/).filter(Boolean).length;
}

const readingTimeLabel: Record<AnyLang, (n: number) => string> = {
  en: (n) => `${n} min read`,
  es: (n) => `${n} min de lectura`,
  de: (n) => `${n} Min. Lesezeit`,
  fr: (n) => `${n} min de lecture`,
  ja: (n) => `読了時間: 約${n}分`,
};

export function readingTimeFor(words: number, lang: AnyLang = 'en'): string {
  return readingTimeLabel[lang](Math.max(1, Math.ceil(words / 200)));
}

const stripSectionNumber = (h: string) => (h || '').replace(/^\s*\d+[.)]\s*/, '').trim();
const slugify = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 90);
const escapeHtml = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------------------
// Outline handling
// ---------------------------------------------------------------------------

export function buildDefaultOutline(topic: string, keyword: string): Outline {
  const T = topic;
  return {
    workingTitle: `${T}: The Complete Guide, Benchmarks and Practical Roadmap`,
    metaDescription: `A complete, source-minded guide to ${T}: how it works, what it costs, the risks to manage and a step-by-step plan you can follow.`,
    suggestedSlug: slugify(T),
    targetPrimaryKeyword: keyword,
    sections: [
      { heading: `1. Executive Summary: Why ${T} Matters Now`, targetWords: 420, subtopics: ['What has changed recently', 'Who is affected most', 'The short answer'], keywordsToInclude: [keyword] },
      { heading: `2. Background and Core Concepts`, targetWords: 400, subtopics: ['Key definitions', 'How the pieces fit together', 'Common misconceptions'], keywordsToInclude: [keyword] },
      { heading: `3. How It Works in Practice`, targetWords: 450, subtopics: ['The standard workflow', 'Tools and prerequisites', 'Where things usually go wrong', 'Quality checks'], keywordsToInclude: [keyword] },
      { heading: `4. Comparing the Main Options`, targetWords: 420, subtopics: ['Selection criteria', 'Strengths and trade-offs', 'Which option fits which situation'], keywordsToInclude: [keyword] },
      { heading: `5. Costs, Value and Return`, targetWords: 400, subtopics: ['Direct and hidden costs', 'Measuring the benefit', 'Break-even thinking'], keywordsToInclude: [keyword] },
      { heading: `6. Risks, Safety and Compliance`, targetWords: 400, subtopics: ['Main risk categories', 'Regulation and privacy', 'Safeguards that work'], keywordsToInclude: [keyword] },
      { heading: `7. A Step-by-Step Implementation Plan`, targetWords: 450, subtopics: ['Weeks 1-2: preparation', 'Weeks 3-6: pilot', 'Weeks 7-12: rollout and review'], keywordsToInclude: [keyword] },
      { heading: `8. Looking Ahead: Trends and Final Recommendations`, targetWords: 400, subtopics: ['What to expect next', 'Decisions to make today', 'Final checklist'], keywordsToInclude: [keyword] },
    ],
    faqSchemaCandidates: [
      `What is ${T} and who is it for?`,
      `How much does ${T} typically cost?`,
      `What are the biggest risks with ${T}?`,
      `How long does it take to see results from ${T}?`,
      `What is the best way to get started with ${T}?`,
    ],
  };
}

export interface NormalizedSection {
  heading: string;
  targetWords: number;
  subtopics: string[];
  keywords: string[];
  citation: string;
}

/**
 * Turns whatever the SEO Assistant returned into a predictable structure and scales each
 * chapter's word target so the sum comfortably clears TARGET_WORDS. The outline's own order,
 * headings, subtopics and keywords are never replaced.
 */
export function normalizeOutline(outline: Outline | null | undefined, topic: string, keyword: string) {
  const base = outline && Array.isArray(outline.sections) && outline.sections.length > 0
    ? outline
    : buildDefaultOutline(topic, keyword);
  const raw = base.sections!.filter((s) => s && typeof s.heading === 'string' && s.heading.trim());
  // A very short outline cannot carry a 3,000-word article; keep its chapters first and add generic ones after.
  if (raw.length < 6) {
    const have = new Set(raw.map((s) => stripSectionNumber(s.heading).toLowerCase()));
    for (const d of buildDefaultOutline(topic, keyword).sections!) {
      if (raw.length >= 6) break;
      if (!have.has(stripSectionNumber(d.heading).toLowerCase())) raw.push({ ...d, heading: `${raw.length + 1}. ${stripSectionNumber(d.heading)}` });
    }
  }
  const sections: NormalizedSection[] = raw.map((s, i) => ({
    heading: s.heading.trim(),
    targetWords: Math.max(150, Number(s.targetWords) || 0),
    subtopics: (Array.isArray(s.subtopics) && s.subtopics.length ? s.subtopics : [
      `Key facts about ${stripSectionNumber(s.heading) || topic}`,
      'How to apply it',
      'What to avoid',
    ]).map((x) => String(x).trim()).filter(Boolean),
    keywords: (Array.isArray(s.keywordsToInclude) && s.keywordsToInclude.length ? s.keywordsToInclude : [keyword]).map(String),
    citation: s.recommendedCitations ? String(s.recommendedCitations) : '',
  }));
  const bodyBudget = TARGET_WORDS - 520; // intro + conclusion + FAQ-free body
  const sum = sections.reduce((a, s) => a + s.targetWords, 0);
  const perSectionFloor = Math.ceil(bodyBudget / Math.max(1, sections.length));
  const scale = sum < bodyBudget ? bodyBudget / Math.max(sum, 1) : 1;
  sections.forEach((s) => {
    s.targetWords = Math.min(1000, Math.max(perSectionFloor, Math.round(s.targetWords * scale)));
  });
  return { outline: base, sections };
}

// ---------------------------------------------------------------------------
// Template writer (no model). Natively available in 5 languages.
// Slots: {T} topic, {H} chapter heading, {S} subtopic, {K} keywords
// ---------------------------------------------------------------------------

interface Bank {
  intro: string[];
  sec: string[];
  sub: string[];
  concl: string[];
  conclHeading: string;
  checklistHeading: string;
  checklistLine: string;
  tableHead: [string, string, string, string];
  tableRows: [string, string, string, string][];
  source: string;
  takeaway: string;
  faq: string[];
  quote: string;
  titleSuffix: string;
}

const BANKS: Record<AnyLang, Bank> = {
  en: {
    intro: [
      'Few subjects reward careful reading as much as {T}. The advice around it changes quickly, vendors and commentators compete for attention, and it is easy to come away with strong opinions but little that you can actually use. This guide takes the opposite approach: it follows one structured outline from the first question to the final recommendation.',
      'You will find definitions where they are needed, trade-offs stated openly, and practical steps that you can test on a small scale before committing. Where the evidence is solid we say so, and where it is thin we flag it, so you can judge how much weight each claim deserves.',
    ],
    sec: [
      'Any serious discussion of {H} starts with a simple question: what changes for the reader once {T} becomes part of daily practice? The answer is rarely dramatic overnight. It appears as small, repeatable improvements that compound, which is why this chapter works through the details step by step instead of leaning on slogans.',
      'To keep the analysis grounded, this chapter ties each point back to {K}. Readers who already know the basics can skim the definitions and concentrate on the trade-offs, while newcomers get enough context to follow the reasoning without doing outside research first.',
      'A common mistake is treating {H} as a one-time decision. In practice it is a loop: observe what is happening, adjust a single variable, measure again, and write down what you learned. People who keep that habit avoid the expensive reversals that catch everyone else by surprise.',
      'It helps to separate what is proven from what is merely popular. Where the evidence behind {H} is strong, this guide says so plainly. Where it is thin, the advice is framed as a starting hypothesis that you should test against your own situation before spending time or money.',
      'Context matters more than most checklists admit. The same approach to {T} can be a sensible default in one setting and a poor fit in another, depending on budget, skills, regulation and how much risk the people involved are willing to carry. Read the guidance in {H} as a map, then adapt the route to your own ground.',
      'Before moving on, pause on what success looks like for {H}. Define it in plain language, pick one or two measurements you can realistically track and agree on when you will review them. Vague goals produce vague results, however good the underlying idea may be.',
    ],
    sub: [
      '{S} deserves its own look because it is where theory meets daily practice. The central idea is to understand how it behaves under normal conditions first, and only then examine what happens when something unexpected pushes it outside those limits.',
      'In practice, handling {S} well comes down to three habits: document the current state, change one thing at a time, and compare the outcome with a baseline. None of this is glamorous, yet it is exactly what separates dependable results from lucky ones.',
      'Typical pitfalls around {S} include skipping the baseline, copying a setup that worked elsewhere without checking its assumptions, and ignoring early warning signs. Each of these is cheap to avoid when spotted early and costly to repair later in the process.',
      'A useful way to evaluate {S} is to ask what would have to be true for the approach to fail. Listing those conditions in advance turns vague worry into concrete checks, and it gives your work on {T} a safety margin that optimism alone cannot provide.',
      'If you are short on time, start with {S} in its simplest form, record what you observe and expand only when the evidence justifies it. Small, verified steps beat ambitious plans that nobody has the capacity to finish, and they leave a trail of notes that makes the next decision easier.',
      'Finally, share what you learn about {S} with colleagues or readers who face the same decision. Explaining your reasoning exposes gaps you did not notice, and the feedback often points to improvements that solo work on {T} would have missed.',
    ],
    concl: [
      'The thread running through every chapter is simple: start small, measure honestly, and expand only when the results justify it. {T} rewards patience and clear thinking far more than speed, and the readers who benefit most are those who write down their assumptions and revisit them regularly.',
      'Use the outline above as a working checklist. Pick the chapter that matches your biggest open question, apply one idea this week, and review the outcome. Over a few cycles that habit produces better decisions than any single piece of advice, including this one.',
    ],
    conclHeading: 'Final Recommendations and Next Steps',
    checklistHeading: 'Quick checklist',
    checklistLine: 'review this point against your own situation and note one measurable result.',
    tableHead: ['Aspect', 'Starting point', 'Mature practice', 'What to watch'],
    tableRows: [
      ['Scope', 'One small, well-defined use', 'Several connected use cases', 'Scope creep without review'],
      ['Measurement', 'A simple before/after baseline', 'Regular tracked indicators', 'Metrics nobody acts on'],
      ['Risk handling', 'Basic safeguards written down', 'Tested, rehearsed procedures', 'Assumptions that go stale'],
      ['Ownership', 'One named person', 'Shared, documented responsibility', 'Unclear hand-offs'],
    ],
    source: 'Reference for this chapter',
    takeaway: '{H}: begin with {S}, record a baseline and review the result before scaling up.',
    faq: [
      'The honest answer depends on your starting point, but a good rule is to begin with one small, measurable step, document the baseline and review the outcome before expanding. The chapters above explain each stage in order.',
      'Costs and timelines vary with scope, so treat any single figure with caution. Estimate direct costs first, add the time your own team will spend, and compare the total with a benefit you can actually measure.',
      'Most problems come from skipped basics rather than exotic failures: no baseline, unclear ownership and assumptions that were never checked. The risk chapter lists safeguards that address each of these.',
    ],
    quote: '“Small steps that are measured and repeated will outperform large plans that nobody reviews.”',
    titleSuffix: 'The Complete Guide',
  },
  es: {
    intro: [
      'Pocos temas premian tanto la lectura atenta como {T}. Los consejos cambian con rapidez, las empresas y los comentaristas compiten por la atención y es fácil quedarse con opiniones firmes pero con poco que se pueda aplicar. Esta guía hace lo contrario: sigue un esquema estructurado desde la primera pregunta hasta la recomendación final.',
      'Encontrará definiciones donde hacen falta, ventajas y desventajas expuestas con claridad y pasos prácticos que puede probar a pequeña escala antes de comprometerse. Cuando la evidencia es sólida lo decimos, y cuando es escasa lo señalamos para que pueda juzgar cuánto peso merece cada afirmación.',
    ],
    sec: [
      'Cualquier análisis serio de {H} empieza con una pregunta sencilla: ¿qué cambia para el lector cuando {T} forma parte de la práctica diaria? La respuesta rara vez es espectacular de un día para otro. Aparece como mejoras pequeñas y repetibles que se acumulan, por eso este capítulo avanza paso a paso en lugar de apoyarse en consignas.',
      'Para mantener el análisis con los pies en la tierra, este capítulo vincula cada punto con {K}. Quien ya conoce lo básico puede repasar las definiciones y centrarse en las ventajas y desventajas, y quien empieza recibe el contexto necesario para seguir el razonamiento sin investigar por su cuenta.',
      'Un error frecuente es tratar {H} como una decisión única. En la práctica es un ciclo: observar lo que ocurre, ajustar una sola variable, medir de nuevo y anotar lo aprendido. Quienes mantienen ese hábito evitan los costosos retrocesos que sorprenden a los demás.',
      'Conviene separar lo comprobado de lo meramente popular. Cuando la evidencia sobre {H} es sólida, esta guía lo dice sin rodeos. Cuando es escasa, el consejo se presenta como una hipótesis inicial que debe contrastar con su propia situación antes de invertir tiempo o dinero.',
    ],
    sub: [
      '{S} merece un análisis propio porque es donde la teoría se encuentra con la práctica diaria. La idea central es comprender primero cómo se comporta en condiciones normales y solo después examinar qué ocurre cuando algo inesperado lo saca de esos límites.',
      'En la práctica, manejar bien {S} se reduce a tres hábitos: documentar el estado actual, cambiar una sola cosa a la vez y comparar el resultado con una referencia. Nada de esto es llamativo, pero es lo que separa los resultados fiables de los afortunados.',
      'Entre los errores típicos en torno a {S} están omitir la referencia inicial, copiar una configuración que funcionó en otro lugar sin revisar sus supuestos e ignorar las primeras señales de alerta. Evitarlos a tiempo es barato; repararlos después resulta caro.',
      'Una forma útil de evaluar {S} es preguntarse qué tendría que ser cierto para que el enfoque fallara. Enumerar esas condiciones de antemano convierte la preocupación vaga en comprobaciones concretas y da a su trabajo sobre {T} un margen de seguridad que el optimismo por sí solo no ofrece.',
    ],
    concl: [
      'El hilo conductor de todos los capítulos es sencillo: empiece poco a poco, mida con honestidad y amplíe solo cuando los resultados lo justifiquen. {T} premia la paciencia y el pensamiento claro mucho más que la velocidad, y quienes más se benefician son los que anotan sus supuestos y los revisan con regularidad.',
      'Use el esquema anterior como lista de verificación. Elija el capítulo que responda a su mayor duda, aplique una idea esta semana y revise el resultado. Tras unos ciclos, ese hábito produce mejores decisiones que cualquier consejo aislado, incluido este.',
    ],
    conclHeading: 'Recomendaciones Finales y Próximos Pasos',
    checklistHeading: 'Lista de verificación rápida',
    checklistLine: 'revise este punto según su propia situación y anote un resultado medible.',
    tableHead: ['Aspecto', 'Punto de partida', 'Práctica madura', 'Qué vigilar'],
    tableRows: [
      ['Alcance', 'Un uso pequeño y bien definido', 'Varios casos de uso conectados', 'Ampliar el alcance sin revisión'],
      ['Medición', 'Una referencia simple de antes y después', 'Indicadores con seguimiento regular', 'Métricas que nadie utiliza'],
      ['Gestión de riesgos', 'Medidas básicas por escrito', 'Procedimientos probados y ensayados', 'Supuestos que quedan obsoletos'],
      ['Responsabilidad', 'Una persona designada', 'Responsabilidad compartida y documentada', 'Traspasos poco claros'],
    ],
    source: 'Referencia de este capítulo',
    takeaway: '{H}: empiece por {S}, registre una referencia y revise el resultado antes de ampliar.',
    faq: [
      'La respuesta sincera depende de su punto de partida, pero una buena regla es comenzar con un paso pequeño y medible, documentar la referencia y revisar el resultado antes de ampliar. Los capítulos anteriores explican cada etapa en orden.',
      'Los costos y plazos varían según el alcance, así que tome con cautela cualquier cifra aislada. Estime primero los costos directos, sume el tiempo de su propio equipo y compare el total con un beneficio que realmente pueda medir.',
      'La mayoría de los problemas nacen de lo básico que se omitió, no de fallos exóticos: sin referencia inicial, responsabilidades poco claras y supuestos que nunca se comprobaron. El capítulo de riesgos enumera medidas para cada caso.',
    ],
    quote: '«Los pasos pequeños, medidos y repetidos superan a los grandes planes que nadie revisa.»',
    titleSuffix: 'Guía Completa',
  },
  de: {
    intro: [
      'Kaum ein Thema belohnt sorgfältiges Lesen so sehr wie {T}. Die Ratschläge ändern sich schnell, Anbieter und Kommentatoren konkurrieren um Aufmerksamkeit, und leicht bleiben starke Meinungen, aber wenig Brauchbares zurück. Dieser Leitfaden geht den entgegengesetzten Weg: Er folgt einer klaren Gliederung von der ersten Frage bis zur abschließenden Empfehlung.',
      'Sie finden Definitionen dort, wo sie nötig sind, offen benannte Vor- und Nachteile sowie praktische Schritte, die Sie im Kleinen testen können, bevor Sie sich festlegen. Wo die Belege solide sind, sagen wir das; wo sie dünn sind, weisen wir darauf hin, damit Sie das Gewicht jeder Aussage selbst einschätzen können.',
    ],
    sec: [
      'Jede ernsthafte Auseinandersetzung mit {H} beginnt mit einer einfachen Frage: Was ändert sich für den Leser, sobald {T} zum Alltag gehört? Die Antwort ist selten über Nacht spektakulär. Sie zeigt sich in kleinen, wiederholbaren Verbesserungen, die sich summieren – deshalb geht dieses Kapitel die Details Schritt für Schritt durch, statt sich auf Schlagworte zu stützen.',
      'Damit die Analyse bodenständig bleibt, verknüpft dieses Kapitel jeden Punkt mit {K}. Wer die Grundlagen kennt, kann die Definitionen überfliegen und sich auf die Abwägungen konzentrieren; Einsteiger erhalten genug Kontext, um der Argumentation ohne eigene Recherche zu folgen.',
      'Ein häufiger Fehler ist es, {H} als einmalige Entscheidung zu behandeln. In der Praxis ist es ein Kreislauf: beobachten, eine einzige Variable anpassen, erneut messen und festhalten, was man gelernt hat. Wer diese Gewohnheit pflegt, vermeidet die teuren Kehrtwenden, die andere überraschen.',
      'Es hilft, Belegtes von bloß Beliebtem zu trennen. Wo die Belege zu {H} stark sind, sagt dieser Leitfaden das klar. Wo sie dünn sind, wird der Rat als Ausgangshypothese formuliert, die Sie an Ihrer eigenen Situation prüfen sollten, bevor Sie Zeit oder Geld einsetzen.',
    ],
    sub: [
      '{S} verdient eine eigene Betrachtung, denn hier trifft Theorie auf den Alltag. Der Kerngedanke: Zuerst verstehen, wie es sich unter normalen Bedingungen verhält, und erst danach untersuchen, was passiert, wenn etwas Unerwartetes es über diese Grenzen hinausdrängt.',
      'In der Praxis läuft der gute Umgang mit {S} auf drei Gewohnheiten hinaus: den Ist-Zustand dokumentieren, immer nur eine Sache ändern und das Ergebnis mit einer Ausgangsbasis vergleichen. Das ist nicht glamourös, aber genau das trennt verlässliche Ergebnisse von glücklichen Zufällen.',
      'Typische Stolpersteine rund um {S} sind das Auslassen der Ausgangsbasis, das Kopieren eines Aufbaus, der anderswo funktionierte, ohne dessen Annahmen zu prüfen, und das Ignorieren früher Warnsignale. Früh erkannt, sind sie günstig zu vermeiden; später sind sie teuer zu beheben.',
      'Eine nützliche Methode, {S} zu bewerten, ist die Frage, was zutreffen müsste, damit der Ansatz scheitert. Wer diese Bedingungen vorab auflistet, macht aus diffuser Sorge konkrete Prüfpunkte und gibt seiner Arbeit an {T} einen Sicherheitspuffer, den Optimismus allein nicht bietet.',
    ],
    concl: [
      'Der rote Faden durch alle Kapitel ist einfach: klein anfangen, ehrlich messen und erst erweitern, wenn die Ergebnisse es rechtfertigen. {T} belohnt Geduld und klares Denken weit mehr als Tempo, und am meisten profitieren diejenigen, die ihre Annahmen aufschreiben und regelmäßig überprüfen.',
      'Nutzen Sie die Gliederung oben als Arbeits-Checkliste. Wählen Sie das Kapitel, das Ihre größte offene Frage beantwortet, setzen Sie diese Woche eine Idee um und werten Sie das Ergebnis aus. Nach wenigen Durchläufen führt diese Gewohnheit zu besseren Entscheidungen als jeder einzelne Ratschlag, auch dieser.',
    ],
    conclHeading: 'Abschließende Empfehlungen und nächste Schritte',
    checklistHeading: 'Kurze Checkliste',
    checklistLine: 'Prüfen Sie diesen Punkt anhand Ihrer eigenen Situation und notieren Sie ein messbares Ergebnis.',
    tableHead: ['Aspekt', 'Ausgangspunkt', 'Reife Praxis', 'Worauf zu achten ist'],
    tableRows: [
      ['Umfang', 'Ein kleiner, klar definierter Einsatz', 'Mehrere verbundene Anwendungsfälle', 'Schleichende Ausweitung ohne Prüfung'],
      ['Messung', 'Einfacher Vorher-Nachher-Vergleich', 'Regelmäßig verfolgte Kennzahlen', 'Kennzahlen, aus denen niemand handelt'],
      ['Risikoumgang', 'Grundlegende Vorkehrungen schriftlich', 'Getestete, eingeübte Verfahren', 'Veraltete Annahmen'],
      ['Verantwortung', 'Eine benannte Person', 'Geteilte, dokumentierte Verantwortung', 'Unklare Übergaben'],
    ],
    source: 'Quellenhinweis zu diesem Kapitel',
    takeaway: '{H}: Beginnen Sie mit {S}, halten Sie eine Ausgangsbasis fest und prüfen Sie das Ergebnis, bevor Sie skalieren.',
    faq: [
      'Die ehrliche Antwort hängt von Ihrer Ausgangslage ab, doch eine gute Regel lautet: mit einem kleinen, messbaren Schritt beginnen, die Ausgangsbasis dokumentieren und das Ergebnis prüfen, bevor Sie erweitern. Die Kapitel oben erklären jede Phase der Reihe nach.',
      'Kosten und Zeitpläne hängen vom Umfang ab, behandeln Sie einzelne Zahlen daher mit Vorsicht. Schätzen Sie zuerst die direkten Kosten, addieren Sie den Zeitaufwand Ihres eigenen Teams und vergleichen Sie die Summe mit einem Nutzen, den Sie tatsächlich messen können.',
      'Die meisten Probleme entstehen durch ausgelassene Grundlagen, nicht durch exotische Fehler: keine Ausgangsbasis, unklare Zuständigkeiten und nie geprüfte Annahmen. Das Risikokapitel nennt Vorkehrungen für jeden dieser Fälle.',
    ],
    quote: '„Kleine Schritte, die gemessen und wiederholt werden, schlagen große Pläne, die niemand überprüft.“',
    titleSuffix: 'Der Komplette Leitfaden',
  },
  fr: {
    intro: [
      'Peu de sujets récompensent autant une lecture attentive que {T}. Les conseils évoluent vite, les fournisseurs et les commentateurs se disputent l’attention, et l’on repart facilement avec des opinions tranchées mais peu d’éléments exploitables. Ce guide fait l’inverse : il suit un plan structuré, de la première question à la recommandation finale.',
      'Vous y trouverez des définitions là où elles sont nécessaires, des compromis exposés ouvertement et des étapes pratiques que vous pouvez tester à petite échelle avant de vous engager. Quand les preuves sont solides, nous le disons ; quand elles sont minces, nous le signalons, afin que vous puissiez juger du poids de chaque affirmation.',
    ],
    sec: [
      'Toute discussion sérieuse de {H} commence par une question simple : qu’est-ce qui change pour le lecteur lorsque {T} entre dans la pratique quotidienne ? La réponse est rarement spectaculaire du jour au lendemain. Elle prend la forme de petites améliorations répétables qui s’additionnent, c’est pourquoi ce chapitre avance pas à pas plutôt que de s’appuyer sur des slogans.',
      'Pour garder l’analyse ancrée dans le réel, ce chapitre rattache chaque point à {K}. Le lecteur qui connaît les bases peut survoler les définitions et se concentrer sur les compromis, tandis que le débutant reçoit assez de contexte pour suivre le raisonnement sans recherche préalable.',
      'Une erreur courante consiste à traiter {H} comme une décision unique. En pratique, c’est une boucle : observer, ajuster une seule variable, mesurer à nouveau et noter ce que l’on a appris. Ceux qui gardent cette habitude évitent les retours en arrière coûteux qui prennent les autres au dépourvu.',
      'Il est utile de distinguer ce qui est prouvé de ce qui est simplement populaire. Quand les preuves sur {H} sont solides, ce guide le dit clairement. Quand elles sont minces, le conseil est présenté comme une hypothèse de départ à confronter à votre propre situation avant d’investir du temps ou de l’argent.',
    ],
    sub: [
      '{S} mérite un examen à part, car c’est là que la théorie rencontre la pratique quotidienne. L’idée centrale est de comprendre d’abord son comportement dans des conditions normales, puis seulement d’examiner ce qui se passe quand un imprévu le pousse hors de ces limites.',
      'Concrètement, bien gérer {S} se résume à trois habitudes : documenter l’état actuel, ne changer qu’une chose à la fois et comparer le résultat à une référence. Rien de spectaculaire, mais c’est précisément ce qui distingue les résultats fiables des coups de chance.',
      'Parmi les pièges courants autour de {S} : sauter la référence initiale, copier une configuration qui a fonctionné ailleurs sans vérifier ses hypothèses et ignorer les premiers signaux d’alerte. Les éviter tôt coûte peu ; les réparer plus tard coûte cher.',
      'Une bonne façon d’évaluer {S} est de se demander ce qui devrait être vrai pour que l’approche échoue. Lister ces conditions à l’avance transforme une inquiétude vague en vérifications concrètes et donne à votre travail sur {T} une marge de sécurité que l’optimisme seul n’offre pas.',
    ],
    concl: [
      'Le fil conducteur de tous les chapitres est simple : commencer petit, mesurer honnêtement et n’étendre que lorsque les résultats le justifient. {T} récompense la patience et la clarté d’esprit bien plus que la vitesse, et ceux qui en profitent le plus sont ceux qui notent leurs hypothèses et les réexaminent régulièrement.',
      'Utilisez le plan ci-dessus comme liste de contrôle. Choisissez le chapitre qui répond à votre plus grande question, appliquez une idée cette semaine et examinez le résultat. Après quelques cycles, cette habitude produit de meilleures décisions que n’importe quel conseil isolé, y compris celui-ci.',
    ],
    conclHeading: 'Recommandations Finales et Prochaines Étapes',
    checklistHeading: 'Liste de contrôle rapide',
    checklistLine: 'examinez ce point au regard de votre situation et notez un résultat mesurable.',
    tableHead: ['Aspect', 'Point de départ', 'Pratique mature', 'Points de vigilance'],
    tableRows: [
      ['Périmètre', 'Un usage réduit et bien défini', 'Plusieurs cas d’usage reliés', 'Dérive du périmètre sans revue'],
      ['Mesure', 'Une référence simple avant/après', 'Indicateurs suivis régulièrement', 'Indicateurs dont personne ne tire parti'],
      ['Gestion des risques', 'Mesures de base consignées par écrit', 'Procédures testées et répétées', 'Hypothèses devenues obsolètes'],
      ['Responsabilité', 'Une personne désignée', 'Responsabilité partagée et documentée', 'Transmissions floues'],
    ],
    source: 'Référence pour ce chapitre',
    takeaway: '{H} : commencez par {S}, consignez une référence et examinez le résultat avant de passer à l’échelle.',
    faq: [
      'La réponse honnête dépend de votre point de départ, mais une bonne règle est de commencer par une étape petite et mesurable, de documenter la référence et d’examiner le résultat avant d’étendre. Les chapitres ci-dessus expliquent chaque phase dans l’ordre.',
      'Les coûts et délais varient selon le périmètre ; prenez donc tout chiffre isolé avec prudence. Estimez d’abord les coûts directs, ajoutez le temps de votre propre équipe et comparez le total à un bénéfice réellement mesurable.',
      'La plupart des problèmes viennent de bases négligées plutôt que de pannes exotiques : pas de référence, responsabilités floues et hypothèses jamais vérifiées. Le chapitre sur les risques propose des mesures pour chacun de ces cas.',
    ],
    quote: '« Les petits pas, mesurés et répétés, l’emportent sur les grands plans que personne ne révise. »',
    titleSuffix: 'Le Guide Complet',
  },
  ja: {
    intro: [
      '{T}ほど、丁寧に読む価値のあるテーマは多くありません。情報は急速に入れ替わり、企業も評論家も注目を競い合うため、強い意見だけが残って実際に使える知識が少ない、ということになりがちです。本ガイドはその逆を目指し、最初の疑問から最終的な提言まで、一つの構成に沿って進めます。',
      '必要な箇所で定義を示し、長所と短所を率直に述べ、約束する前に小さく試せる実践的な手順を紹介します。根拠がしっかりしている点はそう明記し、不十分な点はその旨を示しますので、各主張をどの程度重視すべきか判断できます。',
    ],
    sec: [
      '{H}を真剣に考えるとき、最初の問いはシンプルです。{T}が日常の実践に組み込まれたとき、読者にとって何が変わるのか。答えは一夜にして劇的に現れるものではなく、小さく繰り返せる改善の積み重ねとして現れます。そのため本章では、スローガンに頼らず、細部を一つずつ丁寧に確認していきます。',
      '分析を地に足のついたものにするため、本章では各ポイントを{K}に結び付けて説明します。基本をすでにご存じの方は定義を読み飛ばしてトレードオフに集中でき、初めての方は外部の調べものをしなくても論理を追えるだけの背景を得られます。',
      'よくある誤りは、{H}を一度きりの判断として扱うことです。実際には循環するプロセスです。状況を観察し、変数を一つだけ調整し、再び測定し、学んだことを書き留める。この習慣を続ける人は、他の人が不意に直面する高くつく手戻りを避けられます。',
      '実証済みのことと、単に人気があることを区別すると役立ちます。{H}について根拠が強い部分は、本ガイドもはっきりそう述べます。根拠が乏しい部分は、時間や費用をかける前にご自身の状況で検証すべき出発点の仮説として示します。',
    ],
    sub: [
      '{S}は、理論が日々の実践と出会う場面であるため、個別に検討する価値があります。まず通常の条件下でどのように振る舞うかを理解し、そのうえで想定外の事態が限界を超えさせたときに何が起こるかを調べる、というのが基本的な考え方です。',
      '実際には、{S}をうまく扱うコツは三つの習慣に集約されます。現状を記録する、一度に一つだけ変更する、結果を基準値と比較する。地味ですが、これこそが信頼できる成果と偶然の成果を分けるものです。',
      '{S}に関するありがちな落とし穴は、基準値を取らないこと、他所でうまくいった構成の前提を確認せずに真似ること、早期の警告サインを見過ごすことです。早く気づけば回避は容易ですが、後から修復するには大きなコストがかかります。',
      '{S}を評価する有効な方法は、「どのような条件が重なればこの方法は失敗するか」を問うことです。その条件を事前に書き出せば、漠然とした不安が具体的な確認項目に変わり、{T}への取り組みに楽観だけでは得られない安全余裕が生まれます。',
    ],
    concl: [
      'すべての章に通じる考え方はシンプルです。小さく始め、正直に測定し、結果が裏付けるときにだけ拡大する。{T}では速さよりも忍耐と明晰な思考が報われ、最も恩恵を受けるのは、前提を書き留めて定期的に見直す人です。',
      '上記の構成を実践用のチェックリストとしてお使いください。最も大きな疑問に対応する章を選び、今週一つの考えを実行して結果を振り返ります。数回繰り返せば、この習慣はどんな単独の助言よりも、本ガイドも含めて、良い判断につながります。',
    ],
    conclHeading: '最終的な提言と次のステップ',
    checklistHeading: 'クイックチェックリスト',
    checklistLine: 'この点をご自身の状況に照らして見直し、測定可能な結果を一つ記録してください。',
    tableHead: ['観点', '出発点', '成熟した実践', '注意すべき点'],
    tableRows: [
      ['範囲', '小さく明確に定義した用途', '連携する複数の用途', 'レビューなしの範囲拡大'],
      ['測定', '導入前後のシンプルな基準', '定期的に追跡する指標', '誰も活用しない指標'],
      ['リスク対応', '基本的な対策を文書化', '検証・訓練済みの手順', '古くなった前提'],
      ['責任', '担当者を一人指名', '共有され文書化された責任', '不明確な引き継ぎ'],
    ],
    source: '本章の参考情報',
    takeaway: '{H}：まず{S}から始め、基準値を記録し、結果を確認してから拡大しましょう。',
    faq: [
      '正直なところ、状況によって異なりますが、小さく測定可能な一歩から始め、基準値を記録し、結果を確認してから拡大するのが良い原則です。上の各章で段階ごとに順を追って説明しています。',
      '費用や期間は範囲によって変わるため、単独の数字は慎重に扱ってください。まず直接費用を見積もり、自社チームの作業時間を加え、実際に測定できる効果と合計を比較しましょう。',
      '問題の多くは特殊な故障ではなく、基本の省略から生じます。基準値がない、責任が不明確、前提を確認していない、といった点です。リスクの章では、それぞれに対する対策を挙げています。',
    ],
    quote: '「測定して繰り返す小さな一歩は、誰も見直さない大きな計画に勝る。」',
    titleSuffix: '完全ガイド',
  },
};

/** Translations of the built-in default outline (so no-key mode is fully native). */
const DEFAULT_OUTLINE_I18N: Record<TargetLang, Record<string, string>> = {
  es: {
    'Executive Summary: Why': 'Resumen Ejecutivo: Por Qué Importa', 'Now': 'Ahora',
    'Background and Core Concepts': 'Antecedentes y Conceptos Clave',
    'How It Works in Practice': 'Cómo Funciona en la Práctica',
    'Comparing the Main Options': 'Comparación de las Principales Opciones',
    'Costs, Value and Return': 'Costos, Valor y Retorno',
    'Risks, Safety and Compliance': 'Riesgos, Seguridad y Cumplimiento',
    'A Step-by-Step Implementation Plan': 'Plan de Implementación Paso a Paso',
    'Looking Ahead: Trends and Final Recommendations': 'Perspectivas: Tendencias y Recomendaciones Finales',
    'What has changed recently': 'Qué ha cambiado recientemente', 'Who is affected most': 'A quién afecta más', 'The short answer': 'La respuesta breve',
    'Key definitions': 'Definiciones clave', 'How the pieces fit together': 'Cómo encajan las piezas', 'Common misconceptions': 'Conceptos erróneos frecuentes',
    'The standard workflow': 'El flujo de trabajo estándar', 'Tools and prerequisites': 'Herramientas y requisitos previos', 'Where things usually go wrong': 'Dónde suelen fallar las cosas', 'Quality checks': 'Controles de calidad',
    'Selection criteria': 'Criterios de selección', 'Strengths and trade-offs': 'Ventajas y desventajas', 'Which option fits which situation': 'Qué opción encaja en cada situación',
    'Direct and hidden costs': 'Costos directos y ocultos', 'Measuring the benefit': 'Cómo medir el beneficio', 'Break-even thinking': 'Cálculo del punto de equilibrio',
    'Main risk categories': 'Principales categorías de riesgo', 'Regulation and privacy': 'Regulación y privacidad', 'Safeguards that work': 'Salvaguardas que funcionan',
    'Weeks 1-2: preparation': 'Semanas 1-2: preparación', 'Weeks 3-6: pilot': 'Semanas 3-6: piloto', 'Weeks 7-12: rollout and review': 'Semanas 7-12: despliegue y revisión',
    'What to expect next': 'Qué esperar a continuación', 'Decisions to make today': 'Decisiones que tomar hoy', 'Final checklist': 'Lista de verificación final',
  },
  de: {
    'Executive Summary: Why': 'Zusammenfassung: Warum', 'Now': 'jetzt wichtig ist',
    'Background and Core Concepts': 'Hintergrund und Grundbegriffe',
    'How It Works in Practice': 'So funktioniert es in der Praxis',
    'Comparing the Main Options': 'Die wichtigsten Optionen im Vergleich',
    'Costs, Value and Return': 'Kosten, Nutzen und Rendite',
    'Risks, Safety and Compliance': 'Risiken, Sicherheit und Compliance',
    'A Step-by-Step Implementation Plan': 'Umsetzungsplan Schritt für Schritt',
    'Looking Ahead: Trends and Final Recommendations': 'Ausblick: Trends und abschließende Empfehlungen',
    'What has changed recently': 'Was sich zuletzt geändert hat', 'Who is affected most': 'Wer am stärksten betroffen ist', 'The short answer': 'Die kurze Antwort',
    'Key definitions': 'Wichtige Begriffe', 'How the pieces fit together': 'Wie die Teile zusammenpassen', 'Common misconceptions': 'Verbreitete Irrtümer',
    'The standard workflow': 'Der Standard-Ablauf', 'Tools and prerequisites': 'Werkzeuge und Voraussetzungen', 'Where things usually go wrong': 'Wo es üblicherweise schiefgeht', 'Quality checks': 'Qualitätskontrollen',
    'Selection criteria': 'Auswahlkriterien', 'Strengths and trade-offs': 'Stärken und Abwägungen', 'Which option fits which situation': 'Welche Option zu welcher Situation passt',
    'Direct and hidden costs': 'Direkte und versteckte Kosten', 'Measuring the benefit': 'Den Nutzen messen', 'Break-even thinking': 'Break-even-Denken',
    'Main risk categories': 'Wichtige Risikokategorien', 'Regulation and privacy': 'Regulierung und Datenschutz', 'Safeguards that work': 'Schutzmaßnahmen, die wirken',
    'Weeks 1-2: preparation': 'Woche 1-2: Vorbereitung', 'Weeks 3-6: pilot': 'Woche 3-6: Pilotphase', 'Weeks 7-12: rollout and review': 'Woche 7-12: Einführung und Auswertung',
    'What to expect next': 'Was als Nächstes zu erwarten ist', 'Decisions to make today': 'Entscheidungen für heute', 'Final checklist': 'Abschließende Checkliste',
  },
  fr: {
    'Executive Summary: Why': 'Résumé : Pourquoi', 'Now': 'compte maintenant',
    'Background and Core Concepts': 'Contexte et Concepts Clés',
    'How It Works in Practice': 'Comment Cela Fonctionne en Pratique',
    'Comparing the Main Options': 'Comparaison des Principales Options',
    'Costs, Value and Return': 'Coûts, Valeur et Retour',
    'Risks, Safety and Compliance': 'Risques, Sécurité et Conformité',
    'A Step-by-Step Implementation Plan': 'Plan de Mise en Œuvre Étape par Étape',
    'Looking Ahead: Trends and Final Recommendations': 'Perspectives : Tendances et Recommandations Finales',
    'What has changed recently': 'Ce qui a changé récemment', 'Who is affected most': 'Qui est le plus concerné', 'The short answer': 'La réponse courte',
    'Key definitions': 'Définitions clés', 'How the pieces fit together': 'Comment les éléments s’articulent', 'Common misconceptions': 'Idées reçues courantes',
    'The standard workflow': 'Le flux de travail standard', 'Tools and prerequisites': 'Outils et prérequis', 'Where things usually go wrong': 'Où les choses tournent mal', 'Quality checks': 'Contrôles qualité',
    'Selection criteria': 'Critères de sélection', 'Strengths and trade-offs': 'Atouts et compromis', 'Which option fits which situation': 'Quelle option pour quelle situation',
    'Direct and hidden costs': 'Coûts directs et cachés', 'Measuring the benefit': 'Mesurer le bénéfice', 'Break-even thinking': 'Raisonner en seuil de rentabilité',
    'Main risk categories': 'Principales catégories de risques', 'Regulation and privacy': 'Réglementation et vie privée', 'Safeguards that work': 'Garde-fous efficaces',
    'Weeks 1-2: preparation': 'Semaines 1-2 : préparation', 'Weeks 3-6: pilot': 'Semaines 3-6 : pilote', 'Weeks 7-12: rollout and review': 'Semaines 7-12 : déploiement et bilan',
    'What to expect next': 'À quoi s’attendre ensuite', 'Decisions to make today': 'Décisions à prendre aujourd’hui', 'Final checklist': 'Liste de contrôle finale',
  },
  ja: {
    'Executive Summary: Why': '要約：なぜ重要か', 'Now': '今',
    'Background and Core Concepts': '背景と基本概念',
    'How It Works in Practice': '実際の仕組み',
    'Comparing the Main Options': '主な選択肢の比較',
    'Costs, Value and Return': 'コスト・価値・リターン',
    'Risks, Safety and Compliance': 'リスク・安全性・コンプライアンス',
    'A Step-by-Step Implementation Plan': '段階的な導入計画',
    'Looking Ahead: Trends and Final Recommendations': '今後の展望と最終提言',
    'What has changed recently': '最近の変化', 'Who is affected most': '最も影響を受ける人', 'The short answer': '結論から言うと',
    'Key definitions': '重要な定義', 'How the pieces fit together': '各要素のつながり', 'Common misconceptions': 'よくある誤解',
    'The standard workflow': '標準的な流れ', 'Tools and prerequisites': 'ツールと前提条件', 'Where things usually go wrong': 'つまずきやすい点', 'Quality checks': '品質チェック',
    'Selection criteria': '選定基準', 'Strengths and trade-offs': '長所とトレードオフ', 'Which option fits which situation': '状況別の最適な選択肢',
    'Direct and hidden costs': '直接コストと隠れたコスト', 'Measuring the benefit': '効果の測定', 'Break-even thinking': '損益分岐の考え方',
    'Main risk categories': '主なリスクの種類', 'Regulation and privacy': '規制とプライバシー', 'Safeguards that work': '有効な安全対策',
    'Weeks 1-2: preparation': '1〜2週目：準備', 'Weeks 3-6: pilot': '3〜6週目：パイロット', 'Weeks 7-12: rollout and review': '7〜12週目：展開と見直し',
    'What to expect next': '今後の見通し', 'Decisions to make today': '今日決めるべきこと', 'Final checklist': '最終チェックリスト',
  },
};

/** Look up a default-outline string in a language; unknown (custom outline) text stays as written. */
function tr(lang: AnyLang, text: string, topic: string): string {
  if (lang === 'en') return text;
  const dict = DEFAULT_OUTLINE_I18N[lang];
  const num = text.match(/^(\s*\d+[.)]\s*)/);
  const prefix = num ? num[1] : '';
  const bare = text.slice(prefix.length);
  if (dict[bare]) return prefix + dict[bare];
  const why = bare.match(/^Executive Summary: Why (.+) Matters Now$/);
  if (why) {
    const head = dict['Executive Summary: Why'];
    return lang === 'ja' ? `${prefix}${head}（${why[1]}）` : `${prefix}${head} ${why[1]} ${dict['Now']}`;
  }
  void topic;
  return text;
}

const fill = (tpl: string, v: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : ''));

/** Build the full article body for one language from the (normalized) outline. */
export function buildTemplateContent(
  sections: NormalizedSection[],
  topic: string,
  keyword: string,
  lang: AnyLang,
  opts: { enforceMinWords?: boolean } = {}
): string {
  const b = BANKS[lang];
  const T = topic;
  const parts: string[] = [];
  const kwFor = (s: NormalizedSection) => Array.from(new Set([keyword, ...s.keywords])).slice(0, 3).join(', ');

  const paragraphsFor = (s: NormalizedSection, idx: number, extraRounds: number): string[] => {
    const H = stripSectionNumber(tr(lang, s.heading, topic));
    const out: string[] = [];
    // chapter-level paragraphs, rotating the starting template per chapter for variety
    const secCount = Math.min(b.sec.length, 2 + extraRounds);
    for (let i = 0; i < secCount; i++) {
      out.push(fill(b.sec[(idx + i) % b.sec.length], { T, H, K: kwFor(s) }));
    }
    return out;
  };

  parts.push(...b.intro.map((p) => `<p>${fill(p, { T })}</p>`));
  parts.push(`<blockquote>${b.quote}</blockquote>`);

  const build = (extraRounds: number) => {
    const html: string[] = [];
    sections.forEach((s, idx) => {
      const H = tr(lang, s.heading, topic);
      html.push(`<h2>${escapeHtml(H)}</h2>`);
      paragraphsFor(s, idx, extraRounds).forEach((p) => html.push(`<p>${p}</p>`));
      const subs = s.subtopics.length >= 3 || extraRounds < 2
        ? s.subtopics
        : [...s.subtopics, ...s.keywords.filter((k) => !s.subtopics.includes(k)).slice(0, 3 - s.subtopics.length)];
      subs.forEach((sub, j) => {
        const S = tr(lang, sub, topic);
        html.push(`<h3>${escapeHtml(S)}</h3>`);
        const n = Math.min(b.sub.length, 2 + extraRounds);
        for (let i = 0; i < n; i++) {
          html.push(`<p>${fill(b.sub[(idx + j + i) % b.sub.length], { T, S, H: stripSectionNumber(H) })}</p>`);
        }
      });
      if (idx === Math.min(2, sections.length - 1)) {
        html.push(`<table class="w-full text-left border-collapse my-6"><thead><tr>${b.tableHead.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${b.tableRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      }
      if (idx === sections.length - 1 || sections.length === 1) {
        html.push(`<h3>${b.checklistHeading}</h3>`);
        html.push(`<ul>${sections.map((x) => `<li><strong>${escapeHtml(stripSectionNumber(tr(lang, x.heading, topic)))}:</strong> ${b.checklistLine}</li>`).join('')}</ul>`);
      }
      if (s.citation) html.push(`<p><em>${b.source}: ${escapeHtml(s.citation)}.</em></p>`);
    });
    html.push(`<h2>${b.conclHeading}</h2>`);
    b.concl.forEach((p) => html.push(`<p>${fill(p, { T })}</p>`));
    return html;
  };

  let body = build(0);
  if (lang === 'en' && opts.enforceMinWords !== false) {
    // Only rounds that add real, non-duplicated paragraphs are used; stops as soon as we clear the target.
    for (let round = 1; round <= 5 && countHtmlWords(parts.concat(body).join('\n')) < TARGET_WORDS; round++) {
      body = build(round);
    }
  }
  return parts.concat(body).join('\n\n');
}

function templateExtras(sections: NormalizedSection[], topic: string, outline: Outline | null, lang: AnyLang) {
  const b = BANKS[lang];
  const T = topic;
  const takeaways = sections.slice(0, 4).map((s) =>
    fill(b.takeaway, { H: stripSectionNumber(tr(lang, s.heading, topic)), S: tr(lang, s.subtopics[0] || topic, topic), T })
  );
  const questions = outline?.faqSchemaCandidates && outline.faqSchemaCandidates.length
    ? outline.faqSchemaCandidates
    : buildDefaultOutline(topic, topic).faqSchemaCandidates!;
  const faqs = questions.slice(0, 5).map((q, i) => ({ question: lang === 'en' ? q : trFaqQuestion(lang, q, T), answer: b.faq[i % b.faq.length] }));
  return { takeaways, faqs };
}

const FAQ_Q_I18N: Record<TargetLang, [RegExp, (t: string) => string][]> = {
  es: [[/^What is (.+) and who is it for\?$/, (t) => `¿Qué es ${t} y para quién es?`], [/^How much does (.+) typically cost\?$/, (t) => `¿Cuánto suele costar ${t}?`], [/^What are the biggest risks with (.+)\?$/, (t) => `¿Cuáles son los mayores riesgos de ${t}?`], [/^How long does it take to see results from (.+)\?$/, (t) => `¿Cuánto tarda en verse resultados con ${t}?`], [/^What is the best way to get started with (.+)\?$/, (t) => `¿Cuál es la mejor forma de empezar con ${t}?`]],
  de: [[/^What is (.+) and who is it for\?$/, (t) => `Was ist ${t} und für wen ist es geeignet?`], [/^How much does (.+) typically cost\?$/, (t) => `Was kostet ${t} in der Regel?`], [/^What are the biggest risks with (.+)\?$/, (t) => `Was sind die größten Risiken bei ${t}?`], [/^How long does it take to see results from (.+)\?$/, (t) => `Wie lange dauert es, bis ${t} Ergebnisse zeigt?`], [/^What is the best way to get started with (.+)\?$/, (t) => `Wie gelingt der Einstieg in ${t} am besten?`]],
  fr: [[/^What is (.+) and who is it for\?$/, (t) => `Qu’est-ce que ${t} et à qui s’adresse-t-il ?`], [/^How much does (.+) typically cost\?$/, (t) => `Combien coûte généralement ${t} ?`], [/^What are the biggest risks with (.+)\?$/, (t) => `Quels sont les principaux risques de ${t} ?`], [/^How long does it take to see results from (.+)\?$/, (t) => `Combien de temps faut-il pour voir des résultats avec ${t} ?`], [/^What is the best way to get started with (.+)\?$/, (t) => `Quelle est la meilleure façon de commencer avec ${t} ?`]],
  ja: [[/^What is (.+) and who is it for\?$/, (t) => `${t}とは何で、誰に向いていますか？`], [/^How much does (.+) typically cost\?$/, (t) => `${t}の費用は一般的にどのくらいですか？`], [/^What are the biggest risks with (.+)\?$/, (t) => `${t}の最大のリスクは何ですか？`], [/^How long does it take to see results from (.+)\?$/, (t) => `${t}の成果が出るまでどのくらいかかりますか？`], [/^What is the best way to get started with (.+)\?$/, (t) => `${t}を始める最良の方法は何ですか？`]],
};
function trFaqQuestion(lang: TargetLang, q: string, _topic: string): string {
  for (const [re, f] of FAQ_Q_I18N[lang]) {
    const m = q.match(re);
    if (m) return f(m[1]);
  }
  return q;
}

// ---------------------------------------------------------------------------
// Public: deterministic expansion (used when there is no Gemini key or Gemini fails)
// ---------------------------------------------------------------------------

export function expandOutlineToArticle(
  outline: any,
  promptTopic: string,
  primaryKeyword: string,
  category: string,
  _targetCountry: string,
  chosenAuthor: string
): GeneratedArticle {
  const rawTopic = (promptTopic || outline?.workingTitle || 'Your Topic').trim();
  const keyword = (primaryKeyword || outline?.targetPrimaryKeyword || rawTopic).trim();
  // When the "topic" is really the outline's long working title, use the short keyword inside body text.
  const topic = outline?.workingTitle && rawTopic === outline.workingTitle ? keyword : rawTopic;
  const { outline: o, sections } = normalizeOutline(outline, topic, keyword);

  const content = buildTemplateContent(sections, topic, keyword, 'en');
  const wordCount = countHtmlWords(content);
  const extras = templateExtras(sections, topic, o, 'en');

  const translations: Partial<Record<TargetLang, LocalizedFields>> = {};
  const title = o.workingTitle || `${topic}: ${BANKS.en.titleSuffix}`;
  for (const lang of TARGET_LANGS) {
    const c = buildTemplateContent(sections, topic, keyword, lang, { enforceMinWords: false });
    const ex = templateExtras(sections, topic, o, lang);
    translations[lang] = {
      title: `${topic === topic.toLowerCase() ? topic.replace(/\b\w/g, (c: string) => c.toUpperCase()) : topic}: ${BANKS[lang].titleSuffix}`,
      metaDescription: lang === 'ja' ? `${topic}の完全ガイド。仕組み、費用、リスク、実践的な導入手順を分かりやすく解説します。` :
        lang === 'es' ? `Guía completa sobre ${topic}: cómo funciona, cuánto cuesta, qué riesgos gestionar y un plan paso a paso.` :
        lang === 'de' ? `Der komplette Leitfaden zu ${topic}: Funktionsweise, Kosten, Risiken und ein Umsetzungsplan Schritt für Schritt.` :
        `Guide complet sur ${topic} : fonctionnement, coûts, risques à maîtriser et plan d’action étape par étape.`,
      readingTime: readingTimeFor(wordCount, lang),
      keyTakeaways: ex.takeaways,
      faqs: ex.faqs,
      content: c,
    };
  }

  return {
    title,
    slug: slugify(o.suggestedSlug || topic) || 'article',
    metaDescription: (o.metaDescription || `${topic}: a complete, practical guide with benchmarks, risks and a step-by-step plan.`).slice(0, 170),
    category,
    primaryKeyword: keyword,
    secondaryKeywords: Array.from(new Set(sections.flatMap((s) => s.keywords).filter((k) => k && k !== keyword))).slice(0, 6),
    readingTime: readingTimeFor(wordCount, 'en'),
    keyTakeaways: extras.takeaways,
    content,
    faqs: extras.faqs,
    seoScore: 90,
    estimatedCpc: '',
    author: chosenAuthor,
    wordCount,
    translations,
  };
}

// ---------------------------------------------------------------------------
// Gemini: outline-driven generation, one model call per chapter
// ---------------------------------------------------------------------------

const BANNED = '"Furthermore", "Moreover", "In conclusion", "Delve into", "Tapestry", "Testament to", "Beacon", "Pivotal role", "In today\'s fast-paced digital landscape", "It is worth noting", "At the end of the day", "Navigating the complexities of", "A double-edged sword"';

const WRITER_SYSTEM = `You are a senior editorial writer for Briefzy (briefzy.me). You write accurate, original, human-sounding American English with varied sentence length, concrete detail and honest caveats.
Rules: never invent statistics, studies, quotes, company names or case-study numbers; when you cite a figure, it must be a widely known, verifiable fact, otherwise describe the idea qualitatively. Do not use these phrases: ${BANNED}. Output clean semantic HTML only (no markdown, no code fences, no <html>/<body>/<h1>).`;

function cleanModelHtml(raw: string): string {
  return (raw || '')
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/<\/?(html|body|head)[^>]*>/gi, '')
    .replace(/<h1[\s\S]*?<\/h1>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();
}

async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function retry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; }
  }
  throw last;
}

export interface GenerateParams {
  topic: string;
  keyword: string;
  category: string;
  targetCountry: string;
  author: string;
  outline?: Outline | null;
  /** hard time budget for the whole generation (ms); remaining chapters fall back to the template writer */
  budgetMs?: number;
}

export async function generateArticleFromOutlineAI(call: ModelCaller, p: GenerateParams): Promise<GeneratedArticle> {
  const started = Date.now();
  const budget = p.budgetMs ?? 75000;
  const { outline, sections } = normalizeOutline(p.outline, p.topic, p.keyword);
  const T = p.outline?.workingTitle && p.topic === p.outline.workingTitle ? p.keyword : p.topic;
  const overview = sections.map((s, i) => `${i + 1}. ${stripSectionNumber(s.heading)}`).join('\n');
  const outOfTime = () => Date.now() - started > budget;

  const sectionPrompt = (s: NormalizedSection, idx: number, extra = '') => `Write chapter ${idx + 1} of ${sections.length} of a long-form article about "${T}" (primary keyword: "${p.keyword}") for readers in ${p.targetCountry}. Category: ${p.category}.

FULL OUTLINE (for continuity; write ONLY your chapter):
${overview}

YOUR CHAPTER
- H2 heading (use exactly this text, without a leading number): ${stripSectionNumber(s.heading)}
- Subtopics, in this order, each as its own <h3> with at least two substantial paragraphs: ${s.subtopics.map((x, i) => `(${i + 1}) ${x}`).join(' | ')}
- Work these keywords in naturally (never stuffed): ${Array.from(new Set([p.keyword, ...s.keywords])).join(', ')}
${s.citation ? `- Ground claims in this type of source (name it only if you are certain it exists): ${s.citation}\n` : ''}- LENGTH: at least ${s.targetWords} words of visible text for this chapter (aim for ${Math.round(s.targetWords * 1.1)}). Do not stop early.
${idx % 3 === 2 ? '- Include one HTML comparison table: <table class="w-full text-left border-collapse my-6"> with <thead>/<tbody>.\n' : ''}${idx % 3 === 0 ? '- Include one <ul> of practical points.\n' : ''}${idx % 3 === 1 ? '- Include one short <blockquote> reflection.\n' : ''}${extra}
Start with <h2> and output only the chapter HTML.`;

  const writeSection = async (s: NormalizedSection, idx: number): Promise<string> => {
    let html = cleanModelHtml(await retry(() => call({ system: WRITER_SYSTEM, prompt: sectionPrompt(s, idx), maxTokens: 4096, temperature: 0.8 })));
    for (let pass = 0; pass < 2 && countHtmlWords(html) < s.targetWords * 0.9 && !outOfTime(); pass++) {
      const more = cleanModelHtml(await retry(() => call({
        system: WRITER_SYSTEM,
        prompt: `${sectionPrompt(s, idx, `- The previous draft was only ${countHtmlWords(html)} words. Rewrite the WHOLE chapter, keeping its best material, with richer explanation, examples and trade-offs so it reaches ${Math.round(s.targetWords * 1.15)} words.\nPREVIOUS DRAFT:\n${html}\n`)}`,
        maxTokens: 6144,
        temperature: 0.8,
      })));
      if (countHtmlWords(more) > countHtmlWords(html)) html = more;
    }
    if (!/^\s*<h2/i.test(html)) html = `<h2>${escapeHtml(stripSectionNumber(s.heading))}</h2>\n${html}`;
    return html;
  };

  const writeIntro = async () => cleanModelHtml(await retry(() => call({
    system: WRITER_SYSTEM,
    prompt: `Write the introduction (no heading) of a long-form article about "${T}" (primary keyword "${p.keyword}"), about 230 words in 3 paragraphs, followed by one <blockquote> with a genuine editorial insight (not attributed to a real person). Preview what these chapters cover without listing them mechanically:\n${overview}\nMention the primary keyword in the first paragraph. Output HTML only.`,
    maxTokens: 1500,
    temperature: 0.8,
  })));

  const writeConclusion = async () => cleanModelHtml(await retry(() => call({
    system: WRITER_SYSTEM,
    prompt: `Write the closing chapter of an article about "${T}": start with <h2>${BANKS.en.conclHeading}</h2>, then about 250 words in 2-3 paragraphs plus a short <ul> of 3-4 concrete next steps. The article's chapters were:\n${overview}\nOutput HTML only.`,
    maxTokens: 1800,
    temperature: 0.8,
  })));

  const faqQuestions = (outline.faqSchemaCandidates && outline.faqSchemaCandidates.length ? outline.faqSchemaCandidates : buildDefaultOutline(T, p.keyword).faqSchemaCandidates!).slice(0, 5);
  const writeMeta = async () => {
    const raw = await retry(() => call({
      system: 'You are an SEO editor. Return strict JSON only.',
      json: true,
      maxTokens: 2500,
      temperature: 0.6,
      prompt: `For an article about "${T}" (primary keyword "${p.keyword}", category ${p.category}) with this outline:\n${overview}\n\nReturn JSON: {"title":"55-65 char high-CTR title containing the keyword","metaDescription":"145-160 chars with a call to action","slug":"lowercase-hyphenated","secondaryKeywords":["5 items"],"keyTakeaways":["4 specific, non-fabricated takeaways"],"faqs":[{"question":"<use exactly the given question>","answer":"3-4 sentence helpful answer, no invented statistics"}]}\nFAQ questions, in order: ${JSON.stringify(faqQuestions)}`,
    }));
    return parseJson(raw);
  };

  const tasks: (() => Promise<any>)[] = [
    () => writeIntro().catch(() => ''),
    ...sections.map((s, i) => async () => {
      if (outOfTime()) return null;
      try { return await writeSection(s, i); } catch { return null; }
    }),
    () => writeConclusion().catch(() => ''),
    () => writeMeta().catch(() => null),
  ];
  const results = await pool(tasks, 5);
  const intro: string = results[0] || '';
  const bodies: (string | null)[] = results.slice(1, 1 + sections.length);
  const conclusion: string = results[1 + sections.length] || '';
  const meta: any = results[2 + sections.length];

  // Any chapter that failed or ran out of time is written by the outline template, never skipped.
  const fallbackSection = (i: number) => {
    const html = buildTemplateContent([sections[i]], T, p.keyword, 'en', { enforceMinWords: false });
    return html.replace(/^[\s\S]*?(?=<h2>)/, '').replace(/<h2>Final Recommendations and Next Steps[\s\S]*$/, '');
  };
  const chapterHtml = bodies.map((b, i) => (b && countHtmlWords(b) >= 120 ? b : fallbackSection(i)));
  const fallbackIntro = BANKS.en.intro.map((x) => `<p>${fill(x, { T })}</p>`).join('\n');
  const fallbackConclusion = `<h2>${BANKS.en.conclHeading}</h2>` + BANKS.en.concl.map((x) => `<p>${fill(x, { T })}</p>`).join('');

  let content = [intro || fallbackIntro, ...chapterHtml, conclusion || fallbackConclusion].join('\n\n');

  // Final guarantee: if we are still short, expand the shortest chapters with outline-based material.
  let guard = 0;
  while (countHtmlWords(content) < MIN_WORDS + 200 && guard++ < 6) {
    const counts = chapterHtml.map((h) => countHtmlWords(h));
    const i = counts.indexOf(Math.min(...counts));
    const extra = fallbackSection(i).replace(/<h2>[\s\S]*?<\/h2>/, '');
    chapterHtml[i] = `${chapterHtml[i]}\n${extra}`;
    content = [intro || fallbackIntro, ...chapterHtml, conclusion || fallbackConclusion].join('\n\n');
  }

  const wordCount = countHtmlWords(content);
  const ex = templateExtras(sections, T, outline, 'en');
  const metaOk = meta && typeof meta === 'object';
  const faqs: ArticleFaq[] = metaOk && Array.isArray(meta.faqs) && meta.faqs.length
    ? meta.faqs.filter((f: any) => f?.question && f?.answer).map((f: any) => ({ question: String(f.question), answer: String(f.answer) }))
    : ex.faqs;

  return {
    title: (metaOk && meta.title) || outline.workingTitle || `${T}: ${BANKS.en.titleSuffix}`,
    slug: slugify((metaOk && meta.slug) || outline.suggestedSlug || T) || 'article',
    metaDescription: String((metaOk && meta.metaDescription) || outline.metaDescription || `${T}: a practical, in-depth guide.`).slice(0, 170),
    category: p.category,
    primaryKeyword: p.keyword,
    secondaryKeywords: metaOk && Array.isArray(meta.secondaryKeywords) && meta.secondaryKeywords.length ? meta.secondaryKeywords.map(String).slice(0, 8) : sections.flatMap((s) => s.keywords).filter((k) => k !== p.keyword).slice(0, 6),
    readingTime: readingTimeFor(wordCount, 'en'),
    keyTakeaways: metaOk && Array.isArray(meta.keyTakeaways) && meta.keyTakeaways.length ? meta.keyTakeaways.map(String).slice(0, 5) : ex.takeaways,
    content,
    faqs,
    seoScore: 95,
    estimatedCpc: '',
    author: p.author,
    wordCount,
  };
}

function parseJson(raw: string): any {
  const t = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(t); } catch { /* try to extract the outermost object */ }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ } }
  return null;
}

// ---------------------------------------------------------------------------
// Gemini: translation of a finished article (chapter by chapter)
// ---------------------------------------------------------------------------

const LANG_NAME: Record<TargetLang, string> = {
  es: 'Spanish (neutral international Spanish)',
  de: 'German',
  fr: 'French',
  ja: 'Japanese',
};

export function splitHtmlIntoChunks(html: string, maxChars = 7000): string[] {
  const pieces = (html || '').split(/(?=<h2[\s>])/i).filter((x) => x.trim());
  const chunks: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= maxChars) { chunks.push(piece); continue; }
    // very long chapter: split at <h3> boundaries
    let buf = '';
    for (const sub of piece.split(/(?=<h3[\s>])/i)) {
      if (buf && (buf + sub).length > maxChars) { chunks.push(buf); buf = ''; }
      buf += sub;
    }
    if (buf) chunks.push(buf);
  }
  return chunks;
}

export async function translateArticleWithAI(
  call: ModelCaller,
  src: { title: string; metaDescription: string; keyTakeaways: string[]; faqs: ArticleFaq[]; content: string },
  lang: TargetLang,
  budgetMs = 80000
): Promise<LocalizedFields> {
  const started = Date.now();
  const L = LANG_NAME[lang];
  const system = `You are a professional native-level translator and editor. Translate into ${L}. Keep the meaning, tone and structure; write naturally for native readers, not word-for-word. Never add or remove information. Keep brand names (Briefzy), product names, URLs, numbers and units as they are.`;
  const chunks = splitHtmlIntoChunks(src.content);

  const translateChunk = async (html: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (Date.now() - started > budgetMs && attempt > 0) break;
      const out = cleanModelHtml(await call({
        system,
        prompt: `Translate the visible text of this HTML into ${L}. Preserve every HTML tag, attribute, class name and the exact element order. Translate headings, paragraphs, list items, table cells and blockquotes. Return ONLY the translated HTML.\n\n${html}`,
        maxTokens: 8192,
        temperature: 0.2,
      }));
      const tagCount = (s: string) => (s.match(/<(h2|h3|p|li|tr|table|blockquote)[\s>]/gi) || []).length;
      // accept if structure survived and the text is not suspiciously short
      if (out && tagCount(out) >= tagCount(html) * 0.9 && htmlToText(out).trim().length >= htmlToText(html).trim().length * (lang === 'ja' ? 0.25 : 0.6)) return out;
    }
    throw new Error('translation chunk failed validation');
  };

  const metaPromise = call({
    system: `${system} Return strict JSON only.`,
    json: true,
    maxTokens: 6000,
    temperature: 0.2,
    prompt: `Translate these fields into ${L}. Keep the same JSON shape and array lengths.\n${JSON.stringify({
      title: src.title,
      metaDescription: src.metaDescription,
      keyTakeaways: src.keyTakeaways,
      faqs: src.faqs,
    })}`,
  }).then(parseJson);

  const [meta, translated] = await Promise.all([
    metaPromise,
    pool(chunks.map((c) => () => translateChunk(c)), 5),
  ]);

  if (!meta || typeof meta.title !== 'string') throw new Error('translation metadata failed');
  const content = translated.join('\n\n');
  return {
    title: meta.title,
    metaDescription: String(meta.metaDescription || '').slice(0, 200),
    readingTime: readingTimeFor(countHtmlWords(src.content), lang),
    keyTakeaways: Array.isArray(meta.keyTakeaways) && meta.keyTakeaways.length ? meta.keyTakeaways.map(String) : src.keyTakeaways,
    faqs: Array.isArray(meta.faqs) && meta.faqs.length ? meta.faqs.map((f: any) => ({ question: String(f.question), answer: String(f.answer) })) : src.faqs,
    content,
  };
}
