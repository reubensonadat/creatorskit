/**
 * Hit-test the thumbnail-lab TOOLS dropdown: position:fixed escapes the
 * scrollable header's overflow clip — prove it by checking the topmost
 * element at each menu item's center point is the item itself.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE + '/thumbnail-lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 5000));

await page.evaluate(() => {
    const tools = Array.from(document.querySelectorAll('header button')).find((b) => (b.textContent || '').includes('TOOLS'));
    tools?.click();
});
await new Promise((r) => setTimeout(r, 400));

const hits = await page.evaluate(() => {
    const m = document.querySelector('[role="menu"]');
    if (!m) return ['NO MENU'];
    return Array.from(m.querySelectorAll('button')).map((b) => {
        const r = b.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const top = el === b || b.contains(el);
        return `${(b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)} → ${top ? 'TOP ✓' : 'COVERED by ' + (el ? el.tagName + '.' + (el.getAttribute('class') || '').slice(0, 30) : 'null')}`;
    });
});
console.log(hits.join('\n'));
await browser.close();
console.log('DONE');
