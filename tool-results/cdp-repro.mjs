/**
 * Headless reproduction of the Business Suite "Save Image" error.
 * Drives Chrome via the DevTools Protocol (no external deps, Node >=22 WebSocket).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(HERE, 'chrome-profile');
const PAGE_URL = process.argv[2] || 'http://localhost:3000/business';
const WAIT_AFTER_CLICK_MS = Number(process.argv[3] || 20000);

mkdirSync(PROFILE, { recursive: true });

const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1440,2400',
    'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch('http://127.0.0.1:9222/json/list');
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
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        const text = msg.params.args
            .map((a) => a.value ?? a.description ?? '')
            .join(' ');
        events.push(`[console.${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        events.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`);
    }
};

await new Promise((r) => (ws.onopen = r));

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: PAGE_URL });

// Wait for the app to hydrate and the printable document to exist
let ready = false;
for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
        const { result } = await send('Runtime.evaluate', {
            expression: `!!document.getElementById('printable-document') && document.querySelectorAll('button').length > 10`,
        });
        if (result.value) { ready = true; break; }
    } catch { }
}
console.log('PAGE_READY:', ready);
if (!ready) {
    console.log('Page never became ready. Events so far:', events);
    chrome.kill();
    process.exit(1);
}

// Give fonts/effects a moment, then click the first "Save Image" button
await sleep(2500);
const click = await send('Runtime.evaluate', {
    expression: `(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /save image/i.test(b.textContent || ''));
    if (!btns.length) return 'NO_BUTTON_FOUND';
    btns[0].scrollIntoView({ block: 'center' });
    btns[0].click();
    return 'CLICKED (' + btns.length + ' matching buttons)';
  })()`,
});
console.log('CLICK_RESULT:', click.result.value);

await sleep(WAIT_AFTER_CLICK_MS);

console.log('===== CAPTURED ERRORS (' + events.length + ') =====');
for (const e of events) console.log(e.substring(0, 1500));
console.log('===== END =====');

chrome.kill();
process.exit(0);
