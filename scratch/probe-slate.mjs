/* Probe: why is .slate-strike-actions zero-width at 390px? Dumps ancestor chain. */
import puppeteer from 'puppeteer-core';

const b = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run'],
});
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await p.goto('http://localhost:3000/sync-slate', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));

const out = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('STRIKE CLAPPER'));
  if (!btn) return { error: 'no strike button' };
  const chain = [];
  let n = btn;
  while (n && n !== document.body) {
    const cs = getComputedStyle(n);
    chain.push({
      tag: n.tagName,
      cls: String(n.className).slice(0, 44),
      disp: cs.display,
      w: cs.width,
      gridCols: (cs.gridTemplateColumns || '').slice(0, 60),
      flexBasis: cs.flexBasis,
      minW: cs.minWidth,
      rectW: Math.round(n.getBoundingClientRect().width),
    });
    n = n.parentElement;
  }
  return {
    docW: document.documentElement.clientWidth,
    strikeCount: [...document.querySelectorAll('button')].filter((b) => b.textContent.includes('STRIKE CLAPPER')).length,
    chain,
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
