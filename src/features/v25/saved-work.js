/* Bridge the curated layout marker into the original, unchanged cache reader.
   IndexedDB results are structured clones: this changes one in-memory marker,
   never a stored record. The original graph/build/revision/timestamp gates and
   normal save path remain in charge; geography reapplies its locked layout. */
(() => {
  'use strict';
  if (window.DKLASavedWork) return;
  const state = (window.DKLASavedWork = { bridged: false, status: 'unavailable' });
  const prototype = typeof IDBObjectStore === 'undefined' ? null : IDBObjectStore.prototype;
  if (!prototype || typeof prototype.get !== 'function') return;
  let graphId, contentBuild, seedLayout;
  try {
    const seed = JSON.parse(document.getElementById('seedData').textContent);
    graphId = seed.graphId;
    contentBuild = seed.dklaRelease?.contentBuild;
    seedLayout = seed.studyMap?.layoutId;
  } catch {
    return;
  }
  if (!graphId || !contentBuild || !seedLayout) return;
  const key = 'legal-atlas-v1:' + graphId + ':dkla-r8-rebuilt';
  const curatedLayout = 'v25-curated-locked';
  const originalGet = prototype.get;
  state.status = 'waiting';
  function get(...args) {
    const request = originalGet.apply(this, args);
    if (this.name !== 'graphs' || this.transaction?.db?.name !== 'LegalAtlasPortable' || args[0] !== key)
      return request;
    // One boot read only. Leave subsequent caller reads and all writes alone.
    if (prototype.get === get) prototype.get = originalGet;
    request.addEventListener(
      'success',
      () => {
        state.status = 'checked';
        const cached = request.result;
        if (
          !cached ||
          cached.format !== 'legal-atlas' ||
          cached.schemaVersion !== 1 ||
          cached.graphId !== graphId ||
          cached.dklaRelease?.contentBuild !== contentBuild ||
          cached.studyMap?.layoutId !== curatedLayout ||
          !Array.isArray(cached.nodes) ||
          !Array.isArray(cached.edges)
        )
          return;
        cached.studyMap.layoutId = seedLayout;
        state.bridged = true;
      },
      { once: true },
    );
    return request;
  }
  prototype.get = get;
})();
