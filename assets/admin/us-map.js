/* Aggregate locations are fetched only through the authenticated, no-store API. */
(() => {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const place=p=>[p.city||'City unavailable',p.region].filter(Boolean).join(', ');
  const count=n=>`${n} ${n===1?'profile':'profiles'}`;
  function markup(report){
    const {points,summary}=report,boundaries=window.DKLA_US_BOUNDARIES;
    const dots=points.map(p=>{
      const xy=window.DKLA_US_PROJECTION.project(p.longitude,p.latitude,p.area);
      if(!xy)return '';
      const label=`${place(p)} · ${count(p.users)} · approximate IP location`;
      const r=Math.min(14,4+Math.log2(p.users+1)*2);
      return `<circle class="us-location-dot" cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="${r.toFixed(1)}" tabindex="0" role="img" aria-label="${escape(label)}" data-tip="${escape(label)}"><title>${escape(label)}</title></circle>`;
    }).join('');
    return `<div class="us-location-summary"><strong>${count(summary.us)} mapped</strong><span>${count(summary.foreign)} outside the US</span><span>${count(summary.unavailable)} without a mapped location</span></div>
      <svg class="us-location-map" viewBox="${boundaries.viewBox}" role="group" aria-label="Approximate US profile locations, with Alaska and Hawaii insets">
        <g aria-hidden="true">${boundaries.states.map(s=>`<path class="us-state" d="${s.d}"/>`).join('')}
        <path class="us-inset-line" d="M35 397H425M247 405V500"/>
        <text class="us-inset-label" x="103" y="511">ALASKA</text><text class="us-inset-label" x="318" y="511">HAWAII</text></g>${dots}</svg>
      ${points.length?'':'<p class="us-location-empty">No US coordinates are available for profiles in this range.</p>'}
      <p class="us-location-note">One location per profile, from its latest visit in this range and course. Older profiles may include historical browser links. Dots group profiles at the same approximate coordinates. IP locations can reflect a VPN or network provider. Older visits may lack coordinates. ${report.anonymousVisits?`${report.anonymousVisits} anonymous visits have no visitor location.`:''}</p>
      ${points.length?`<details class="us-location-list"><summary>Location counts</summary><div class="table-wrap"><table><thead><tr><th>Approximate location</th><th>Profiles</th></tr></thead><tbody>${points.map(p=>`<tr><td>${escape(place(p))}</td><td>${p.users}</td></tr>`).join('')}</tbody></table></div></details>`:''}
      <p class="us-location-source">Boundaries: <a href="${boundaries.source}" target="_blank" rel="noopener noreferrer">US Census Bureau, 2024</a> · Alaska and Hawaii shown as insets.</p>`;
  }
  let generation=0;
  async function mount(api,range,course){
    const target=document.getElementById('usLocations');if(!target)return;
    const current=++generation;
    try{
      const report=await api('locations',null,{start:new Date(range.start).toISOString(),end:new Date(range.end).toISOString(),course});
      if(current===generation&&target.isConnected)target.innerHTML=markup(report);
    }catch{
      if(current===generation&&target.isConnected)target.innerHTML='<p class="empty">Visitor locations are temporarily unavailable.</p>';
    }
  }
  window.DKLA_LOCATION_MAP={markup,mount};
})();
