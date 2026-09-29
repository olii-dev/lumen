(() => {
  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const controls = document.getElementById('controls');
  const formatSel = document.getElementById('format');
  const quality = document.getElementById('quality');
  const qualityVal = document.getElementById('qualityVal');
  const list = document.getElementById('list');
  const summary = document.getElementById('summary');
  const downloadAll = document.getElementById('downloadAll');
  const clearAll = document.getElementById('clearAll');

  const items = new Map(); // id -> item
  window.__lumen = items;
  let nextId = 1;

  const fmtBytes = (n) => {
    if (n == null) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  };
  const outExt = () => ({ jpeg: 'jpg', png: 'png', webp: 'webp' })[formatSel.value];
  const outMime = () => 'image/' + formatSel.value;

  function addFiles(files) {
    const arr = [...files];
    if (!arr.length) return;
    controls.hidden = false;
    for (const f of arr) {
      const dupe = [...items.values()].some((i) => i.file.name === f.name && i.file.size === f.size);
      if (dupe) continue;
      if (f.size === 0) continue; // stale 0-byte re-fire from some pickers
      const id = nextId++;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <img class="thumb" alt="" hidden>
        <div class="name"></div>
        <div class="sizes"></div>
        <div class="status working">queued</div>
        <button class="dl" disabled>save</button>`;
      list.appendChild(row);
      const item = {
        id, file: f, row,
        nameEl: row.querySelector('.name'),
        sizesEl: row.querySelector('.sizes'),
        statusEl: row.querySelector('.status'),
        dlBtn: row.querySelector('.dl'),
        thumbEl: row.querySelector('.thumb'),
        canvas: null, outBlob: null, outUrl: null, failed: false,
      };
      items.set(id, item);
      const base = f.name.replace(/\.(heic|heif)$/i, '');
      item.nameEl.innerHTML = '';
      item.nameEl.append(document.createTextNode(base));
      const ext = document.createElement('span');
      ext.className = 'ext';
      ext.textContent = '.heic \u2192 .' + outExt();
      item.extEl = ext;
      item.nameEl.appendChild(ext);
      item.baseName = base;
      item.dlBtn.addEventListener('click', () => downloadOne(item));
      queueDecode(item);
    }
    refreshSummary();
  }

  let decodeQueue = Promise.resolve();
  function queueDecode(item) {
    decodeQueue = decodeQueue.then(() => decode(item));
    return decodeQueue;
  }

  async function decode(item) {
    setStatus(item, 'decoding', 'working');
    try {
      console.log('[lumen] decode start', item.file.name, item.file.size);
      const t0 = performance.now();
      const blob = await Promise.race([
        heic2any({ blob: item.file, toType: 'image/png' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('decode timed out - try again')), 60000)),
      ]);
      console.log('[lumen] heic2any done in', Math.round(performance.now() - t0), 'ms');
      const bmp = await createImageBitmap(Array.isArray(blob) ? blob[0] : blob);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext('2d').drawImage(bmp, 0, 0);
      item.canvas = canvas;
      item.thumbEl.src = canvas.toDataURL('image/jpeg', 0.5);
      item.thumbEl.hidden = false;
      await encode(item);
    } catch (e) {
      console.error('[lumen] decode failed', e && e.message, e);
      item.failed = true;
      setStatus(item, 'failed: ' + ((e && e.message) || 'not a readable heic'), 'err');
      item.sizesEl.textContent = fmtBytes(item.file.size);
      refreshSummary();
    }
  }

  function encode(item) {
    if (!item.canvas) return Promise.resolve();
    setStatus(item, 'encoding', 'working');
    const q = formatSel.value === 'png' ? undefined : quality.value / 100;
    return new Promise((res) => {
      item.canvas.toBlob((blob) => {
        if (item.outUrl) URL.revokeObjectURL(item.outUrl);
        item.outBlob = blob;
        item.outUrl = URL.createObjectURL(blob);
        const before = item.file.size, after = blob ? blob.size : 0;
        const pct = before ? Math.round((1 - after / before) * 100) : 0;
        item.sizesEl.innerHTML = '';
        item.sizesEl.append(document.createTextNode(fmtBytes(before) + ' \u2192 ' + fmtBytes(after) + ' '));
        const s = document.createElement('span');
        s.className = 'saved';
        s.textContent = pct >= 0 ? '-' + pct + '%' : '+' + Math.abs(pct) + '%';
        item.sizesEl.appendChild(s);
        setStatus(item, 'ready', '');
        item.statusEl.style.color = 'var(--good)';
        item.dlBtn.disabled = false;
        item.extEl.textContent = '.heic \u2192 .' + outExt();
        refreshSummary();
        res();
      }, outMime(), q);
    });
  }

  function setStatus(item, text, cls) {
    item.statusEl.className = 'status' + (cls ? ' ' + cls : '');
    item.statusEl.style.color = '';
    item.statusEl.textContent = text;
  }

  function refreshSummary() {
    const done = [...items.values()].filter((i) => i.outBlob);
    const inB = done.reduce((a, i) => a + i.file.size, 0);
    const outB = done.reduce((a, i) => a + i.outBlob.size, 0);
    summary.textContent = done.length
      ? done.length + ' file' + (done.length > 1 ? 's' : '') + ' \u00b7 ' + fmtBytes(inB) + ' \u2192 ' + fmtBytes(outB)
      : '';
    downloadAll.disabled = done.length === 0;
  }

  function downloadOne(item) {
    if (!item.outBlob) return;
    const a = document.createElement('a');
    a.href = item.outUrl;
    a.download = item.baseName + '.' + outExt();
    a.click();
  }

  async function downloadZip() {
    const done = [...items.values()].filter((i) => i.outBlob);
    if (!done.length) return;
    downloadAll.disabled = true;
    downloadAll.textContent = 'zipping\u2026';
    const zip = new JSZip();
    for (const i of done) zip.file(i.baseName + '.' + outExt(), i.outBlob);
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lumen-' + new Date().toISOString().slice(0, 10) + '.zip';
    a.click();
    downloadAll.disabled = false;
    downloadAll.textContent = 'download all (.zip)';
  }

  // debounce re-encode on control changes
  let rt;
  function reencodeAll() {
    clearTimeout(rt);
    rt = setTimeout(() => {
      qualityVal.textContent = quality.value;
      items.forEach((i) => { if (i.canvas) encode(i); });
    }, 250);
  }

  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  formatSel.addEventListener('change', reencodeAll);
  quality.addEventListener('input', reencodeAll);
  downloadAll.addEventListener('click', downloadZip);
  clearAll.addEventListener('click', () => {
    items.forEach((i) => { if (i.outUrl) URL.revokeObjectURL(i.outUrl); });
    items.clear();
    list.innerHTML = '';
    controls.hidden = true;
  });
})();
