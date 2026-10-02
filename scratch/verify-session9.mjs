/* Session 9 verification — external ad gate, drawer z-fix, sync-slate persistence + mobile layout.
 * All clicks are DOM-level el.click() to avoid puppeteer clickablePoint flakiness.
 * Run: node scratch/verify-session9.mjs   (dev server on :3000) */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

const domClick = (page, expr) => page.evaluate((src) => { const el = eval(src); if (!el) throw new Error('click target missing: ' + src); el.click(); return true; }, expr);

async function main() {
  // Dev server sanity
  const res = await fetch(BASE + '/sync-slate', { method: 'HEAD' }).catch(() => null);
  check('dev server up', !!res && res.status < 500, `status=${res?.status}`);
  if (!res) return;

  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-first-run'] });

  //────────────────────────── MOBILE PAGE ──────────────────────────
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  m.on('pageerror', (e) => console.log('  [mobile pageerror]', e.message));

  await m.goto(BASE + '/sync-slate', { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1200); // hydration

  // A. Drawer covers camera rig (z-index + hit tests)
  await m.waitForSelector('button.tool-layout-mobile-sidebar-toggle', { timeout: 15000, visible: true });
  await domClick(m, `document.querySelector('button.tool-layout-mobile-sidebar-toggle')`);
  await sleep(500); // slide-in
  const drawerInfo = await m.evaluate(() => {
    const d = document.querySelector('.tool-layout-mobile-sidebar');
    const o = document.querySelector('.tool-layout-mobile-sidebar-overlay');
    const cs = getComputedStyle(d);
    const points = [[130, 300], [130, 500], [200, 700]].map(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return !!el && !!el.closest('.tool-layout-mobile-sidebar');
    });
    return { z: cs.zIndex, left: cs.left, overlayZ: o ? getComputedStyle(o).zIndex : null, points };
  });
  check('A1 drawer z=241', drawerInfo.z === '241', `z=${drawerInfo.z}`);
  check('A2 overlay z=240', drawerInfo.overlayZ === '240', `z=${drawerInfo.overlayZ}`);
  check('A3 drawer slid in', drawerInfo.left === '0px', `left=${drawerInfo.left}`);
  check('A4 drawer wins hit-tests (camera rig covered)', drawerInfo.points.every(Boolean), JSON.stringify(drawerInfo.points));

  // Close drawer
  await domClick(m, `document.querySelector('.tool-layout-mobile-sidebar button[aria-label="Close tools navigation"]')`);
  await sleep(400);

  // B. IndexedDB persistence — marker edit + one logged take, then reload
  await m.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find((i) => i.value === 'CREATOR HERO EP.01');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, 'PERSIST-TEST-9X');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await domClick(m, `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('STRIKE CLAPPER'))`);
  await sleep(2000); // debounce 600ms + IDB write
  await m.reload({ waitUntil: 'networkidle2', timeout: 90000 });
  // poll for hydration restore (up to 8s) instead of a fixed sleep
  await m.waitForFunction(() => [...document.querySelectorAll('input')].some((i) => i.value === 'PERSIST-TEST-9X'), { timeout: 8000, polling: 250 }).catch(() => {});
  await sleep(300);
  const restored = await m.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find((i) => i.value === 'PERSIST-TEST-9X');
    const tally = [...document.querySelectorAll('span, div')].some((el) => el.textContent.trim().startsWith('2 Takes Recorded'));
    return { marker: !!inp, takes2: tally };
  });
  check('B1 production marker survives reload', restored.marker);
  check('B2 logged take survives reload', restored.takes2);

  // B3. RESET wipes memory (confirm auto-accepted)
  await m.evaluate(() => { window.confirm = () => true; });
  await domClick(m, `document.querySelector('button[title^="Clear saved state"]')`);
  await sleep(400);
  const afterReset = await m.evaluate(() => ({
    default: [...document.querySelectorAll('input')].some((i) => i.value === 'CREATOR HERO EP.01'),
    takes1: [...document.querySelectorAll('span, div')].some((el) => el.textContent.trim().startsWith('1 Takes Recorded')),
  }));
  check('B3a RESET restores defaults', afterReset.default);
  check('B3b RESET clears take log', afterReset.takes1);
  await sleep(1400); // defaults re-saved (debounced)
  await m.reload({ waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1200);
  const afterReload = await m.evaluate(() => ({
    default: [...document.querySelectorAll('input')].some((i) => i.value === 'CREATOR HERO EP.01'),
    marker: [...document.querySelectorAll('input')].some((i) => i.value === 'PERSIST-TEST-9X'),
  }));
  check('B4 wiped state stays wiped after reload', afterReload.default && !afterReload.marker);

  // D. Mobile slate layout — calibration 2 rows, desktop-only rows hidden
  const slateLayout = await m.evaluate(() => {
    const strip = document.querySelector('.slate-cal-strip');
    const patches = strip ? [...strip.children] : [];
    const twoRows = patches.length >= 6 && patches[5].getBoundingClientRect().top > patches[0].getBoundingClientRect().top + 5;
    const hl = document.querySelector('.slate-head-leader');
    const row = document.querySelector('.slate-strike-actions');
    const calSub = document.querySelector('.slate-cal-sub');
    return {
      twoRows,
      headLeaderDisplay: hl ? getComputedStyle(hl).display : 'missing',
      strikeRowDisplay: row ? getComputedStyle(row).display : 'missing',
      calSubDisplay: calSub ? getComputedStyle(calSub).display : 'missing',
    };
  });
  check('D1 calibration strip wraps to 2 rows', slateLayout.twoRows);
  check('D2 head-leader hidden on mobile', slateLayout.headLeaderDisplay === 'none', `display=${slateLayout.headLeaderDisplay}`);
  check('D3 strike-actions row hidden (clapper head is the touch strike)', slateLayout.strikeRowDisplay === 'none', `display=${slateLayout.strikeRowDisplay}`);
  check('D4 cal-sub footnote hidden on mobile', slateLayout.calSubDisplay === 'none', `display=${slateLayout.calSubDisplay}`);

  // C. External ad gate — drawer link → interstitial → skip → banner (session-once)
  await m.evaluate(() => {
    window.__opened = [];
    window.open = (u) => { window.__opened.push(String(u)); return null; };
  });
  await domClick(m, `document.querySelector('button.tool-layout-mobile-sidebar-toggle')`);
  await sleep(500);
  await domClick(m, `document.querySelector('.tool-layout-mobile-sidebar a[href^="/redirect"]')`);
  await sleep(400);
  const gate1 = await m.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { open: false };
    const btns = [...dlg.querySelectorAll('button')];
    const cont = btns.find((b) => b.textContent.includes('CONTINUE'));
    return {
      open: true,
      sponsored: dlg.textContent.includes('SPONSORED'),
      countdown: cont ? cont.textContent.trim() : null,
      disabled: cont ? cont.disabled : null,
      stayed: !location.pathname.startsWith('/redirect'),
    };
  });
  check('C1 interstitial opens on mobile external click', gate1.open && gate1.stayed);
  check('C2 interstitial branded SPONSORED', gate1.sponsored);
  check('C3 CONTINUE blocked by countdown', gate1.disabled === true && /CONTINUE IN/.test(gate1.countdown || ''), gate1.countdown);
  await domClick(m, `document.querySelector('[role="dialog"] button[aria-label="Skip ad and continue"]')`);
  await sleep(500);
  const afterSkip = await m.evaluate(() => ({
    gateGone: !document.querySelector('[role="dialog"]'),
    opened: window.__opened,
    banner: !!document.querySelector('.ck-mobile-ad-banner'),
    bannerText: document.querySelector('.ck-mobile-ad-banner')?.textContent || '',
  }));
  check('C4 skip closes gate + opens destination', afterSkip.gateGone && afterSkip.opened[0] === 'https://elevenlabs.io', JSON.stringify(afterSkip.opened));
  check('C5 bottom slide-up banner appears', afterSkip.banner && /AD/.test(afterSkip.bannerText));
  await domClick(m, `document.querySelector('.ck-mobile-ad-banner button[aria-label="Dismiss ad"]')`);
  await sleep(300);

  // session-once: second external click gates again but no banner after
  await domClick(m, `document.querySelector('.tool-layout-mobile-sidebar a[href^="/redirect"]')`);
  await sleep(300);
  await domClick(m, `document.querySelector('[role="dialog"] button[aria-label="Skip ad and continue"]')`);
  await sleep(400);
  const noRebanner = await m.evaluate(() => ({ banner: !!document.querySelector('.ck-mobile-ad-banner'), openedN: window.__opened.length }));
  check('C6 banner is once-per-session', noRebanner.openedN === 2 && !noRebanner.banner);

  //────────────────────────── DESKTOP PAGE ──────────────────────────
  const d = await browser.newPage();
  await d.setViewport({ width: 1280, height: 800 });
  await d.goto(BASE + '/compressor', { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(800);
  const rail = await d.evaluate(() => {
    const bar = document.querySelector('.tool-layout-desktop-sidebar');
    const ext = document.querySelector('.tool-layout-desktop-sidebar a[href^="/redirect"]');
    const r = ext ? ext.getBoundingClientRect() : null;
    return {
      railW: bar ? bar.getBoundingClientRect().width : 0,
      extW: r ? Math.round(r.width) : 0,
      extH: r ? Math.round(r.height) : 0,
      extText: ext ? ext.textContent.trim() : null,
      inside: bar && r ? r.left >= bar.getBoundingClientRect().left && r.right <= bar.getBoundingClientRect().right + 1 : false,
    };
  });
  check('E1 desktop rail still 52px collapsed', Math.round(rail.railW) === 52, `w=${rail.railW}`);
  check('E2 external rail item is icon-only 36×36', rail.extW === 36 && rail.extH === 36, `${rail.extW}×${rail.extH} text="${rail.extText}"`);
  check('E3 external item stays inside rail', rail.inside);

  // Desktop click goes to /redirect bridge, no gate
  await d.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await domClick(d, `document.querySelector('.tool-layout-desktop-sidebar a[href^="/redirect"]')`);
  await d.waitForFunction(() => location.pathname === '/redirect', { timeout: 20000 }).catch(() => {});
  await sleep(1200);
  const deskNav = await d.evaluate(() => ({
    onBridge: location.pathname === '/redirect',
    gate: !!document.querySelector('[role="dialog"]'),
    popups: (window.__opened || []).length,
  }));
  check('E4 desktop external → /redirect bridge (no gate, no popup)', deskNav.onBridge && !deskNav.gate && deskNav.popups === 0, JSON.stringify(deskNav));

  await browser.close();

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} checks passed${fails.length ? ' — ISSUES FOUND' : ' — ALL CLEAN'}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error('SCRIPT ERROR', e);
  process.exit(2);
});
