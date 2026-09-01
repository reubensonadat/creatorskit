/**
 * Scan #printable-document for computed color values html2canvas cannot parse.
 * Defensive version: reports exceptions and returns JSON.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(HERE, 'chrome-profile-scan');
const PAGE_URL = process.argv[2] || 'http://localhost:3000/business';

mkdirSync(PROFILE, { recursive: true });

const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=9223',
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
            const res = await fetch('http://127.0.0.1:9223/json/list');
            const targets = await res.json();
            const page = targets.find((t) => t.type === 'page');
            if (page) return page.webSocketDebuggerUrl;
        } catch { }
        await sleep(500);
    }
    throw new Error('Chrome DevTools endpoint never came up');
}

const ws = new WebSocket(await getWsUrl());
let msgId = 0;
const pending = new Map();

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
    } catch { }
}
console.log('PAGE_READY:', ready);
await sleep(2000);

const expr = `
(() => {
  try {
    const root = document.getElementById('printable-document');
    if (!root) return JSON.stringify({ error: 'NO_ROOT' });
    const props = ['background-color','color','border-top-color','border-bottom-color','border-left-color','border-right-color','text-decoration-color'];
    const bad = [];
    const seen = new Set();
    const labelOf = (el) => {
      let cls = '';
      try { cls = typeof el.className === 'string' ? el.className : ''; } catch (e) {}
      return el.tagName.toLowerCase() + (cls ? '[' + cls.split(' ').slice(0, 6).join(' ') + ']' : '');
    };
    const check = (el) => {
      const cs = getComputedStyle(el);
      for (const prop of props) {
        const v = cs.getPropertyValue(prop);
        if (v && v !== 'none' && v !== 'transparent' && v.indexOf('rgb') !== 0 && v.charAt(0) !== '#') {
          const key = prop + '|' + v;
          if (seen.has(key)) continue;
          seen.add(key);
          bad.push({ prop: prop, value: v.substring(0, 90), el: labelOf(el) });
        }
      }
    };
    check(root);
    const all = root.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      check(all[i]);
      if (bad.length > 40) break;
    }
    return JSON.stringify({ count: all.length, bad: bad }, null, 1);
  } catch (e) {
    return JSON.stringify({ error: String(e && e.stack || e) });
  }
})()
`;

const scan = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
console.log('RAW:', JSON.stringify(scan).substring(0, 4000));

chrome.kill();
process.exit(0);
