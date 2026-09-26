#!/usr/bin/env python3
"""Revision 11: splice the continuous galaxy-to-map renderer (tools/r11/renderer.js) into `studyCode`,
retarget the camera helpers at the new zoom floor, retire the separate overview page in `dklaUI`,
and add the `dklaR11Styles` block. Refuses to run twice."""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
html = open(HTML, encoding='utf-8').read()
if 'const R11=' in html:
    sys.exit('r11 renderer already applied')
JS = open(os.path.join(ROOT, 'tools', 'r11', 'renderer.js'), encoding='utf-8').read()


def block(sid):
    m = re.search(r'<script id="%s"[^>]*>' % sid, html)
    s = m.end(); e = html.find('</script>', s)
    return s, e


def sub(seg, old, new, count=1):
    n = seg.count(old)
    assert n == count, f'anchor found {n} times (wanted {count}): {old[:90]!r}'
    return seg.replace(old, new)


# ---- studyCode
s, e = block('studyCode'); sc = html[s:e]
# 1. Replace draw() and the helpers the renderer supersedes.
d0 = sc.index('function draw(){')
tail = "'Scroll to explore · Drag the map to pan';\n}"
d1 = sc.index(tail, d0) + len(tail)
sc = sc[:d0] + JS.rstrip('\n') + sc[d1:]
z0 = sc.index('function zoomFloor(box){'); z1 = sc.index('\n', sc.index('function clampCamera(active){', z0))
sc = sc[:z0] + '// r11: zoomFloor and clampCamera live in the renderer section below.' + sc[z1:]
t0 = sc.index('function text(t,x,y,width,fs,'); t1 = sc.index('\n', t0)
sc = sc[:t0] + '// r11: text() is redefined next to the renderer, with measured wrapping.' + sc[t1:]
# 2. Scope helpers read the course from the region instead of its column.
sc = sub(sc, "function scopeRegions(scope=S.scope){return mapData().regions.filter(r=>scope==='Atlas'||scope==='Contracts'&&r.col<3||scope==='Civil Procedure'&&(r.id==='civil-region'||r.course==='Civil Procedure'||r.id.startsWith('cp-'))||scope==='Study notes'&&['workbench-region','semester-workbench'].includes(r.id));}",
         "function scopeRegions(scope=S.scope){return mapData().regions.filter(r=>scope==='Atlas'||regionCourse(r)===scope&&r.id!=='workbench-region'||scope==='Study notes'&&['workbench-region','semester-workbench'].includes(r.id));}")
sc = sub(sc, "function scopeBox(){return bounds(scopeRegions());}", "function scopeBox(){return S.scope==='Atlas'?galaxy().box:bounds(scopeRegions());}")
sc = sub(sc, "function setScopeFor(n){const r=regionFor(homeFor(n.id)?.region);S.scope=r?(r.col<3?'Contracts':(r.id==='civil-region'||r.course==='Civil Procedure'||r.id.startsWith('cp-'))?'Civil Procedure':'Study notes'):",
         "function setScopeFor(n){const r=regionFor(homeFor(n.id)?.region);S.scope=r?(r.id==='workbench-region'?'Study notes':regionCourse(r)):")
sc = sub(sc, "S.scope=r.col<3?'Contracts':['workbench-region','semester-workbench'].includes(r.id)?'Study notes':'Civil Procedure';selected=null;setReader(false);closeSearch();renderHeading();fitBox(r,animate,25,.95);",
         "S.scope=['workbench-region','semester-workbench'].includes(r.id)?'Study notes':regionCourse(r);selected=null;setReader(false);closeSearch();renderHeading();fitBox(r,animate,25,.95);")
sc = sub(sc, "S.scope=(regionFor(d.region)?.col??3)<3?'Contracts':['workbench-region','semester-workbench'].includes(d.region)?'Study notes':'Civil Procedure';",
         "S.scope=['workbench-region','semester-workbench'].includes(d.region)?'Study notes':regionCourse(regionFor(d.region))||'Study notes';")
# 3. Camera: the floor is the galaxy; animations flag themselves so the morph follow stays out of their way.
sc = sub(sc, "function setCamera(x,y,z,animate=true){cancelAnimationFrame(S.animation);z=Math.min(3,Math.max(.02,z));const from={x:S.x,y:S.y,z:S.z},start=performance.now();if(!animate||reducedMotion){Object.assign(S,{x,y,z});schedule();deferPersist();return;}\n function step(t){const f=Math.min(1,(t-start)/340),u=1-Math.pow(1-f,3);S.x=from.x+(x-from.x)*u;S.y=from.y+(y-from.y)*u;S.z=Math.exp(Math.log(from.z)+(Math.log(z)-Math.log(from.z))*u);schedule();if(f<1)S.animation=requestAnimationFrame(step);else deferPersist();}S.animation=requestAnimationFrame(step);",
         "function setCamera(x,y,z,animate=true){cancelAnimationFrame(S.animation);z=Math.min(3,Math.max(zoomFloor(),z));const from={x:S.x,y:S.y,z:S.z},start=performance.now();if(!animate||reducedMotion){R11.anim=false;Object.assign(S,{x,y,z});schedule();deferPersist();return;}\n // r11: van Wijk and Nuij (2003) smooth zoom-and-pan: one path through (position, width) space, rho = 1.42, so a long flight zooms out, crosses, and zooms back in instead of sliding.\n const rho=1.42,rho2=rho*rho,W=Math.max(1,safeArea().w),w0=W/from.z,w1=W/z,dx=x-from.x,dy=y-from.y,d=Math.hypot(dx,dy);let Sp,at;\n if(d<1e-6){Sp=Math.abs(Math.log(w1/w0))/rho;const k=w1>w0?1:-1;at=s=>({x:from.x,y:from.y,w:w0*Math.exp(k*rho*s)});}\n else{const b0=(w1*w1-w0*w0+rho2*rho2*d*d)/(2*w0*rho2*d),b1=(w1*w1-w0*w0-rho2*rho2*d*d)/(2*w1*rho2*d),r0=Math.log(Math.sqrt(b0*b0+1)-b0),r1=Math.log(Math.sqrt(b1*b1+1)-b1);Sp=(r1-r0)/rho;const ch0=Math.cosh(r0),sh0=Math.sinh(r0);at=s=>{const u=w0/(rho2*d)*(ch0*Math.tanh(rho*s+r0)-sh0);return {x:from.x+u*dx,y:from.y+u*dy,w:w0*ch0/Math.cosh(rho*s+r0)};};}\n const dur=Math.min(1200,Math.max(340,Math.abs(Sp)*260));\n function step(t){const f=Math.min(1,(t-start)/dur),u=f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;if(f<1){const p=at(Sp*u);if(Number.isFinite(p.x)&&Number.isFinite(p.w)&&p.w>0){S.x=p.x;S.y=p.y;S.z=Math.min(3,Math.max(zoomFloor(),W/p.w));}schedule();S.animation=requestAnimationFrame(step);}else{Object.assign(S,{x,y,z});schedule();R11.anim=false;deferPersist();}}R11.anim=true;S.animation=requestAnimationFrame(step);")
sc = sub(sc, "svg.addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY>0&&S.scope!=='Atlas'&&S.z<=zoomFloor()*1.02){if(++floorHits>=2){floorHits=0;home('Atlas');return;}}else floorHits=0;if(Date.now()-lastWheel>500)remember();lastWheel=Date.now();cancelAnimationFrame(S.animation);const p=screenToWorld(e.clientX,e.clientY),v=rect(),z=Math.max(.02,Math.min(3,S.z*Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.003)));S.x=",
         "svg.addEventListener('wheel',e=>{e.preventDefault();if(Date.now()-lastWheel>500)remember();lastWheel=Date.now();cancelAnimationFrame(S.animation);R11.anim=false;const p=screenToWorld(e.clientX,e.clientY),v=rect(),z=Math.max(zoomFloor(),Math.min(3,S.z*Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.003)));S.zoomAnchor=p;S.x=")
sc = sub(sc, "cancelAnimationFrame(S.animation);const t=e.target.closest('[data-map-node],[data-map-district],[data-map-region],[data-map-edge],[data-map-jump]');",
         "cancelAnimationFrame(S.animation);R11.anim=false;const t=e.target.closest('[data-map-node],[data-map-district],[data-map-region],[data-map-edge],[data-map-jump]');")
sc = sub(sc, "z=Math.max(.02,Math.min(3,S.pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/S.pinch.distance));", "z=Math.max(zoomFloor(),Math.min(3,S.pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/S.pinch.distance));S.zoomAnchor=S.pinch.world;")
sc = sub(sc, "function pointerEnd(e){const d=S.drag,t=d?.target;", "function pointerEnd(e){const d=S.drag,t=d?.target;R11.dragMoved=!!d?.hasMoved;")
sc = sub(sc, "const v=S.history.pop();if(!v)return;cancelAnimationFrame(S.animation);restoreView(v);", "const v=S.history.pop();if(!v)return;cancelAnimationFrame(S.animation);R11.anim=false;R11.lastT=null;restoreView(v);")
# 4. First view is the galaxy; cached views at galaxy zoom are valid.
sc = sub(sc, "cachedView.z>.02&&cachedView.z<4;\nif(goodView)restoreView(cachedView);else{home('Contracts',false,false);S.history=[];}",
         "cachedView.z>.001&&cachedView.z<4;\nif(goodView)restoreView(cachedView);else{home('Atlas',false,false);S.history=[];}")
sc = sub(sc, "zoom=function(factor){remember();const v=rect(),p=mapCenterVisible(),z=Math.max(.035,Math.min(3,S.z*factor));", "zoom=function(factor){remember();const v=rect(),p=mapCenterVisible(),z=Math.max(zoomFloor(),Math.min(3,S.z*factor));S.zoomAnchor=null;")
html = html[:s] + sc + html[e:]

# ---- civilCode: cached-data fallback view
s, e = block('civilCode'); cc = html[s:e]
cc = sub(cc, "if(data.studyMap.view)restoreView(data.studyMap.view);else home('Civil Procedure',false,false);", "if(data.studyMap.view)restoreView(data.studyMap.view);else home('Atlas',false,false);")
html = html[:s] + cc + html[e:]

# ---- civilCode first-run view (second site) and dklaCore
s, e = block('civilCode'); cc = html[s:e]
cc = sub(cc, "if(!base.studyMap.view){home('Civil Procedure',false,false);S.history=[];}", "if(!base.studyMap.view){home('Atlas',false,false);S.history=[];}")
html = html[:s] + cc + html[e:]

# ---- dklaUI: retire the overview page and its galaxy; the map draws the galaxy itself now.
s, e = block('dklaUI'); ui = html[s:e]
g0 = ui.index('// ---- r10: the galaxy overview.')
g1 = ui.index("window.DKLA=Object.assign(window.DKLA||{},{galaxy:galaxyLayout,openHub});")
g1 = ui.index('\n', g1)
ui = ui[:g0] + "// ---- r11: the overview page is gone. The map itself is the galaxy at the floor zoom (see the r11 section of studyCode).\nrenderOverview=function(){overview.hidden=true;document.body.classList.remove('dkla-overview-mode');};" + ui[g1:]
ui = sub(ui, "if(S.scope==='Atlas')document.getElementById('courseHome').textContent='Overview';", "if(S.scope==='Atlas')document.getElementById('courseHome').textContent='Atlas';")
html = html[:s] + ui + html[e:]

# ---- styles
CSS = """<style id="dklaR11Styles">
#geoCanvas .map-label{pointer-events:none}
#geoCanvas .map-label[data-map-region],#geoCanvas .map-label[data-study-scope],#geoCanvas .map-label[data-map-district]{pointer-events:auto;cursor:pointer}
#geoCanvas .map-label[data-map-region]:hover,#geoCanvas .map-label[data-study-scope]:hover,#geoCanvas .map-label[data-map-district]:hover{fill:#fff}
#geoCanvas .course-label{letter-spacing:.01em}
#geoCanvas .dkla-star{cursor:pointer}
#geoCanvas .dkla-star.is-case{filter:drop-shadow(0 0 1.5px currentColor)}
#geoCanvas .star-pulse{transform-box:fill-box;transform-origin:center;animation:dklaStarPulse 1.6s ease-out infinite}
@keyframes dklaStarPulse{0%{transform:scale(.55);opacity:.95}100%{transform:scale(2.4);opacity:0}}
#geoCanvas .node-card{transition:none}
#mapTip{position:absolute;z-index:6;pointer-events:none;background:#141e27ee;border:1px solid #3a4a58;border-radius:8px;padding:7px 10px;max-width:260px;color:#e4ebf1;font-size:12.5px;line-height:1.35;box-shadow:0 6px 24px #0008}
#mapTip[hidden]{display:none}#mapTip strong{display:block;font-size:13px;font-weight:600}#mapTip span{color:#93a7b7;font-size:11.5px}
#dklaOverview{display:none!important}
@media(prefers-reduced-motion:reduce){#geoCanvas .star-pulse{animation:none}}
</style>
"""
anchor = '</head><body class="study-mode">'
assert html.count(anchor) == 1
html = html.replace(anchor, CSS + anchor)
open(HTML, 'w', encoding='utf-8').write(html)
print('r11 renderer applied')
