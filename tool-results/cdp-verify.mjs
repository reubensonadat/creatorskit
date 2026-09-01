/**
 * Verify the Business Suite mobile "Save Image" flow end-to-end:
 * - emulates a mobile device (UA + touch + viewport) so the adaptive button
 *   renders as "Save Image" and triggers the image export path
 * - hooks URL.createObjectURL to confirm a real PNG blob was produced
 * - fails on any console error (the old oklch crash) or missing download
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(HERE, 'chrome-profile-verify');
const PAGE_URL = process.argv[2] || 'http://localhost:3000/business';

mkdirSync(PROFILE, { recursive: true });

const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--disable-gpu',
    '--window-size=390,844',
    'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch('http://127.0.0.1:9225/json/list');
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
let downloadTriggered = false;

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
    if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        if (text.includes('CK_DOWNLOAD_TRIGGERED')) { downloadTriggered = true; return; }
        if (msg.params.type === 'error') events.push(`[console.error] ${text.substring(0, 500)}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        events.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`.substring(0, 500));
    }
};

await new Promise((r) => (ws.onopen = r));

await send('Runtime.enable');
await send('Page.enable');

// Mobile emulation: UA (drives the React mobile detection) + touch + viewport
await send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// Hook createObjectURL before any page script runs
await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
    (() => {
      const orig = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        if (blob && blob.type === 'image/png' && blob.size > 1000) {
          console.log('CK_DOWNLOAD_TRIGGERED size=' + blob.size);
        }
        return orig(blob);
      };
    })();
  `,
});

await send('Page.navigate', { url: PAGE_URL });

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
    console.log('Events:', events);
    chrome.kill();
    process.exit(1);
}
await sleep(2500);

// Confirm the adaptive button rendered as Save Image (mobile) and click it
const click = await send('Runtime.evaluate', {
    expression: `(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /save image/i.test(b.textContent || ''));
    if (!btns.length) return 'NO_SAVE_IMAGE_BUTTON';
    btns[0].scrollIntoView({ block: 'center' });
    btns[0].click();
    return 'CLICKED';
  })()`,
});
console.log('CLICK_RESULT:', click.result.value);

// Wait for capture (font embedding + rasterization)
for (let i = 0; i < 50; i++) {
    await sleep(500);
    if (downloadTriggered) break;
}

console.log('DOWNLOAD_TRIGGERED:', downloadTriggered);
console.log('CONSOLE_ERRORS (' + events.length + '):');
for (const e of events) console.log(' ', e);
console.log(downloadTriggered && events.length === 0 ? 'VERIFY: PASS' : 'VERIFY: FAIL');

chrome.kill();
process.exit(0);
