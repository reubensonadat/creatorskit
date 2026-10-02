/**
 * Probe v2 — answer three questions per broken page:
 *  1. Is the @media (max-width:768px) block applying? (sentinel computed styles)
 *  2. Which overflowing elements are CLIPPED bugs (no scrollable ancestor) vs intended scroll strips?
 *  3. For real bugs: the deepest element with an explicit width that forces the overflow.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const PAGES = ['/match-cut', '/text-highlighter', '/resizer', '/sync-slate', '/bouquet', '/thumbnail-lab', '/text-behind', '/quote-card'];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

for (const path of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));
  } catch { /* continue */ }

  const info = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out = { sentinels: {}, bugs: [] };

    // 1. media query sentinels
    const grid = document.querySelector('.matchcut-workspace-grid');
    const side = document.querySelector('.tool-layout-desktop-sidebar');
    const tpp = document.querySelector('.tool-page-padding');
    if (grid) out.sentinels.matchcutCols = getComputedStyle(grid).gridTemplateColumns;
    if (side) out.sentinels.desktopSidebar = getComputedStyle(side).display;
    if (tpp) out.sentinels.pagePaddingMaxW = getComputedStyle(tpp).maxWidth + ' / pad:' + getComputedStyle(tpp).padding;

    // 2 & 3. find clipped offenders
    const scrollableAnc = (el) => {
      let n = el.parentElement;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (/(auto|scroll|hidden)/.test(cs.overflowX)) return { kind: cs.overflowX, cls: (n.getAttribute('class') || '').slice(0, 50) };
        n = n.parentElement;
      }
      return null;
    };

    const seen = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width < 40) continue;
      // skip if a scrollable ancestor already accounted (intended strip)
      const sa = scrollableAnc(el);
      const key = sa ? 'SA:' + sa.cls : 'CLIPPED';
      if (sa && sa.kind !== 'hidden') continue;        // auto|scroll → intended strip
      if (sa && sa.kind === 'hidden') { /* hidden = clipped */ }
      // dedupe by approximate geometry+tag
      const k = el.tagName + Math.round(r.width) + key;
      if (seen.has(k)) continue;
      seen.add(k);
      // find deepest explicit-width descendant that drives min-content
      let driver = null;
      for (const d of el.querySelectorAll('*')) {
        const dcs = getComputedStyle(d);
        const dr = d.getBoundingClientRect();
        const wAttr = d.getAttribute('width');
        const explicit =
          (d.style.width && /\d{3,}px/.test(d.style.width)) ||
          (d.style.minWidth && /\d{3,}px/.test(d.style.minWidth)) ||
          (wAttr && parseInt(wAttr) > 300);
        if (explicit && (!driver || dr.width > driver.r)) {
          // only count if it's not inside another scrollable
          driver = { html: d.outerHTML.replace(/\s+/g, ' ').slice(0, 200), r: dr.width };
        }
      }
      out.bugs.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') || '').slice(0, 60),
        w: Math.round(r.width), over: Math.round(r.right - vw),
        clippedBy: sa ? `overflow-x:${sa.kind} on .${sa.cls}` : 'page clip (html/body overflow-x:hidden)',
        driver: driver ? driver.html : null,
        html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 160),
      });
    }
    out.bugs.sort((a, b) => b.over - a.over);
    out.bugs = out.bugs.slice(0, 5);
    return out;
  });

  console.log(`\n================ ${path} ================`);
  console.log(' sentinels:', JSON.stringify(info.sentinels));
  for (const b of info.bugs) {
    console.log(`\n [${b.clippedBy}] <${b.tag} .${b.cls}> w=${b.w} +${b.over}px`);
    console.log('   el: ' + b.html);
    if (b.driver) console.log('   driver: ' + b.driver);
  }
  await page.close();
}

await browser.close();
