(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const editor = $('editor');
  const preview = $('preview');
  const pageSize = $('page-size');
  const margin = $('margin');
  const font = $('font');
  const pageBreaks = $('page-breaks');

  const STORE_KEY = 'md2pdf:v1';
  let docName = 'document';

  const SAMPLE = `# Markdown → PDF

Everything happens **in your browser**. Nothing is uploaded — the page's
Content-Security-Policy blocks every network request.

## How to use

1. Paste Markdown on the left, or click **Open .md** / drag a file in.
2. Pick page size, margins and font.
3. Click **Download PDF**, then choose *Save as PDF* in the print dialog.

## Supports

- GitHub-flavoured Markdown: tables, task lists, ~~strikethrough~~
- [x] Syntax highlighting
- [ ] Remote images (blocked on purpose, for privacy)

| Feature | Status |
|---------|--------|
| Tables  | ✅     |
| Code    | ✅     |

\`\`\`js
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> Tip: tick "Break before H1" to start each chapter on a new page.
`;

  // ---------- settings / persistence (localStorage only, never leaves the device) ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        text: editor.value, docName,
        pageSize: pageSize.value, margin: margin.value,
        font: font.value, pageBreaks: pageBreaks.checked,
      }));
    } catch { /* storage unavailable: fine */ }
  }

  // ---------- rendering ----------
  marked.setOptions({ gfm: true, breaks: false });

  function render() {
    const html = DOMPurify.sanitize(marked.parse(editor.value), { USE_PROFILES: { html: true } });
    preview.innerHTML = html;
    preview.querySelectorAll('pre code').forEach((el) => {
      try { hljs.highlightElement(el); } catch { /* unknown language */ }
    });
    preview.querySelectorAll('a[href]').forEach((a) => { a.rel = 'noopener noreferrer'; });
  }

  // @page can't be set inline under our CSP, so use a constructed stylesheet.
  const pageSheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];
  function applyLayout() {
    pageSheet.replaceSync(`@page { size: ${pageSize.value}; margin: ${margin.value}; }`);
    preview.classList.toggle('serif', font.value === 'serif');
    preview.classList.toggle('h1-breaks', pageBreaks.checked);
  }

  let timer;
  editor.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { render(); save(); }, 120);
  });
  [pageSize, margin, font, pageBreaks].forEach((el) =>
    el.addEventListener('change', () => { applyLayout(); save(); }));

  // ---------- file open / drag & drop ----------
  function openFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = reader.result;
      docName = file.name.replace(/\.(md|markdown|txt)$/i, '') || 'document';
      render(); save();
    };
    reader.readAsText(file);
  }
  $('file').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });

  const drop = $('drop');
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; drop.hidden = false; });
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.hidden = true; } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault(); dragDepth = 0; drop.hidden = true;
    openFile(e.dataTransfer.files[0]);
  });

  // ---------- export ----------
  // The browser's own print engine produces a crisp, text-selectable PDF.
  // document.title becomes the default file name in "Save as PDF".
  function exportPdf() {
    const original = document.title;
    document.title = docName;
    window.addEventListener('afterprint', () => { document.title = original; }, { once: true });
    window.print();
  }
  $('export').addEventListener('click', exportPdf);
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); exportPdf(); }
  });

  // ---------- init ----------
  const saved = load();
  editor.value = saved.text ?? SAMPLE;
  docName = saved.docName || 'document';
  if (saved.pageSize) pageSize.value = saved.pageSize;
  if (saved.margin) margin.value = saved.margin;
  if (saved.font) font.value = saved.font;
  pageBreaks.checked = !!saved.pageBreaks;
  applyLayout();
  render();
})();
