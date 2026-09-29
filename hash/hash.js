(() => {
  const $ = (id) => document.getElementById(id);
  const digest = $('digest'), expected = $('expected'), status = $('comparison');
  let run = 0;
  function compare() {
    const v = expected.value.trim().toLowerCase();
    if (!v) { status.textContent = ''; status.className = 'msg'; return; }
    if (!/^[0-9a-f]{64}$/.test(v)) { status.textContent = 'expected checksum must be 64 hex characters'; status.className = 'msg err'; return; }
    if (!digest.value) { status.textContent = 'hash something first'; status.className = 'msg'; return; }
    const match = v === digest.value;
    status.textContent = match ? 'match - checksums are identical' : 'no match - checksums differ';
    status.className = 'msg ' + (match ? 'ok' : 'err');
  }
  async function hash(buffer, label, ticket) {
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
    if (ticket !== run) return;
    digest.value = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    $('source').textContent = label;
    $('copy').disabled = false;
    compare();
  }
  $('hashText').addEventListener('click', async () => {
    const ticket = ++run;
    const text = $('textInput').value;
    $('source').textContent = 'hashing text...'; digest.value = ''; $('copy').disabled = true;
    try { await hash(new TextEncoder().encode(text), 'text - ' + new TextEncoder().encode(text).length.toLocaleString() + ' bytes', ticket); }
    catch (e) { if (ticket === run) $('source').textContent = 'could not hash text: ' + e.message; }
  });
  L.dropzone($('dropzone'), $('fileInput'), async (files) => {
    const file = files[0]; if (!file) return;
    const ticket = ++run;
    $('source').textContent = 'hashing ' + file.name + '...'; digest.value = ''; $('copy').disabled = true;
    try { await hash(await file.arrayBuffer(), file.name + ' - ' + L.fmtBytes(file.size), ticket); }
    catch (e) { if (ticket === run) $('source').textContent = 'could not hash file: ' + e.message; }
  });
  expected.addEventListener('input', compare);
  $('copy').addEventListener('click', e => { if (digest.value) L.copy(digest.value, e.target); });
  $('clear').addEventListener('click', () => { ++run; digest.value = ''; expected.value = ''; $('textInput').value = ''; $('copy').disabled = true; $('source').textContent = 'no input yet'; compare(); });
})();
