# Briefzy AdSense / Low-Value-Content Fix — Notes

Date: 2026-11-23. No AdSense approval is guaranteed by these changes; they remove
the known low-value-content failure modes (silent template fallback, forced
enterprise framing, fabricated stats, no publish gate) so a human-reviewed
application has a fair chance.

## What changed

### `src/utils/articleEnhancer.ts` (new detectors)
- `detectUnsourcedStats(html)` — counts `%` / `Nx` / `$…` claims in prose
  paragraphs with no external link nearby. Tables, figures, and the Sources
  section are ignored (attributed data lives there).
- `detectEnterpriseMismatch(title, topic)` — true when the title uses
  "Enterprise Blueprint" / "Strategic Playbook" / "Tier-1" / "capital
  efficiency" framing for a small-team / beginner / how-to topic.
- `detectKeywordStuffing(html, primaryKeyword)` — `{ count, density,
  headingEchoCount, headingCount }` for the primary keyword phrase.

### `src/utils/articleGeneratorEngine.ts`
- `MIN_WORDS` 2600 → 1200, `TARGET_WORDS` 3100 → 2600. `normalizeOutline`
  body budget is now `TARGET_WORDS - 400` and pads outlines to 5 sections,
  not 6.
- `ArticleKind` (`how-to` | `explainer` | `comparison` | `checklist` |
  `analysis`) + `detectArticleKind(topic, keyword, category)`. `analysis`
  is returned ONLY when the topic explicitly contains enterprise / strategy /
  blueprint language and is not small-team / beginner / personal. Default is
  `how-to`, never `analysis`.
- `buildDefaultOutline(topic, keyword, kind?)` is now kind-aware: how-to gets
  6 sections (goal → before you start → step-by-step → mistakes →
  verify → next steps), explainer 5, comparison 6 (with side-by-side),
  checklist 5, analysis 7. Titles match the kind (how-to starts with
  "How to …" for action topics); the old forced suffix "Practical Guide,
  Verified Benchmarks and Implementation Roadmap" and the fixed 8-chapter
  enterprise outline are gone.
- `QualityGateResult` + `runQualityGate({ title, content, keyTakeaways,
  primaryKeyword, topic?, fieldNotes? })`. Blockers (each −15 points):
  >2 unsourced stats, any repeated phrase pattern, any templated heading
  echo, boilerplate Key Takeaways, keyword density >3%, primary keyword in
  >50% of H2s, enterprise mismatch, benchmark claims with no external link
  and no Sources section. Warnings (each −5): <1200 words, no experience
  signal and field notes <80 chars, no external sources at all.
  `passed` is true only with zero blockers.
- `GeneratedArticle` gains optional `isTemplateFallback`, `templateFallback`,
  and `qualityGate` fields.
- `expandOutlineToArticle()` (deterministic template fallback) now returns
  `seoScore: 45` (was 93), sets `isTemplateFallback` / `templateFallback`,
  and attaches its `qualityGate` result. It is a draft starting point, not a
  publish-ready article.
- `generateArticleFromOutlineAI()`: runs the quality gate and attaches it;
  `seoScore` is 95 only when the gate passes, otherwise the gate score. If
  more than 1 chapter fell back to deterministic template prose, that is an
  added blocker. `WRITER_SYSTEM` gained rule 7: no enterprise / Tier-1
  framing unless the topic explicitly demands it. The chapter-4 benchmark
  tables are now only requested for `analysis` / `comparison` kinds.

### `server.ts` and `functions/_lib/api.ts` (kept in sync)
- `POST /api/seo/generate-article`: imports `runQualityGate`. If Gemini did
  not produce the article, the response uses `source:
  'template-fallback-draft-only'`, sets `article.draft = true`,
  `publishBlocked: true`, and top-level `warning: "Gemini unavailable —
  template draft only, DO NOT PUBLISH without human rewrite"`. Field notes
  under 80 chars set `needsFieldNotes: true`. The gate result is always
  attached as `qualityGate`; `article.draft = publishBlocked`.
- `POST /api/seo/ai-assistant` (`mode=outline`): the Gemini prompt no longer
  forces 8 sections / 3,400+ words / always-on Benchmarks + Field Testing.
  It asks for 5–7 sections for the detected kind, 1,800–2,800 words,
  Benchmarks only when the topic has public citable benchmarks, Field
  Testing only when applicable, and kind-matching titles. The offline
  fallback outline now uses kind-aware `buildDefaultOutline` and a word
  count computed from its sections (was a hardcoded 3400).
- `PUT /api/admin/content`: for every article with `draft !== true`, the
  quality gate runs before saving. A failing article returns `400
  { error: 'Quality gate blocked publish', blockers, article: { title, slug
  }, qualityGate }` and **nothing in the batch is saved**. Draft articles
  may still be saved (with warnings).
- `scripts/sync-api.mjs`: the generated-file header template now imports
  `runQualityGate`, so a future `npm run sync-api` will not drop the import
  from `functions/_lib/api.ts`. (`functions/_lib/api.ts` was mirrored by hand
  this time; the generated body was verified byte-identical to the
  `server.ts` slice.)

## How to test

1. `npm ci && npm run lint` (tsc `--noEmit`). NOTE: this was NOT run here —
   the repo had no `node_modules` and no install was performed. Run it
   before deploying.
2. `npm run sync-api` to confirm `functions/_lib/api.ts` regenerates
   identically.
3. Generate a how-to article (Gemini key set, admin token set):
   `POST /api/seo/generate-article` with
   `{"topic": "How to Set Up a Password Manager", "primaryKeyword": "how to set up a password manager", "fieldNotes": "<80+ chars of something you actually tested>"}`.
   Expect `source: "gemini-outline"`, `publishBlocked: false` (if the gate
   passes), and a 6-section how-to outline — no Benchmarks chapter, no
   "Enterprise Blueprint" title.
4. Generate with Gemini unavailable (unset `GEMINI_API_KEY`): expect
   `source: "template-fallback-draft-only"`, `draft: true`,
   `publishBlocked: true`, `article.seoScore: 45`, and the DO NOT PUBLISH
   warning.
5. Try to publish a template fallback: `PUT /api/admin/content` with that
   article and `draft: false`. Expect HTTP 400 `Quality gate blocked
   publish` with `blockers`, and no data saved. The same article with
   `draft: true` must save.
6. Generate an outline for "Project Management Software for a Small Remote
   Team": expect kind `how-to` (not `analysis`) and no enterprise framing.

## Worst live articles — rewrite or noindex before applying for AdSense

Highest priority first (all show the forced enterprise/blueprint pattern
and/or fabricated, unsourced statistics):

1. Project Management Software for a Small Remote Team — the known bad
   example: "41.6%", "38.4%", "3.4x" with no sources; small-team topic in
   Tier-1 enterprise framing. Rewrite as a how-to, or noindex.
2. Cloude Code Update Unit Economics & ROI — "Unit Economics & ROI" +
   "Enterprise Blueprint" framing; no verifiable data behind the figures.
3. Cybersecurity AI Unit Economics & ROI — same pattern as (2).
4. Best AI Token — "best" comparison with no real comparison data; rewrite
   as a genuine side-by-side comparison or noindex.
5. Agentic AI Trends 2026 — blueprint-style framing; check every statistic
   against a cited source or cut it.
6. VPN vs. Antivirus vs. Password Manager — comparison outline is fine, but
   verify the "Definitive In-Depth Case Study / Enterprise Blueprint"
   claims and figures; rewrite the framing for home users.
7. Fact-Check AI Writing — same blueprint framing; rewrite as a how-to
   (the 7-step process it already contains) with worked examples.

Do not apply for AdSense until at least 1–5 are rewritten (human-reviewed,
gate-passing) or set to `draft: true` / noindex. The PUT gate now enforces
this: bulk-saving the collection with any of these live will be rejected
until they pass or are drafted.

## Deployment

No deploy was performed. After `npm run lint` passes: `npm run build &&
npx wrangler deploy` (Cloudflare Pages + Worker, KV binding `BRIEFZY_KV`),
or push to GitHub and let the Pages integration deploy. Do not edit
`functions/_lib/api.ts` by hand in future — edit `server.ts` and run
`npm run sync-api`.
