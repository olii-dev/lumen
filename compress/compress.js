(() => {
  const controls = document.getElementById('controls');
  const formatSel = document.getElementById('format');
  const quality = document.getElementById('quality');
  const qualityVal = document.getElementById('qualityVal');
  const list = document.getElementById('list');
  const summary = document.getElementById('summary');
  const downloadAll = document.getElementById('downloadAll');
  const clearAll = document.getElementById('clearAll');
  const items = new Map();
  let nextId = 1;

  const outSpec = (file) => {
    if (formatSel.value !== 'same') return { mime: 'image/' + formatSel.value, ext: formatSel.value === 'jpeg' ? 'jpg' : formatSel.value };
    const m = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpeg';
    return { mime: 'image/' + m, ext: m === 'jpeg' ? 'jpg' : m };
  };

  function addFiles(files) {
    if (!files.length) return;
    controls.hidden = false;
    for (const f of files) {
      if (!/^image\//.test(f.type)) continue;
      if (f.size === 0) continue;
      if ([...items.values()].some((i) => i.file.name === f.name && i.file.size === f.size)) continue;
      const id = nextId++;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<img class="thumb" alt="" hidden><div class="name"></div><div class="sizes"></div><div class="status working">queued</div><button class="dl" disabled>save</button>`;
      list.appendChild(row);
      const item = {
        id, file: f, row,
        nameEl: row.querySelector('.name'), sizesEl: row.querySelector('.sizes'),
        statusEl: row.querySelector('.status'), dlBtn: row.querySelector('.dl'), thumbEl: row.querySelector('.thumb'),
        canvas: null, outBlob: null, failed: false,
      };
      items.set(id, item);
      item.baseName = f.name.replace(/\.[a-z0-9]+$/i, '');
      item.nameEl.textContent = f.name;
      item.dlBtn.addEventListener('click', () => item.outBlob && L.download(item.outBlob, item.baseName + '.' + outSpec(f).ext));
      run(item);
    }
    refreshSummary();
  }

  async function run(item) {
    setStatus(item, 'reading', 'working');
    try {
      const bmp = await createImageBitmap(item.file);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext('2d');
      const spec = outSpec(item.file);
      if (spec.mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(bmp, 0, 0);
      item.canvas = canvas;
      item.thumbEl.src = canvas.toDataURL('image/jpeg', 0.4);
      item.thumbEl.hidden = false;
      await encode(item);
    } catch (e) {
      item.failed = true;
      setStatus(item, 'failed: unreadable image', 'err');
      refreshSummary();
    }
  }

  function encode(item) {
    if (!item.canvas) return Promise.resolve();
    setStatus(item, 'encoding', 'working');
    const spec = outSpec(item.file);
    const q = spec.mime === 'image/png' ? undefined : quality.value / 100;
    return new Promise((res) => {
      item.canvas.toBlob((blob) => {
        item.outBlob = blob;
        const p = L.pct(item.file.size, blob.size);
        item.sizesEl.innerHTML = '';
        item.sizesEl.append(document.createTextNode(L.fmtBytes(item.file.size) + ' \u2192 ' + L.fmtBytes(blob.size) + ' '));
        const s = document.createElement('span');
        s.className = p.good ? 'saved' : 'grew';
        s.textContent = p.text;
        item.sizesEl.appendChild(s);
        setStatus(item, 'ready', '');
        item.statusEl.style.color = 'var(--good)';
        item.dlBtn.disabled = false;
        item.nameEl.textContent = item.baseName + '.' + spec.ext;
        refreshSummary();
        res();
      }, spec.mime, q);
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
    summary.textContent = done.length ? done.length + ' file' + (done.length > 1 ? 's' : '') + ' \u00b7 ' + L.fmtBytes(inB) + ' \u2192 ' + L.fmtBytes(outB) : '';
    downloadAll.disabled = !done.length;
  }

  async function zipAll() {
    const done = [...items.values()].filter((i) => i.outBlob);
    if (!done.length) return;
    downloadAll.disabled = true; downloadAll.textContent = 'zipping\u2026';
    const zip = new JSZip();
    for (const i of done) zip.file(i.baseName + '.' + outSpec(i.file).ext, i.outBlob);
    L.download(await zip.generateAsync({ type: 'blob' }), 'lumen-compress.zip');
    downloadAll.disabled = false; downloadAll.textContent = 'download all (.zip)';
  }

  let rt;
  function reencode() {
    clearTimeout(rt);
    rt = setTimeout(() => { qualityVal.textContent = quality.value; items.forEach((i) => i.canvas && encode(i)); }, 250);
  }

  L.dropzone(document.getElementById('dropzone'), document.getElementById('fileInput'), addFiles);
  formatSel.addEventListener('change', reencode);
  quality.addEventListener('input', reencode);
  downloadAll.addEventListener('click', zipAll);
  clearAll.addEventListener('click', () => { items.clear(); list.innerHTML = ''; controls.hidden = true; });
})();
