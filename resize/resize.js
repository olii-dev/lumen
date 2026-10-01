(() => {
  const controls = document.getElementById('controls');
  const mode = document.getElementById('mode');
  const widthIn = document.getElementById('width');
  const percentIn = document.getElementById('percent');
  const pctCtl = document.getElementById('pctCtl');
  const formatSel = document.getElementById('format');
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
  const targetW = (bmp) => {
    if (mode.value === 'percent') return Math.max(1, Math.round(bmp.width * (Math.min(400,Math.max(1,+percentIn.value||100)) / 100)));
    return Math.min(Math.max(1, +widthIn.value || bmp.width), 12000);
  };

  function addFiles(files) {
    if (!files.length) return;
    controls.hidden = false;
    for (const f of files) {
      if (!/^image\//.test(f.type) || f.size === 0) continue;
      if ([...items.values()].some((i) => i.file.name === f.name && i.file.size === f.size)) continue;
      const id = nextId++;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<img class="thumb" alt="" hidden><div class="name"></div><div class="sizes"></div><div class="status working">queued</div><button class="crop-btn" disabled>crop</button><button class="dl" disabled>save</button>`;
      list.appendChild(row);
      const item = {
        id, file: f, row,
        nameEl: row.querySelector('.name'), sizesEl: row.querySelector('.sizes'),
        statusEl: row.querySelector('.status'), dlBtn: row.querySelector('.dl'), thumbEl: row.querySelector('.thumb'),
        bmp: null, outBlob: null, crop: null, version: 0, removed: false, cropBtn: row.querySelector('.crop-btn'),
      };
      items.set(id, item);
      item.baseName = f.name.replace(/\.[a-z0-9]+$/i, '');
      item.nameEl.textContent = f.name;
      item.dlBtn.addEventListener('click', () => item.outBlob && L.download(item.outBlob, item.baseName + (item.crop?'-crop':'') + '.' + (item.outSpec||outSpec(f)).ext));
      item.cropBtn.onclick = () => CropEditor.open(item.bmp,item.crop,item.file.name,rect=>{item.crop=rect;render(item);});
      load(item);
    }
    refreshSummary();
  }

  async function load(item) {
    setStatus(item, 'reading', 'working');
    try {
      item.bmp = await createImageBitmap(item.file);
      if(item.removed){item.bmp.close();return;}
      if(item.bmp.width*item.bmp.height>24000000)throw Error('over 24 MP limit');
      item.cropBtn.disabled=false;
      item.thumbEl.src = item.bmp.width > 0 ? await thumbOf(item.bmp) : '';
      item.thumbEl.hidden = false;
      await render(item);
    } catch (e) {
      setStatus(item, 'failed: '+(e.message==='over 24 MP limit'?e.message:'unreadable image'), 'err');item.bmp?.close();item.bmp=null;
      refreshSummary();
    }
  }

  function thumbOf(bmp) {
    const c = document.createElement('canvas');
    const s = 88 / Math.max(bmp.width, bmp.height);
    c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return Promise.resolve(c.toDataURL('image/jpeg', 0.5));
  }

  function render(item) {
    if (!item.bmp) return Promise.resolve();
    const version=++item.version;item.outBlob=null;item.dlBtn.disabled=true;refreshSummary();
    setStatus(item, 'resizing', 'working');
    const crop=item.crop||{x:0,y:0,w:item.bmp.width,h:item.bmp.height};
    const w = targetW({width:crop.w});
    const h = Math.max(1, Math.round(crop.h * (w / crop.w)));
    if(w*h>24000000||Math.max(w,h)>12000){setStatus(item,'output too large / max 24 MP, 12,000 px','err');return Promise.resolve();}
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const spec = outSpec(item.file);
    if (spec.mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(item.bmp, crop.x,crop.y,crop.w,crop.h, 0,0,w,h);
    return new Promise((res) => {
      c.toBlob((blob) => {
        if(version!==item.version||item.removed){res();return;}
        if(!blob){setStatus(item,'failed: could not encode image','err');res();return;}
        item.outBlob = blob;item.outSpec=spec;
        item.sizesEl.textContent = crop.w + 'x' + crop.h + (item.crop?' crop':'') + ' \u2192 ' + w + 'x' + h + ' \u00b7 ' + L.fmtBytes(item.file.size) + ' \u2192 ' + L.fmtBytes(blob.size);
        setStatus(item, 'ready', '');
        item.statusEl.style.color = 'var(--good)';
        item.dlBtn.disabled = false;
        item.nameEl.textContent = item.baseName + '.' + spec.ext;
        refreshSummary();
        res();
      }, spec.mime, spec.mime === 'image/png' ? undefined : 0.92);
    });
  }

  function setStatus(item, text, cls) {
    item.statusEl.className = 'status' + (cls ? ' ' + cls : '');
    item.statusEl.style.color = '';
    item.statusEl.textContent = text;
  }

  function refreshSummary() {
    const done = [...items.values()].filter((i) => i.outBlob);
    summary.textContent = done.length ? done.length + ' file' + (done.length > 1 ? 's' : '') + ' ready' : '';
    downloadAll.disabled = !done.length;
  }

  async function zipAll() {
    const done = [...items.values()].filter((i) => i.outBlob);
    if (!done.length) return;
    downloadAll.disabled = true; downloadAll.textContent = 'zipping\u2026';
    const zip = new JSZip();
    for (const i of done) zip.file(i.id+'-'+i.baseName+(i.crop?'-crop':'')+'.'+i.outSpec.ext, i.outBlob);
    L.download(await zip.generateAsync({ type: 'blob' }), 'lumen-resize.zip');
    downloadAll.disabled = false; downloadAll.textContent = 'download all (.zip)';
  }

  let rt;
  const rerender = () => {items.forEach(i=>{i.version++;i.outBlob=null;i.dlBtn.disabled=true;});refreshSummary();clearTimeout(rt); rt = setTimeout(() => items.forEach((i) => i.bmp && render(i)), 250); };

  L.dropzone(document.getElementById('dropzone'), document.getElementById('fileInput'), addFiles);
  mode.addEventListener('change', () => { pctCtl.hidden = mode.value !== 'percent'; rerender(); });
  widthIn.addEventListener('input', rerender);
  percentIn.addEventListener('input', rerender);
  formatSel.addEventListener('change', rerender);
  downloadAll.addEventListener('click', zipAll);
  clearAll.addEventListener('click', () => { clearTimeout(rt);CropEditor.close();items.forEach(i=>{i.removed=true;i.version++;i.bmp?.close();});items.clear(); list.innerHTML = ''; controls.hidden = true; });
})();
