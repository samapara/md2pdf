# MD → PDF

A tiny, fully client-side Markdown to PDF converter. Static files only — host it on GitHub Pages.

**Private by design**
- No server, no build step, no analytics.
- All libraries ([marked](https://github.com/markedjs/marked), [DOMPurify](https://github.com/cure53/DOMPurify), [highlight.js](https://highlightjs.org)) are vendored in `vendor/` — no CDN calls.
- A strict `Content-Security-Policy` (`connect-src 'none'`, `img-src 'self' data: blob:`) blocks the page from making any network request, including remote images inside your Markdown.
- Your text is autosaved to your browser's `localStorage` only.

## Use
1. Paste Markdown, click **Open .md**, or drag a file in.
2. Choose page size / margins / font (optional "Break before H1").
3. **Download PDF** (or ⌘/Ctrl+P) → *Save as PDF*.

The PDF is produced by the browser's print engine, so text stays selectable and searchable.
Tip: in Chrome's print dialog, untick "Headers and footers" for a clean page.

## Host on GitHub Pages
`.github/workflows/pages.yml` deploys the site on every push to `main`
(repo **Settings → Pages → Source: GitHub Actions**).

## Run locally
Open `index.html` directly, or `python3 -m http.server` in this folder.
