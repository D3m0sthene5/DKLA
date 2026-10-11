import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = await readFile(path.join(root, 'DKLA-r18.html'), 'utf8');
const seed = JSON.parse(html.match(/<script\b[^>]*id="seedData"[^>]*>([\s\S]*?)<\/script>/i)[1]);
const geometry = JSON.parse(await readFile(path.join(root, 'tools/v25/geography.json'), 'utf8'));
const targets = { tall: { Contracts: [-7370,-13364], 'Civil Procedure': [-16440,-360], 'Legislation and the Regulatory State': [1500,-360], 'workbench-region': [-1700,900], 'dictionary-region': [-1700,2700] }, wide: { Contracts: [-7370,700], 'Civil Procedure': [-23310,700], 'Legislation and the Regulatory State': [8370,700], 'workbench-region': [12700,13500], 'dictionary-region': [15500,13500] } };
const layouts = {};
for (const mode of ['tall','wide']) {
  const regions = geometry.regions.map(r => { const offset = targets[mode][r.anchor]; if(!offset)throw new Error('Unknown geometry anchor'); return { id:r.id,title:r.title,course:r.courseKey,x:r.x+offset[0],y:r.y+offset[1],w:r.w,h:r.h }; });
  const byRegion = new Map(regions.map(r => [r.id,r]));
  const homes = Object.fromEntries(Object.entries(geometry.homes).map(([id,h]) => { const offset = targets[mode][h.anchor]; if(!offset)throw new Error('Unknown home anchor'); return [id,{ ...h,x:h.x+offset[0],y:h.y+offset[1] }]; }));
  layouts[mode] = {regions,homes};
}
const regionById = new Map(layouts.tall.regions.map(r => [r.id,r]));
const nodes = seed.nodes.filter(n=>geometry.homes[n.id]).map(n => ({id:n.id,title:n.title,kind:n.kind || n.type || 'entry',course:regionById.get(geometry.homes[n.id]?.region)?.course || '',region:geometry.homes[n.id]?.region || '',district:geometry.homes[n.id]?.district || ''}));
const meta=JSON.parse(await readFile(path.join(root,'tools/r19/data/meta.json'),'utf8'));
const mapped=new Set(Object.values(JSON.parse(await readFile(path.join(root,'tools/r19/data/map.json'),'utf8'))));
for(const item of meta.entries)if(!mapped.has(item.id))nodes.push({id:item.id,title:item.title,kind:'Case',course:item.course,region:'',district:'',supporting:true});
const authorityData=JSON.parse(await readFile(path.join(root,'tools/v25/authorities.json'),'utf8'));
const authorityCollections=new Map(authorityData.collections.map(c=>[c.id,c]));
const courses=['Contracts','Civil Procedure','Legislation and the Regulatory State'];
for(const entry of authorityData.entries){const collection=authorityCollections.get(entry.collection);nodes.push({id:'authority:'+entry.id,title:entry.cite+(entry.title!==entry.cite?' — '+entry.title:''),kind:'Authority',course:courses[collection?.course]||'',region:'',district:'',subject:collection?.title||'Rules & authorities'});}
const catalog = { layoutId:geometry.layoutId,source:'Current locked v2.5 geography',layouts,nodes,...layouts.wide };
await mkdir(path.join(root,'lib/analytics'),{recursive:true});
await mkdir(path.join(root,'assets/admin'),{recursive:true});
await writeFile(path.join(root,'lib/analytics/catalog.json'),JSON.stringify(catalog));
await writeFile(path.join(root,'assets/admin/catalog.js'),'window.DKLA_CATALOG = '+JSON.stringify(catalog)+';\n');
console.log(`Analytics catalogue: ${nodes.length} entries; ${catalog.regions.length} subjects; tall and wide layouts.`);
if (!process.argv.includes('--catalog-only')) {
  await mkdir(path.join(root,'lib/analytics/asn'),{recursive:true});
  for (const name of ['ip2asn-v4-u32.tsv.gz','ip2asn-v6.tsv.gz']) {
    const response = await fetch('https://iptoasn.com/data/'+name,{signal:AbortSignal.timeout(120000)});
    if (!response.ok) throw new Error(`ASN download failed: ${response.status}`);
    const data=Buffer.from(await response.arrayBuffer()); if(data.length<10000)throw new Error('ASN dataset unexpectedly small');
    await writeFile(path.join(root,'lib/analytics/asn',name),data);
  }
  await writeFile(path.join(root,'lib/analytics/asn/version.json'),JSON.stringify({fetchedAt:new Date().toISOString(),source:'https://iptoasn.com',license:'PDDL-1.0'}));
  console.log('Own-server ASN lookup datasets ready.');
}
