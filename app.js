(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const editor = $('editor');
  const preview = $('preview');
  const desk = $('desk');
  const pageBreaks = $('page-breaks');

  const STORE_KEY = 'md2pdf:v1';
  const PAPER = {                      // width × height in mm
    A4: [210, 297],
    Letter: [215.9, 279.4],
    Legal: [215.9, 355.6],
  };
  const MM_TO_PX = 96 / 25.4;
  let docName = 'document';

  const SAMPLE = `# Quarterly Field Report

Everything on this page is rendered **in your browser**. Nothing is uploaded:
the site's Content-Security-Policy blocks every network request.

## How to use

1. Paste Markdown on the left, or click **Open** / drop a \`.md\` file anywhere.
2. Pick paper size, margins and typeface. The preview is drawn to scale.
3. Click **Export PDF**, then choose *Save as PDF* in the print dialog.

## What it supports

- GitHub-flavoured Markdown: tables, task lists, ~~strikethrough~~
- [x] Syntax-highlighted code blocks
- [ ] Remote images (blocked on purpose, for privacy)

| Region | Visits | Change |
|--------|-------:|-------:|
| North  |  1,284 |  +8.2% |
| South  |    962 |  −1.4% |
| West   |  1,517 | +12.6% |

\`\`\`js
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> Turn on **New page per H1** to start each chapter on a fresh sheet.
`;

  // ---------- radio-group helpers ----------
  const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const setRadio = (name, value) => {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  };

  // ---------- settings / persistence (localStorage only, never leaves the device) ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        text: editor.value, docName,
        pageSize: getRadio('page-size'), margin: getRadio('margin'),
        font: getRadio('font'), pageBreaks: pageBreaks.checked,
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
    updateStats();
  }

  function updateStats() {
    const text = editor.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const mins = Math.max(1, Math.round(words / 230));
    $('stats').textContent = `${words.toLocaleString()} words · ${mins} min read`;
    $('doc-name').textContent = `${docName}.md`;
  }

  // @page can't be set inline under our CSP, so use a constructed stylesheet.
  const pageSheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];

  function applyLayout() {
    const size = getRadio('page-size');
    const margin = getRadio('margin');
    const [w, h] = PAPER[size];
    pageSheet.replaceSync(`@page { size: ${size}; margin: ${margin}mm; }`);

    // Draw the preview sheet at true paper size, then scale it to fit the pane.
    preview.style.width = `${w}mm`;
    preview.style.minHeight = `${h}mm`;
    preview.style.padding = `${margin}mm`;
    preview.classList.toggle('serif', getRadio('font') === 'serif');
    preview.classList.toggle('h1-breaks', pageBreaks.checked);
    $('paper-meta').textContent = `${size} · ${w} × ${h} mm · ${margin} mm margins`;
    fitPaper();
  }

  function fitPaper() {
    const [w] = PAPER[getRadio('page-size')];
    const styles = getComputedStyle(desk);
    const avail = desk.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    preview.style.zoom = String(Math.min(1, avail / (w * MM_TO_PX)));
  }
  new ResizeObserver(fitPaper).observe(desk);

  let timer;
  editor.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { render(); save(); }, 120);
  });
  document.querySelector('.controls').addEventListener('change', () => { applyLayout(); save(); });

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
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) $('kbd').textContent = 'Ctrl P';

  // ---------- theme: system → light → dark ----------
  const THEME_KEY = 'md2pdf:theme';
  const themeBtn = $('theme');
  function setTheme(mode) {
    if (mode === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    themeBtn.dataset.mode = mode;
    const label = `Theme: ${mode}`;
    themeBtn.title = label;
    themeBtn.setAttribute('aria-label', label);
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* fine */ }
  }
  themeBtn.addEventListener('click', () => {
    const order = ['system', 'light', 'dark'];
    setTheme(order[(order.indexOf(themeBtn.dataset.mode) + 1) % order.length]);
  });
  setTheme(document.documentElement.dataset.theme || 'system');

  // ---------- init ----------
  const saved = load();
  editor.value = saved.text ?? SAMPLE;
  docName = saved.docName || 'document';
  if (saved.pageSize) setRadio('page-size', saved.pageSize);
  if (saved.margin) setRadio('margin', parseInt(saved.margin, 10));   // older saves stored "18mm"
  if (saved.font) setRadio('font', saved.font);
  pageBreaks.checked = !!saved.pageBreaks;
  applyLayout();
  render();
})();
