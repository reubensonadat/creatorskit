/**
 * Verify the two newest fixes at 390px:
 *  1. /thumbnail-lab — TOOLS dropdown opens (4 items, fixed panel below header,
 *     not clipped), bottom bar is DARK (no longer white), chips still switch views.
 *  2. /compressor — file row after upload: name owns line 1 (ellipsis), size
 *     wraps below (multi-line allowed, nothing one-line-crammed).
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';

const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
});

/* ── 1. Thumbnail Lab ── */
{
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE + '/thumbnail-lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 5000));

    const toolbar = await page.evaluate(() => {
        const t = document.querySelector('.ck-mobile-editor-toolbar');
        if (!t) return null;
        const cs = getComputedStyle(t);
        return { bg: cs.backgroundColor, border: cs.borderTopColor, dark: t.classList.contains('ck-mobile-editor-toolbar--dark'), h: Math.round(t.getBoundingClientRect().height) };
    });
    console.log('toolbar:', JSON.stringify(toolbar));

    // Open TOOLS dropdown
    const opened = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('header button'));
        const tools = btns.find((b) => (b.textContent || '').includes('TOOLS'));
        if (!tools) return { ok: false, why: 'no TOOLS button' };
        tools.click();
        return { ok: true };
    });
    await new Promise((r) => setTimeout(r, 400));

    const menu = await page.evaluate(() => {
        const m = document.querySelector('[role="menu"]');
        if (!m) return null;
        const cs = getComputedStyle(m);
        const r = m.getBoundingClientRect();
        return {
            pos: cs.position, top: Math.round(r.top), right: Math.round(r.right), vw: window.innerWidth,
            itemCount: m.querySelectorAll('button').length,
            labels: Array.from(m.querySelectorAll('button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()),
            clippedByHeader: (() => {
                let n = m.parentElement;
                while (n && n !== document.body) {
                    const s = getComputedStyle(n);
                    if ((s.overflowX === 'auto' || s.overflowX === 'hidden' || s.overflowY === 'hidden') && s.position !== 'fixed') return n.tagName + '.' + (n.getAttribute('class') || '');
                    n = n.parentElement;
                }
                return null;
            })(),
        };
    });
    console.log('tools open:', JSON.stringify(opened));
    console.log('menu:', JSON.stringify(menu), menu && menu.right <= menu.vw && menu.top >= 0 && !menu.clippedByHeader ? '→ VISIBLE ✓' : '→ CHECK ✗');

    // Tap Shuffle item → runs + closes
    const itemRun = await page.evaluate(() => {
        const m = document.querySelector('[role="menu"]');
        if (!m) return 'menu gone';
        const item = Array.from(m.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Shuffle'));
        item?.click();
        return 'clicked';
    });
    await new Promise((r) => setTimeout(r, 400));
    const closed = await page.evaluate(() => (document.querySelector('[role="menu"]') ? 'still open' : 'closed ✓'));
    console.log('item run:', itemRun, '| dropdown after item tap:', closed);

    // Bottom bar chip still switches views
    const chip = await page.evaluate(() => {
        const t = document.querySelector('.ck-mobile-editor-toolbar');
        const c = Array.from(t?.querySelectorAll('button') || []).find((b) => (b.textContent || '').includes('Grader'));
        c?.click();
        return !!c;
    });
    await new Promise((r) => setTimeout(r, 500));
    const aside = await page.evaluate(() => {
        const a = document.querySelector('aside');
        if (!a) return null;
        const cs = getComputedStyle(a);
        return { display: cs.display, h: Math.round(a.getBoundingClientRect().height) };
    });
    console.log('chip tap found:', chip, '| aside:', JSON.stringify(aside));
    await page.close();
}

/* ── 2. Compressor ── */
{
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE + '/compressor', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));

    // Simulate a long-named file upload through the hidden file input
    const uploaded = await page.evaluate(async () => {
        const input = document.querySelector('input[type="file"]');
        if (!input) return 'no input';
        const res = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        const blob = await res.blob();
        const longName = 'my-super-long-summer-vacation-travel-vlog-finale-cut-002-final-FINAL.mp4.png';
        const file = new File([blob], longName, { type: 'image/png' });
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return 'ok';
    });
    await new Promise((r) => setTimeout(r, 2500));

    const row = await page.evaluate(() => {
        const rowEl = document.querySelector('.compressor-file-row');
        if (!rowEl) return null;
        const name = rowEl.querySelector('.compressor-file-name');
        const size = rowEl.querySelector('.compressor-file-size');
        const nr = name?.getBoundingClientRect();
        const sr = size?.getBoundingClientRect();
        return {
            rowW: Math.round(rowEl.getBoundingClientRect().width),
            nameBottom: nr ? Math.round(nr.bottom) : null,
            sizeTop: sr ? Math.round(sr.top) : null,
            sizeBelowName: nr && sr ? sr.top >= nr.bottom - 2 : null,
            sizeWhiteSpace: size ? getComputedStyle(size).whiteSpace : null,
            sizeText: (size?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
            sizeW: sr ? Math.round(sr.width) : null,
        };
    });
    console.log('\nupload:', uploaded);
    console.log('row:', JSON.stringify(row), row && row.sizeBelowName ? '→ name line 1, size below ✓' : '→ CHECK ✗');
    await page.close();
}

await browser.close();
console.log('\nDONE');
