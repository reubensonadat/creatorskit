/**
 * Deep probe: for each broken page, take the worst overflow element and print
 * its outerHTML + ancestor chain so we can locate the JSX source.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const PAGES = [
  '/match-cut',
  '/text-highlighter',
  '/resizer',
  '/sync-slate',
  '/bouquet',
  '/text-behind',
  '/quote-card',
  '/thumbnail-lab',
];

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
  } catch { /* keep going */ }
  const info = await page.evaluate(() => {
    const vw = window.innerWidth;
    const els = [...document.querySelectorAll('*')];
    const scored = els
      .map((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return null;
        const r = el.getBoundingClientRect();
        if (r.right <= vw + 1 || r.width < 40) return null;
        // prefer leaf-ish nodes: few children
        return { el, r, kids: el.childElementCount };
      })
      .filter(Boolean)
      .sort((a, b) => b.r.right - a.r.right || b.r.width - a.r.width);
    // group by right edge; take the deepest offender (fewest children among the widest right)
    const worst = scored.filter((s) => s.kids <= 3).slice(0, 3);
    return worst.map(({ el, r }) => {
      const chain = [];
      let n = el;
      for (let i = 0; i < 7 && n; i++) {
        const c = String(n.getAttribute && n.getAttribute('class') || '');
        chain.push(`<${n.tagName.toLowerCase()}${c ? ' class="' + c.slice(0, 70) + '"' : ''}>`);
        n = n.parentElement;
      }
      return {
        w: Math.round(r.width), right: Math.round(r.right),
        html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 260),
        chain: chain.join('\n   ↑ '),
      };
    });
  });
  console.log(`\n================ ${path} ================`);
  for (const o of info) {
    console.log(`\n[w=${o.w} right=${o.right}]`);
    console.log('   ' + o.html);
    console.log('   chain: ' + o.chain);
  }
  await page.close();
}

await browser.close();
