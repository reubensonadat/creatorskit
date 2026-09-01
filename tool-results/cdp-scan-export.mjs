/**
 * Click "Save Image" and repeatedly scan #printable-document WHILE the export
 * is in flight, to capture the exact element + property html2canvas chokes on.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(HERE, 'chrome-profile-export');
const PAGE_URL = process.argv[2] || 'http://localhost:3000/business';

mkdirSync(PROFILE, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9224',
  `--user-data-dir=${PROFILE}`,
  '--no-first-run',
  '--disable-gpu',
  '--window-size=1440,2400',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/list');
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

const ws = new WebSocket(await getWsUrl());
let msgId = 0;
const pending = new Map();
const events = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.onmessage = (raw) => {
  const msg = JSON.parse(raw.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    events.push(`[console.error] ${text.substring(0, 300)}`);
  }
};

await new Promise((r) => (ws.onopen = r));
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: PAGE_URL });

let ready = false;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const { result } = await send('Runtime.evaluate', {
      expression: `!!document.getElementById('printable-document')`,
    });
    if (result.value) { ready = true; break; }
  } catch {}
}
console.log('PAGE_READY:', ready);
await sleep(2000);

// The scan expression: reports non-rgb computed colors in the capture subtree
const scanExpr = `
(() => {
  try {
    const root = document.getElementById('printable-document');
    if (!root) return 'NO_ROOT';
    const props = ['background-color','color','border-top-color','border-bottom-color','border-left-color','border-right-color','text-decoration-color'];
    const bad = [];
    const seen = new Set();
    const labelOf = (el) => {
      let cls = '';
      try { cls = typeof el.className === 'string' ? el.className : ''; } catch (e) {}
      const id = el.id ? '#' + el.id : '';
      return el.tagName.toLowerCase() + id + (cls ? '[' + cls.split(' ').slice(0, 6).join(' ') + ']' : '');
    };
    const check = (el) => {
      const cs = getComputedStyle(el);
      for (const prop of props) {
        const v = cs.getPropertyValue(prop);
        if (v && v !== 'none' && v !== 'transparent' && v.indexOf('rgb') !== 0 && v.charAt(0) !== '#') {
          const key = prop + '|' + v;
          if (seen.has(key)) continue;
          seen.add(key);
          bad.push(prop + ' = ' + v.substring(0, 60) + '  <-- ' + labelOf(el));
        }
      }
    };
    check(root);
    const all = root.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) check(all[i]);
    return bad.length ? bad.join('\\n') : 'CLEAN';
  } catch (e) {
    return 'ERR ' + String(e);
  }
})()
`;

// Click Save Image
const click = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /save image/i.test(b.textContent || ''));
    if (!btns.length) return 'NO_BUTTON';
    btns[0].click();
    return 'CLICKED';
  })()`,
});
console.log('CLICK_RESULT:', click.result.value);

// Scan repeatedly while export runs
const found = new Set();
for (let i = 0; i < 40; i++) {
  const { result } = await send('Runtime.evaluate', { expression: scanExpr, returnByValue: true });
  if (result.value && result.value !== 'CLEAN') {
    for (const line of result.value.split('\n')) found.add(line);
  }
  const saving = await send('Runtime.evaluate', {
    expression: `[...document.querySelectorAll('button')].some(b => /saving/i.test(b.textContent || ''))`,
  });
  if (!saving.result.value && i > 2) break;
  await sleep(250);
}

console.log('===== BAD COLORS DURING EXPORT =====');
for (const f of found) console.log(f);
console.log('===== CONSOLE ERRORS =====');
for (const e of events) console.log(e);
console.log('===== END =====');

chrome.kill();
process.exit(0);
