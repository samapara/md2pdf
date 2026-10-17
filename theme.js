// Loaded in <head> so the saved theme applies before first paint (no flash).
(() => {
  try {
    const t = localStorage.getItem('md2pdf:theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch { /* storage unavailable: follow the system */ }
})();
