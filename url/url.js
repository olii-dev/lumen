(() => {
  const $ = id => document.getElementById(id);
  const say = (text, bad = false) => { $('message').textContent = text; $('message').className = 'msg ' + (bad ? 'err' : 'ok'); };
  function resetDetails() { $('details').hidden = true; $('parts').replaceChildren(); $('params').replaceChildren(); }
  function item(container, key, value) {
    const row = document.createElement('div'); row.className = 'url-part';
    const k = document.createElement('span'); k.className = 'hint'; k.textContent = key;
    const v = document.createElement('span'); v.textContent = value;
    row.append(k, v); container.append(row);
  }
  $('encode').addEventListener('click', () => { resetDetails(); $('output').value = encodeURIComponent($('input').value); say('encoded as a URL component'); });
  $('decode').addEventListener('click', () => {
    resetDetails();
    try { $('output').value = decodeURIComponent($('input').value.replace(/\+/g, ' ')); say('decoded'); }
    catch (e) { $('output').value = ''; say('invalid percent encoding', true); }
  });
  $('inspect').addEventListener('click', () => {
    resetDetails(); $('output').value = '';
    try {
      const raw = $('input').value.trim();
      if (!/^https?:\/\//i.test(raw)) throw Error('enter a full http(s) URL, starting with https://');
      const u = new URL(raw);
      if (!['http:', 'https:'].includes(u.protocol)) throw Error('enter an http(s) URL');
      $('output').value = u.href;
      item($('parts'), 'origin', u.origin); item($('parts'), 'path', u.pathname);
      if (u.hash) item($('parts'), 'fragment', u.hash.slice(1));
      for (const [key, value] of u.searchParams) item($('params'), key, value);
      if (!u.searchParams.size) item($('params'), 'none', '');
      $('details').hidden = false; say('URL parsed');
    } catch (e) { say(e.message.startsWith('enter') ? e.message : 'invalid URL', true); }
  });
  $('copy').addEventListener('click', e => { if ($('output').value) L.copy($('output').value, e.target); });
  $('clear').addEventListener('click', () => { $('input').value = ''; $('output').value = ''; say(''); resetDetails(); });
})();
