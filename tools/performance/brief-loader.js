/* Full briefs load on demand in the hosted shell; portable copies retain the exact aggregate. */
(() => {
  'use strict';
  const block = document.getElementById('dklaR19Full');
  const marker = document.getElementById('dklaBriefManifest');
  const manifest = marker ? JSON.parse(marker.textContent) : null;
  const hosted = !!manifest && block.textContent === '{}';
  let embedded = null, hydration = null;
  const pending = new Map(), values = new Map();
  const cacheName = 'dkla-briefs-v1';
  async function verified(response, hash) {
    if (!response?.ok) throw Error('Brief unavailable');
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if (digest !== hash) throw Error('Brief verification failed');
    return new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  }
  async function read(hash) {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw Error('Invalid brief identity');
    const url = new URL('assets/briefs/' + hash + '.json', document.baseURI).href;
    let cache;
    try { cache = await caches.open(cacheName); const hit = await cache.match(url); if (hit) { try { return await verified(hit, hash); } catch { await cache.delete(url); } } } catch { /* Storage denial still permits online reading. */ }
    const response = await fetch(url, {credentials:'same-origin'});
    const raw = await verified(response.clone(), hash);
    try { await cache?.put(url, response); } catch { /* Quota denial must not hide readable text. */ }
    return raw;
  }
  function text(id) {
    if (!hosted || embedded) { embedded ||= JSON.parse(block.textContent); return Promise.resolve(embedded[id] || ''); }
    if (values.has(id)) return Promise.resolve(values.get(id));
    if (!manifest.records[id]) return Promise.resolve('');
    if (!pending.has(id)) pending.set(id, read(manifest.records[id]).then(raw => {
      const value = JSON.parse(raw); if (typeof value !== 'string') throw Error('Invalid brief text');
      values.set(id, value); return value;
    }).finally(()=>pending.delete(id)));
    return pending.get(id);
  }
  async function hydrate() {
    if (!hosted || embedded) return;
    if (!hydration) hydration = read(manifest.aggregate).then(raw => {
      const all = JSON.parse(raw);
      if (Object.keys(all).length !== Object.keys(manifest.records).length) throw Error('Incomplete portable briefs');
      block.textContent = raw; embedded = all;
    }).finally(()=>{hydration=null;});
    return hydration;
  }
  async function fill(target, id, render) {
    if (!target || target.dataset.briefLoading || target.dataset.done) return;
    target.dataset.briefLoading = '1';
    target.innerHTML = '<p role="status">Loading full brief…</p>';
    try {
      const value = await text(id);
      if (!target.isConnected) return;
      target.innerHTML = render(value) || '<p>The full text is not in this copy.</p>';
      target.dataset.done = '1';
    } catch {
      if (!target.isConnected) return;
      target.innerHTML = '<p role="status">This brief is not available offline yet, or could not be loaded.</p><button type="button">Retry full brief</button>';
      target.querySelector('button').onclick = () => fill(target,id,render);
    } finally { delete target.dataset.briefLoading; }
  }
  window.DKLABriefLoader = {text, hydrate, fill};
  {
    const priorExport = exportHTML, priorBlob = window.DKLA.portableBlob;
    function serialize(action, receiver, args) {
      // Geography removes this legacy control after boot. The original early
      // script still wires it before geography runs when a saved HTML reopens.
      let control;
      const app = document.getElementById('appCode');
      if (app && !document.getElementById('layoutBtn')) {
        control = document.createElement('button'); control.id = 'layoutBtn'; control.hidden = true; app.before(control);
      }
      try { return action.apply(receiver,args); } finally { control?.remove(); }
    }
    exportHTML = async function(...args) {
      try { if (hosted && !embedded) toast('Preparing complete portable atlas…'); await hydrate(); return serialize(priorExport,this,args); }
      catch (error) { toast('Export failed: full briefs could not be loaded. Reconnect and retry, or export master JSON to preserve your edits.'); }
    };
    window.DKLA.portableBlob = async function(...args) { await hydrate(); return serialize(priorBlob,this,args); };
  }
})();
