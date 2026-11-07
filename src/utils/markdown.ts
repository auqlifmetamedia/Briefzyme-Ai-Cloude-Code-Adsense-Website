import { marked } from 'marked';

const HTML_HINT = /<\/?(p|h[1-6]|ul|ol|li|div|table|blockquote|section|article)\b/i;

// Isi artikel di situs ditampilkan sebagai HTML. Jika yang ditempel adalah Markdown
// (mis. hasil copy dari Claude), otomatis diubah ke HTML. Judul "# ..." diturunkan jadi H2
// karena judul artikel sudah dipakai sebagai H1 halaman.
export function toArticleHtml(input: string): string {
  const text = input.trim();
  if (!text) return '';
  const html = HTML_HINT.test(text) ? text : (marked.parse(text, { async: false, gfm: true, breaks: false }) as string);
  return html.replace(/<h1(\s|>)/gi, '<h2$1').replace(/<\/h1>/gi, '</h2>').trim();
}
