// Download cb_2024_us_state_20m.zip from the Census source documented below,
// extract it locally, then pass its containing directory. No visitor data is used.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import path from 'node:path';
const directory=process.argv[2];if(!directory)throw new Error('Usage: node tools/analytics/build-us-map.mjs <extracted Census directory>');
const root=path.resolve(import.meta.dirname,'../..'),base=path.join(directory,'cb_2024_us_state_20m');
const shp=readFileSync(base+'.shp'),dbf=readFileSync(base+'.dbf');
const context={window:{}};runInNewContext(readFileSync(path.join(root,'assets/admin/us-projection.js'),'utf8'),context);
const project=context.window.DKLA_US_PROJECTION.project,fields=[];
for(let offset=32;dbf[offset]!==13;offset+=32){const end=dbf.indexOf(0,offset);fields.push({name:dbf.toString('ascii',offset,Math.min(end,offset+11)),length:dbf[offset+16]});}
const header=dbf.readUInt16LE(8),recordLength=dbf.readUInt16LE(10),states=[];
let record=0,offset=100;const bounds={};
while(offset<shp.length){
  const bytes=shp.readInt32BE(offset+4)*2,start=offset+8,type=shp.readInt32LE(start);
  let fieldOffset=header+record*recordLength+1,properties={};
  for(const field of fields){properties[field.name]=dbf.toString('utf8',fieldOffset,fieldOffset+field.length).trim();fieldOffset+=field.length;}
  if(type!==5)throw new Error('Expected Polygon shapefile');
  if(properties.STUSPS!=='PR'){
    const area=properties.STUSPS==='AK'?'alaska':properties.STUSPS==='HI'?'hawaii':'main';
    const partCount=shp.readInt32LE(start+36),pointCount=shp.readInt32LE(start+40),pointStart=start+44+partCount*4;
    const parts=Array.from({length:partCount},(_,i)=>shp.readInt32LE(start+44+i*4));parts.push(pointCount);
    let d='';
    for(let part=0;part<partCount;part++){
      for(let i=parts[part];i<parts[part+1];i++){
        const lon=shp.readDoubleLE(pointStart+i*16),lat=shp.readDoubleLE(pointStart+i*16+8),[x,y]=project(lon,lat,area);
        d+=(i===parts[part]?'M':'L')+x.toFixed(1)+','+y.toFixed(1);
        const b=bounds[area]||[Infinity,Infinity,-Infinity,-Infinity];bounds[area]=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];
      }
      d+='Z';
    }
    states.push({code:properties.STUSPS,name:properties.NAME,area,d});
  }
  offset+=bytes+8;record++;
}
if(states.length!==51)throw new Error('Expected 50 states plus DC');
const source='https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip';
const data={source,shapefileSHA256:createHash('sha256').update(shp).digest('hex'),viewBox:'0 0 920 530',states};
writeFileSync(path.join(root,'assets/admin/us-boundaries.js'),'/* US Census 2024 state cartographic boundaries, 1:20,000,000. See tools/analytics/README.md. */\nwindow.DKLA_US_BOUNDARIES='+JSON.stringify(data)+';\n');
console.log(JSON.stringify({states:states.length,bounds,bytes:JSON.stringify(data).length}));
