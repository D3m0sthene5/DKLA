/* An open atlas index populated by its native illustrations and source titles.
   Course geography, readers, and saved navigation remain owned by the atlas. */
(() => {
  'use strict';
  const LRS = 'Legislation and the Regulatory State';
  const destinations = [
    { key: 'contracts', title: 'Contracts', course: 'Contracts', type: 'course' },
    { key: 'civil', title: 'Civil Procedure', course: 'Civil Procedure', type: 'course' },
    { key: 'lrs', title: LRS, course: LRS, type: 'course' },
    { key: 'authorities', title: 'Rules & authorities', detail: 'Constitution, rules and codes', type: 'reference' },
    { key: 'history', title: 'SCOTUS history', detail: 'Justices and decisions', type: 'reference' },
    { key: 'notes', title: 'Study notes', detail: 'Your workbench', type: 'reference' },
    { key: 'dictionary', title: 'Dictionary', detail: 'Legal terms from A to Z', type: 'dictionary' },
  ];
  const byKey = new Map(destinations.map(d => [d.key, d]));
  let surface = null, installed = false, markSignature = '', lastDestination = 'contracts', dragStart = null, dragged = false;
  let previousHint = null, previousActive = false, markSerial = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const previews = {contracts:['lucy','hawkins','hamer'],civil:['shoe','cp-erie-decision','cp-twombly'],lrs:['lrs-s-brig-aurora','lrs-s-grimaud','lrs-i-chevron']};
  const primary = (key,title,extra='') => `<button class="atlas-index-title" type="button" data-atlas-destination="${key}" aria-label="Explore ${esc(title)}"><span class="atlas-title-full">${esc(title)}</span>${key==='lrs'?'<span class="atlas-title-compact" aria-hidden="true">Legislation<br>& regulation</span>':''}<span class="atlas-index-arrow" aria-hidden="true">↗</span></button>${extra}`;
  function coursePlate(d,index){
    const c=window.DKLAOverviewAssets.course(d.course,previews[d.key]);
    if(!c)return '';
    // All footprints use a single uniform source-to-preview transform. Leaders
    // annotate actual case containment; they never imply doctrine relationships.
    const scale=Math.min(404/c.bounds.w,208/c.bounds.h),ox=(420-c.bounds.w*scale)/2,oy=(220-c.bounds.h*scale)/2;
    const point=(x,y)=>[ox+(x-c.bounds.x)*scale,oy+(y-c.bounds.y)*scale];
    const rect=r=>{const p=point(r.x,r.y);return `x="${p[0].toFixed(2)}" y="${p[1].toFixed(2)}" width="${(r.w*scale).toFixed(2)}" height="${(r.h*scale).toFixed(2)}"`;};
    const placements={contracts:[[250,110],[360,0],[57,125]],civil:[[66,0],[56,121],[190,124]],lrs:[[57,104],[170,127],[350,0]]}[d.key];
    const subjectIds={contracts:['formalities-region','offer-region','acceptance-region','terms-region','limits-region'],civil:['cp-personal-region','cp-notice-region','cp-subject-region','cp-venue-region','cp-class-region','cp-summary-region'],lrs:['lrs-region-appointments-and-executive-structure','lrs-region-removal-and-agency-independence','lrs-region-rulemaking','lrs-region-reading-plans-and-source-gaps','lrs-region-judicial-review-and-standing']}[d.key];
    const prefix=r=>r.title.split(/\s+(?:&|and|over|subject-matter|to)\s+|,/)[0].split(' ').slice(0,r.id==='cp-subject-region'?1:2).join(' ');
    const labels=subjectIds.map((id,i)=>{
      const r=c.subjects.find(r=>r.id===id);if(!r)return '';const p=point(r.x+r.w/2,r.y+r.h/2);
      // Literal native prefixes keep this small plan legible; full native titles
      // remain available to keyboard and pointer users.
      const raw=prefix(r),label=raw==='Limits on'?'Limits':raw,words=label.split(' '),lines=label.length>12&&words.length>1?[words[0],words.slice(1).join(' ')]:[label];
      const x=Math.max(36,Math.min(384,p[0])).toFixed(2),y=(p[1]-(lines.length-1)*8).toFixed(2);
      return `<a href="#" class="atlas-plan-subject${i>1?' atlas-plan-secondary':''}" data-atlas-region="${esc(r.id)}" aria-label="Open ${esc(r.title)}"><title>${esc(r.title)}</title><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"${raw==='Appointments'?' style="font-size:13px"':''}>${lines.map((line,j)=>`<tspan x="${x}" dy="${j?16:0}">${esc(line)}</tspan>`).join('')}</text></a>`;
    }).join('');
    const footprints=c.subjects.map(r=>`<rect class="atlas-plan-region" ${rect(r)} data-source-region="${esc(r.id)}"><title>${esc(r.title)}</title></rect>`).join('');
    const districts=c.districts.map(r=>`<rect class="atlas-plan-inset" ${rect(r)} aria-hidden="true"/>`).join('');
    const leaders=c.cases.map((n,i)=>{if(!n.home)return '';const p=point(n.home.x,n.home.y),slot=placements[i];return `<path class="atlas-plan-leader${i>1?' atlas-plan-secondary':''}" d="M${slot[0]},${slot[1]+28}L${p[0].toFixed(2)},${p[1].toFixed(2)}" data-case-region="${esc(n.home.region)}"/><circle class="atlas-plan-home" cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="2" data-case-region="${esc(n.home.region)}"/>`;}).join('');
    const cases=c.cases.map((n,i)=>`<button type="button" class="atlas-case-exhibit atlas-plan-case${i>1?' atlas-plan-secondary':''}" data-atlas-case="${esc(n.id)}" data-case-region="${esc(n.home?.region||'')}" style="--case-x:${placements[i][0]/420*100}%;--case-y:${placements[i][1]/220*100}%" aria-label="Open ${esc(n.fullTitle||n.title)}" title="${esc(n.fullTitle||n.title)}"><span class="atlas-case-art">${n.svg}</span><strong>${esc(n.displayTitle)}</strong></button>`).join('');
    const mobileSubjects=subjectIds.slice(0,2).map(id=>c.subjects.find(r=>r.id===id)).filter(Boolean);
    return `<article class="atlas-course-plate atlas-overview-${d.key}" style="--course-ink:${esc(c.color)}" aria-label="${esc(d.title)} course contents"><header><span class="atlas-folio">0${index+1} / COURSE</span>${primary(d.key,d.title)}<span class="atlas-index-count"><span class="atlas-count-full">${c.caseCount} illustrated cases · ${c.subjects.length} subjects</span><span class="atlas-count-compact">${c.caseCount} cases · ${c.subjects.length} subjects</span></span></header><div class="atlas-course-plan"><div class="atlas-course-plan-frame"><svg class="atlas-course-geography" viewBox="0 0 420 220" aria-label="${esc(d.title)} source course plan"><g class="atlas-plan-footprints">${footprints}${districts}</g><g class="atlas-plan-annotations">${leaders}${labels}</g></svg>${cases}</div></div><div class="atlas-subject-index" aria-label="Sample subjects">${mobileSubjects.map(r=>`<button type="button" data-atlas-region="${esc(r.id)}" aria-label="Open ${esc(r.title)}">${esc(r.title)}</button>`).join('')}</div><button type="button" class="atlas-course-enter" data-atlas-course="${d.key}">Explore the course <span aria-hidden="true">→</span></button></article>`;
  }
  function referenceRegister(){
    const assets=window.DKLAOverviewAssets,people=assets.peopleURI(),sample=assets.glossarySample();
    const labels={constitution:'U.S. Constitution',frcp:'Federal Rules',uscode:'U.S. Code',ucc:'Commercial Code',restatement:'R2 · Contracts',consumer:'Consumer Contracts'},compact={constitution:'Const.',frcp:'FRCP',uscode:'U.S. Code',ucc:'UCC',restatement:'Rest. 2d',consumer:'Consumer'};
    const volumes=Object.keys(labels).map(id=>{const v=assets.authority(id);return v?`<button type="button" class="atlas-authority-volume" data-atlas-authority="${esc(v.id)}" aria-label="Explore ${esc(v.title)}" title="${esc(v.title)}" style="--volume-ink:${v.ink};--volume-paper:${v.paper};--volume-edge:${v.edge}">${v.svg}<span class="atlas-authority-full">${esc(labels[id])}</span><span class="atlas-authority-compact" aria-hidden="true">${esc(compact[id])}</span></button>`:'';}).join('');
    const h=window.SCOTUSHistory?.data,peopleList=Object.values(h?.people||{});
    const justices=['john-marshall','earl-warren','john-glover-roberts-jr'].map(id=>peopleList.find(p=>p.id===id)).filter(Boolean);
    const start=String(h?.rangeStart||'').slice(0,4),end=String(h?.requestedEnd||h?.asOf||'').slice(0,4);
    const portraits=justices.map(p=>{const service=p.service?.find(s=>s.role==='chief'),scale=30/(h.sprite?.cellW||384),frame=p.frame;if(!service)return '';const years=service.start.slice(0,4)+'–'+(service.end?.slice(0,4)||'');return `<button type="button" class="atlas-history-era" data-atlas-history-date="${esc(service.start)}" aria-label="View ${esc(p.name)}'s Court in ${service.start.slice(0,4)}">${frame?`<span class="atlas-history-portrait" aria-hidden="true" style="background-image:var(--sh-sprite);background-size:${h.sprite.width*scale}px ${h.sprite.height*scale}px;background-position:${-frame.x*scale}px ${-frame.y*scale}px"></span>`:''}<span><strong>${esc(p.shortName)}</strong><small>${esc(years)}</small></span></button>`;}).join('');
    const definition=sample?.definition?.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||sample?.definition||'';
    return `<div class="atlas-reference-register"><section class="atlas-reference atlas-reference-authorities">${primary('authorities','Rules & authorities')}<div class="atlas-authority-contents">${people?`<img class="atlas-people-mark" src="${esc(people)}" alt="We the People">`:''}<div class="atlas-authority-register">${volumes}</div></div></section><section class="atlas-reference atlas-reference-history">${primary('history','SCOTUS history')}<div class="atlas-history-range"><span>${esc(start)}</span><span class="atlas-history-line" aria-hidden="true"></span><span>${esc(end)}</span></div><div class="atlas-history-people">${portraits}</div><span class="atlas-reference-detail">Justices, seats & decisions</span></section><section class="atlas-reference atlas-reference-dictionary">${primary('dictionary','Legal dictionary')}<div class="atlas-dictionary-specimen">${sample?`<strong>${esc(sample.term)}</strong><p>${esc(definition)}</p>`:'<strong>Words of the law</strong><p>Browse the legal dictionary, A–Z.</p>'}</div><span class="atlas-reference-detail" data-dictionary-count>Legal terms, A–Z</span></section><section class="atlas-reference atlas-reference-notes">${primary('notes','Study notes')}<div class="atlas-notebook-lines"><span>Notes & annotations</span><span>Saved entries</span><span>Recall ratings</span></div><span class="atlas-reference-detail">Open your workbench →</span></section></div>`;
  }
  function composition(){return `<div class="atlas-overview-composition"><div class="atlas-index-masthead"><span>THE LEGAL ATLAS</span></div><nav class="atlas-course-spread" aria-label="Courses">${destinations.filter(d=>d.course).map(coursePlate).join('')}</nav><div class="atlas-index-spine"><a class="atlas-overview-brand" href="https://dkla.dev" aria-label="Open private DKLA analytics (password required)" title="Private analytics · password required"><span class="atlas-overview-mark"></span></a></div>${referenceRegister()}</div>`;}
  function active() {
    return typeof S !== 'undefined' && S.scope === 'Atlas' && !S.region && !S.district &&
      !(typeof selected !== 'undefined' && selected) && !S.panelOpen && !window.SCOTUSHistory?.state?.().open;
  }
  function modalOpen() { return !!document.querySelector('dialog[open]'); }
  function currentDestination() {
    const button = document.activeElement?.closest?.('[data-atlas-destination]');
    return button?.dataset.atlasDestination || lastDestination;
  }
  function navigate(key) {
    const d = byKey.get(key); if (!d) return false;
    lastDestination = key;
    if (d.course) home(d.course);
    else if (key === 'dictionary') goRegion('dictionary-region');
    else if (key === 'authorities') window.DKLAAuthorities?.open();
    else if (key === 'history') window.SCOTUSHistory?.open();
    else if (key === 'notes') goRegion('workbench-region');
    refresh();
    return true;
  }
  function cloneCurrentMark() {
    if (!surface) return false;
    const source = document.querySelector('#atlasHome .dkla-header-monogram');
    if (!source?.querySelector('.dkla-letter-d[data-r21-shaped]')) return false;
    const signature = source.outerHTML;
    if (signature === markSignature) return true;
    const copy = source.cloneNode(true), prefix = 'atlas-overview-mark-' + (++markSerial) + '-';
    const ids = new Map([...copy.querySelectorAll('[id]')].map(el => [el.id, prefix + el.id]));
    for (const el of copy.querySelectorAll('*')) {
      if (el.id && ids.has(el.id)) el.id = ids.get(el.id);
      for (const attr of [...el.attributes]) {
        let value = attr.value;
        for (const [oldId, nextId] of ids) {
          value = value.split('url(#' + oldId + ')').join('url(#' + nextId + ')');
          if ((attr.name === 'href' || attr.name === 'xlink:href') && value === '#' + oldId) value = '#' + nextId;
        }
        if (value !== attr.value) el.setAttribute(attr.name, value);
      }
    }
    copy.removeAttribute('id'); copy.removeAttribute('width'); copy.removeAttribute('height'); copy.removeAttribute('style');
    copy.setAttribute('class', 'dkla-monogram atlas-overview-monogram');
    copy.setAttribute('aria-hidden', 'true'); copy.setAttribute('focusable', 'false');
    surface.querySelector('.atlas-overview-mark').replaceChildren(copy);
    markSignature = signature;
    return true;
  }
  function fitCoursePlans(){
    if(!surface)return;
    for(const plan of surface.querySelectorAll('.atlas-course-plan')){
      const frame=plan.querySelector('.atlas-course-plan-frame');if(!frame)continue;
      if(window.matchMedia('(max-width:700px)').matches){frame.style.removeProperty('width');frame.style.removeProperty('height');continue;}
      const width=Math.min(plan.clientWidth,plan.clientHeight*420/220),height=width*220/420;
      const w=width.toFixed(2)+'px',h=height.toFixed(2)+'px';
      if(frame.style.width!==w)frame.style.width=w;if(frame.style.height!==h)frame.style.height=h;
    }
  }
  function refresh() {
    if (!surface) return false;
    const on = active(), wasHidden = surface.hidden;
    surface.hidden = !on;
    document.body.classList.toggle('atlas-overview-active', on);
    if (on && wasHidden) {
      const focus = document.activeElement;
      if (focus && document.getElementById('geoCanvas')?.contains(focus)) surface.querySelector('[data-atlas-destination]')?.focus({ preventScroll: true });
    }
    const hint = document.getElementById('mapHint');
    if (hint) {
      if (on) {
        if (!previousActive) previousHint = hint.textContent;
        if (hint.textContent !== 'Choose a destination') hint.textContent = 'Choose a destination';
      } else if (previousActive && previousHint !== null && hint.textContent !== previousHint) hint.textContent = previousHint;
    }
    previousActive = on;
    if(on)fitCoursePlans();
    const count = window.DKLA?.glossaryCount?.(), description = surface.querySelector('[data-dictionary-count]');
    if (description) description.textContent = Number.isFinite(count) && count > 0 ? count.toLocaleString() + ' terms · A–Z' : 'Legal terms from A to Z';
    const shaped = cloneCurrentMark();
    window.DKLAOverview.ready = shaped;
    return on;
  }
  function moveFocus(event) {
    const button = event.target.closest?.('[data-atlas-destination]');
    if (!button || !/^Arrow(Left|Right|Up|Down)$/.test(event.key)) return false;
    const r = button.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight', positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const choices = [...surface.querySelectorAll('[data-atlas-destination]')].filter(b => b !== button).map(b => {
      const box = b.getBoundingClientRect(), dx = box.x + box.width / 2 - x, dy = box.y + box.height / 2 - y;
      const along = horizontal ? dx : dy, across = horizontal ? dy : dx;
      return { b, along, score: Math.abs(along) + Math.abs(across) * 2 };
    }).filter(c => positive ? c.along > 2 : c.along < -2).sort((a, b) => a.score - b.score);
    if (choices.length) choices[0].b.focus({ preventScroll: true });
    event.preventDefault(); event.stopImmediatePropagation(); return true;
  }
  function install() {
    if (installed) return;
    const host = document.getElementById('studyMain');
    if (!host || !window.LegalAtlas?.ready || !window.DKLAAuthorities?.open || !window.SCOTUSHistory?.open || typeof home !== 'function' || typeof draw !== 'function' || typeof S === 'undefined' || !window.DKLAOverviewAssets?.course) { setTimeout(install, 80); return; }
    installed = true;
    surface = document.createElement('section'); surface.id = 'atlasOverview'; surface.className = 'atlas-overview';
    surface.setAttribute('aria-label', 'Danny Kind Legal Atlas destinations'); surface.hidden = true;
    surface.innerHTML = composition();
    host.appendChild(surface);
    surface.addEventListener('click', event => {
      const b = event.target.closest('[data-atlas-destination],[data-atlas-case],[data-atlas-region],[data-atlas-authority],[data-atlas-course],[data-atlas-history-date]'); if (!b) { event.stopPropagation(); return; }
      event.preventDefault(); event.stopPropagation();
      if (dragged) { dragged = false; return; }
      if(b.dataset.atlasHistoryDate)window.SCOTUSHistory.setDate(b.dataset.atlasHistoryDate);
      else if(b.dataset.atlasCase)goNode(b.dataset.atlasCase,true);
      else if(b.dataset.atlasRegion)goRegion(b.dataset.atlasRegion);
      else if(b.dataset.atlasAuthority)window.DKLAAuthorities.group(b.dataset.atlasAuthority);
      else navigate(b.dataset.atlasDestination||b.dataset.atlasCourse);
      refresh();
    });
    surface.addEventListener('pointerdown', event => { dragStart = { x: event.clientX, y: event.clientY }; dragged = false; });
    surface.addEventListener('pointermove', event => { if (dragStart && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 12) dragged = true; });
    surface.addEventListener('pointerup', () => { dragStart = null; setTimeout(() => { dragged = false; }, 0); });
    surface.addEventListener('pointercancel', () => { dragStart = null; dragged = false; });
    surface.addEventListener('focusin', event => { const b = event.target.closest('[data-atlas-destination]'); if (b) lastDestination = b.dataset.atlasDestination; });
    surface.addEventListener('pointerover', event => { const b = event.target.closest('[data-atlas-destination]'); if (b) lastDestination = b.dataset.atlasDestination; });
    surface.addEventListener('wheel', event => {
      if (!active() || modalOpen()) return;
      if (event.ctrlKey || event.metaKey) { event.stopImmediatePropagation(); return; }
      if (surface.scrollHeight > surface.clientHeight + 1) { event.stopImmediatePropagation(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      const destination = event.target.closest('[data-atlas-destination]')?.dataset.atlasDestination;
      if (event.deltaY < -12 && destination) navigate(destination);
    }, { passive: false });
    document.addEventListener('click', event => {
      if (!active() || modalOpen()) return;
      const id = event.target.closest('button')?.id;
      if (!['studyZoomIn', 'studyZoomOut', 'studyFit'].includes(id)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (id === 'studyZoomIn') navigate(currentDestination()); else refresh();
    }, true);
    document.addEventListener('keydown', event => {
      // Browser zoom shortcuts must not fall through to the older map layer,
      // which interprets these keys without checking their modifiers.
      if (active() && (event.ctrlKey || event.metaKey) && ['+','=','-','0'].includes(event.key)) {
        event.stopImmediatePropagation(); return;
      }
      if (!active() || modalOpen() || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if (moveFocus(event)) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault(); event.stopImmediatePropagation();
        const destination = event.target.closest?.('[data-atlas-destination]')?.dataset.atlasDestination;
        if (destination) navigate(destination);
      }
      else if (event.key === '-' || event.key === '0') { event.preventDefault(); event.stopImmediatePropagation(); refresh(); }
    }, true);
    // Only presentation is refreshed at native state boundaries. Each original
    // route still owns its camera, history, source lookup and reading behavior.
    // The hidden map's old camera zoom can cross its course-picking threshold
    // on resize. The compact home owns that view; detailed maps still use it.
    const previousAutoScope = autoScope;
    autoScope = function (...args) { if (active()) return; return previousAutoScope.apply(this, args); };
    const wrap = original => function (...args) { const result = original.apply(this, args); refresh(); return result; };
    home = wrap(home); goRegion = wrap(goRegion); goDistrict = wrap(goDistrict); goNode = wrap(goNode);
    back = wrap(back); restoreView = wrap(restoreView); renderInspector = wrap(renderInspector); draw = wrap(draw);
    const header = document.getElementById('atlasHome');
    if (header) new MutationObserver(() => refresh()).observe(header, { childList: true, subtree: true, attributes: true });
    new ResizeObserver(() => refresh()).observe(host);
    refresh();
    if (!window.DKLAOverview.ready) {
      const waitForMark = () => { refresh(); if (!window.DKLAOverview.ready) setTimeout(waitForMark, 80); };
      setTimeout(waitForMark, 80);
    }
  }
  window.DKLAOverview = {
    ready: false, active, refresh, navigate,
    destinations: () => destinations.map(({ key, title, type }) => ({ key, title, type })),
    layout: () => ({ active: active(), ready: window.DKLAOverview.ready, container: surface?.getBoundingClientRect().toJSON(),
      portals: surface ? [...surface.querySelectorAll('[data-atlas-destination]')].map(b => ({ key: b.dataset.atlasDestination, label: b.innerText, box: b.getBoundingClientRect().toJSON() })) : [] }),
  };
  install();
})();
