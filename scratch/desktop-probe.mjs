import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:3000/resizer', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));
const out = await page.evaluate(() => {
    const vw = window.innerWidth;
    const list = [];
    for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 60 && el.childElementCount <= 2) {
            list.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.getAttribute('class') || '').slice(0, 50),
                w: Math.round(r.width), left: Math.round(r.left), over: Math.round(r.right - vw),
                text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
                parent: (el.parentElement && el.parentElement.getAttribute('class') || '').slice(0, 40),
            });
        }
    }
    return list.slice(0, 6);
});
for (const o of out) console.log(`<${o.tag} .${o.cls}> parent:.${o.parent} left=${o.left} w=${o.w} +${o.over}px "${o.text}"`);
await browser.close();
