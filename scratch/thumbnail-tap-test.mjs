/**
 * Tap-test /thumbnail-lab mobile chips at 390px: does tapping Grader/Vars/Export
 * reveal the inspector aside? Screenshots + rect dumps before/after each tap.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

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

const dump = async (label) => {
    const info = await page.evaluate(() => {
        const toolbar = document.querySelector('.ck-mobile-editor-toolbar');
        const chips = toolbar ? Array.from(toolbar.querySelectorAll('button')).map((b) => ({
            label: (b.textContent || '').trim(),
            rect: b.getBoundingClientRect().toJSON(),
        })) : null;
        const asides = Array.from(document.querySelectorAll('aside')).map((a) => {
            const cs = getComputedStyle(a);
            const r = a.getBoundingClientRect();
            return { display: cs.display, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) };
        });
        return {
            toolbar: toolbar ? { bg: getComputedStyle(toolbar).backgroundColor, h: Math.round(toolbar.getBoundingClientRect().height) } : null,
            chips,
            asides,
        };
    });
    console.log(`\n===== ${label}`);
    console.log('toolbar:', JSON.stringify(info.toolbar));
    console.log('chips:', info.chips ? info.chips.map((c) => `${c.label}@${Math.round(c.rect.top)}x${Math.round(c.rect.height)}`).join(' | ') : 'MISSING');
    for (const a of info.asides) console.log(`aside disp=${a.display} ${a.w}x${a.h} top=${a.top} "${a.text}"`);
    await page.screenshot({ path: `scratch/tnl-${label}.png` });
};

await dump('initial');

for (const label of ['Grader', 'A/B Vars', 'Export']) {
    const clicked = await page.evaluate((lbl) => {
        const toolbar = document.querySelector('.ck-mobile-editor-toolbar');
        if (!toolbar) return false;
        const btn = Array.from(toolbar.querySelectorAll('button')).find((b) => (b.textContent || '').includes(lbl));
        if (!btn) return false;
        btn.click();
        return true;
    }, label);
    await new Promise((r) => setTimeout(r, 800));
    await dump(`tap-${label.replace(/[^a-z]/gi, '')}-${clicked ? 'ok' : 'NOBTN'}`);
}

await browser.close();
console.log('\nDONE');
