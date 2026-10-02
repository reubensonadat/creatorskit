/* Probe: floating SiteNav dropdown geometry at 390px on fullscreen + marketing pages. */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-first-run'] });
for (const route of ['/text-behind', '/thumbnail-lab', '/quote-card', '/bouquet']) {
  const p = await b.newPage();
  await p.setViewport({ width: route === '/bouquet' ? 360 : 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto('http://localhost:3000' + route, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1000);
  const pill = await p.$('button[aria-label="Open tools menu"]');
  if (!pill) {
    console.log(`${route}: no floating pill found`);
    await p.close();
    continue;
  }
  const pillRect = await pill.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top) };
  });
  await pill.evaluate((el) => el.click());
  await sleep(400);
  const drop = await p.evaluate(() => {
    const inp = document.querySelector('input[placeholder^="Search"]');
    if (!inp) return null;
    const panel = inp.closest('div');
    let n = panel;
    // walk to the outermost positioned ancestor panel
    while (n.parentElement && getComputedStyle(n.parentElement).position !== 'relative' && n.parentElement !== document.body) n = n.parentElement;
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), pos: cs.position, vw: document.documentElement.clientWidth };
  });
  console.log(`${route}: pill=${JSON.stringify(pillRect)} drop=${JSON.stringify(drop)} → cutOffRight=${drop ? drop.r > drop.vw : 'n/a'}`);
  await p.close();
}
await b.close();
