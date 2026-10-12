/* Run against an explicitly chosen preview, never deploy or mutate production.
   DKLA_HOME_TEST_URL=https://<approved-preview> npx playwright test this-file */
import {test,expect} from '@playwright/test';
import auditNativeHome from './home-audit.js';
import {readFileSync} from 'node:fs';
const geometry=JSON.parse(readFileSync(new URL('./geography.json',import.meta.url),'utf8'));
const baseline=JSON.parse(readFileSync(new URL('./home-baseline-fonts.json',import.meta.url),'utf8'));
const expectedRegions=geometry.regions.map(r=>r.id);
const url=process.env.DKLA_HOME_TEST_URL;
if(!url)throw new Error('Set DKLA_HOME_TEST_URL to the explicit preview; missing targets must not produce a green skipped run.');
const sizes=[[2000,1040],[1440,900],[1366,768],[1000,700],[1180,820],[1024,768],[844,390],[932,430]];
for(const [width,height]of sizes)test(`native Home fits ${width} x ${height}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height});
  // The first-visit guide is a separate onboarding flow, not the Home layout.
  await page.addInitScript(()=>localStorage.setItem('dkla.guide.v1','seen'));
  await page.goto(url);
  await page.locator('html.dkla-boot-ready').waitFor();
  const guide=page.getByRole('button',{name:'Not now',exact:true});if(await guide.isVisible())await guide.click();
  await page.locator('#geoBreadcrumb [data-study-scope="Atlas"]').click();
  await expect.poll(async()=>JSON.parse(await page.locator('#geoCanvas').getAttribute('data-dkla-home-view')).scope).toBe('Atlas');
  // Read actual SVG glyph extents after the native entrance animation settles.
  await expect.poll(async()=>page.locator('#geoCanvas g.map-region path[data-map-region]').count()).toBe(expectedRegions.length);
  await page.waitForTimeout(700); // Native 280ms entrances and 300ms label fades.
  const contract={expectedRegions,equalLowerHeights:true,allowZoomLabels:height<500};
  let first=await page.evaluate(auditNativeHome,{...contract,baselineFonts:baseline.viewports[`${width}x${height}`]||{}});
  await testInfo.attach('home-first-load.json',{body:JSON.stringify(first,null,2),contentType:'application/json'});
  await page.screenshot({path:testInfo.outputPath('home.png'),fullPage:false});
  expect(first.issues,JSON.stringify(first.issues)).toEqual([]);
  // Resize round trip must retain Home, names and complete bounds.
  await page.setViewportSize({width:width+60,height:height+40});
  await page.setViewportSize({width,height});
  const baselineFonts=Object.fromEntries(first.labels.filter(l=>l.tile).map(l=>[l.region,l.font]));
  await expect.poll(async()=>(await page.evaluate(auditNativeHome,{...contract,baselineFonts})).issues).toEqual([]);
  await page.locator('#studyFit').click();
  await expect.poll(async()=>(await page.evaluate(auditNativeHome,{...contract,baselineFonts})).issues).toEqual([]);
});
