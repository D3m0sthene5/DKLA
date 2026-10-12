/* Read-only adapters for native Atlas material used by the home surface. */
(() => {
  'use strict';
  const parse = id => {try{return JSON.parse(document.getElementById(id)?.textContent||'{}');}catch{return {};}};
  const iconData=parse('dklaIcons'),geography=parse('dklaGeographyData');
  const liveData = () => typeof data !== 'undefined' && Array.isArray(data?.nodes) ? data : null;
  const courseRecord = name => ({Contracts:{id:'contracts',name,color:'#daba83'},'Civil Procedure':{id:'civil',name,color:'#88badd'},'Legislation and the Regulatory State':{id:'lrs',name,color:'#9fc8ae'}})[name];
  const normalizeCourse=value=>['LRS','Legislation & Regulatory State'].includes(value)?'Legislation and the Regulatory State':value;
  // The original renderer is private to dklaUI. Reuse its exact recorded paths
  // and modifier construction without editing the immutable historical block.
  function nativeSymbol(node){const meta=iconData.records?.[node.id];if(!meta||!iconData.paths?.[meta.motif])return '';const mod=meta.modifier&&iconData.modifiers?.[meta.modifier];const badge=mod?`<g transform="translate(14.5 14.5) scale(.42)"><circle cx="12" cy="12" r="13" fill="var(--badge-bg,#1a242d)" stroke="none"/>${mod}</g>`:'';return `<svg class="dkla-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconData.paths[meta.motif]}${badge}</svg>`;}
  const course = (requestedName, chosenIds = []) => {
    const c = courseRecord(requestedName), graph = liveData();
    if (!c || !Array.isArray(graph?.nodes)) return null;
    const ids = Array.isArray(chosenIds) ? chosenIds : [];
    const nodes = new Map(graph.nodes.filter(n => n.kind === 'Case' &&
      geography.homes?.[n.id] && ((n.courses || []).some(value => normalizeCourse(value) === c.name) ||
       c.id === 'lrs' && n.courseTreatments?.LRS)).map(n => [n.id, n]));
    const cases = ids.filter((id, i) => typeof id === 'string' && ids.indexOf(id) === i && nodes.has(id)).map(id => {
      const node = nodes.get(id), svg = nativeSymbol(node);
      const label = iconData.records?.[node.id]?.label;
      const home=geography.homes[node.id],region=(geography.regions||[]).find(r=>r.id===home.region);
      const placement=geography.placements?.[node.id];
      return { id: node.id, title: node.shortTitle || node.title, fullTitle:node.title,
        displayTitle:node.id==='lrs-i-chevron'?'Chevron':node.id==='lrs-s-brig-aurora'?'Brig Aurora':node.id==='lrs-s-grimaud'?'Grimaud':node.id==='hawkins'?node.title:placement?.displayLabel||node.shortTitle||node.title,
        label: label || node.mnemonic?.rationale || '', svg,
        home:region?.anchor===c.name?{x:home.x+home.w/2,y:home.y+home.h/2,region:home.region,district:home.district}:null };
    });
    const regions=(geography.regions||[]).filter(r=>r.anchor===c.name);
    return {
      id: c.id, name: c.name, color: c.color,
      count: graph.nodes.filter(n=>(n.courses||[]).some(value=>normalizeCourse(value)===c.name)).length,
      caseCount: nodes.size,
      subjects: regions.map(r => ({ id: r.id, title: r.title, description: r.description || '', courseKey: r.courseKey || r.course || c.name,x:r.x,y:r.y,w:r.w,h:r.h })),
      districts:Object.values(geography.districts||{}).filter(r=>regions.some(p=>p.id===r.region)).map(r=>({id:r.id,region:r.region,x:r.x,y:r.y,w:r.w,h:r.h})),
      bounds:{x:Math.min(...regions.map(r=>r.x)),y:Math.min(...regions.map(r=>r.y)),w:Math.max(...regions.map(r=>r.x+r.w))-Math.min(...regions.map(r=>r.x)),h:Math.max(...regions.map(r=>r.y+r.h))-Math.min(...regions.map(r=>r.y))},
      cases,
    };
  };
  const authority = collectionId => {
    const item = window.DKLAAuthorities?.coverIdentity?.(collectionId);
    return item && typeof item.svg === 'string' ? item : null;
  };
  const peopleURI = () => {
    try {
      const asset = JSON.parse(document.getElementById('dklaWeThePeopleAsset')?.textContent || '{}');
      return typeof asset.uri === 'string' && asset.uri ? asset.uri : null;
    } catch { return null; }
  };
  const glossarySample = () => {
    try {
      const terms = JSON.parse(document.getElementById('dklaGlossary')?.textContent || '{}').terms;
      const term = Array.isArray(terms) && terms.find(t => t.slug === 'consideration');
      return term ? { term: term.term, definition: term.definition, source: term.source, url: term.url } : null;
    } catch { return null; }
  };
  window.DKLAOverviewAssets = { course, authority, peopleURI, glossarySample };
})();
