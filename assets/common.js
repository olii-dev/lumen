window.L = (() => {
  const fmtBytes = (n) => {
    if (n == null) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  };
  const pct = (before, after) => {
    if (!before) return '';
    const p = Math.round((1 - after / before) * 100);
    return { text: (p >= 0 ? '-' + p + '%' : '+' + Math.abs(p) + '%'), good: p >= 0 };
  };
  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    if (btn) { const t = btn.textContent; btn.textContent = 'copied'; setTimeout(() => (btn.textContent = t), 900); }
  };
  // header: <body data-tool="heic convert" data-note="...">
  const mountHeader = () => {
    const tool = document.body.dataset.tool;
    const note = document.body.dataset.note || 'no uploads - everything runs in your browser';
    const h = document.createElement('header');
    h.className = 'site';
    h.innerHTML = '<a class="wordmark" href="/">lumen</a>' +
      (tool ? '<span class="crumb">/ <b>' + tool + '</b></span>' : '') +
      '<span class="note">' + note + '</span>';
    document.body.prepend(h);
    const f = document.createElement('footer');
    f.className = 'site';
    f.textContent = 'lumen - quick tools. files never leave this tab.';
    document.body.appendChild(f);
  };
  // shared dropzone wiring: cb(FileList)
  const dropzone = (el, input, cb) => {
    el.addEventListener('click', () => input.click());
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
    input.addEventListener('change', () => { cb([...input.files]); input.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); el.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); el.classList.remove('dragover'); }));
    el.addEventListener('drop', (e) => cb([...e.dataTransfer.files]));
  };
  document.addEventListener('DOMContentLoaded', mountHeader);
  return { fmtBytes, pct, download, copy, dropzone };
})();
