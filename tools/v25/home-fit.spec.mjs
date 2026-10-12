/* Run against an explicitly chosen preview, never deploy or mutate production.
   DKLA_HOME_TEST_URL=https://<approved-preview> npx playwright test this-file */
import {test,expect} from '@playwright/test';
import auditNativeHome from './home-audit.js';
import {readFileSync} from 'node:fs';
const geometry=JSON.parse(readFileSync(new URL('./geography.json',import.meta.url),'utf8'));
const expectedRegions=geometry.regions.map(r=>r.id);
const url=process.env.DKLA_HOME_TEST_URL;
const sizes=[[2000,1040],[1440,900],[1366,768],[1000,700],[390,844],[320,568]];
for(const [width,height]of sizes)test(`native Home fits ${width} x ${height}`,async({page},testInfo)=>{
  test.skip(!url,'Choose a preview explicitly with DKLA_HOME_TEST_URL.');
  await page.setViewportSize({width,height});
  await page.goto(url);
  await page.locator('html.dkla-boot-ready').waitFor();
  const guide=page.getByRole('button',{name:'Not now',exact:true});if(await guide.isVisible())await guide.click();
  await page.locator('#geoBreadcrumb [data-study-scope="Atlas"]').click();
  await expect.poll(async()=>JSON.parse(await page.locator('#geoCanvas').getAttribute('data-dkla-home-view')).scope).toBe('Atlas');
  // Read actual SVG glyph extents after the native entrance animation settles.
  await expect.poll(async()=>page.locator('#geoCanvas text.region-title').count()).toBeGreaterThan(0);
  await page.waitForTimeout(700); // Native 280ms entrances and 300ms label fades.
  let first=await page.evaluate(auditNativeHome,{expectedRegions});
  await testInfo.attach('home-first-load.json',{body:JSON.stringify(first,null,2),contentType:'application/json'});
  await page.screenshot({path:testInfo.outputPath('home.png'),fullPage:false});
  expect(first.issues,JSON.stringify(first.issues)).toEqual([]);
  // Resize round trip must retain Home, names and complete bounds.
  await page.setViewportSize({width:width+60,height:height+40});
  await page.setViewportSize({width,height});
  const baselineFonts=Object.fromEntries(first.labels.filter(l=>l.tile).map(l=>[l.region,l.font]));
  await expect.poll(async()=>(await page.evaluate(auditNativeHome,{expectedRegions,baselineFonts})).issues).toEqual([]);
  await page.locator('#studyFit').click();
  await expect.poll(async()=>(await page.evaluate(auditNativeHome,{expectedRegions,baselineFonts})).issues).toEqual([]);
});
