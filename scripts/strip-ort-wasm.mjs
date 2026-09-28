#!/usr/bin/env node
/**
 * Post-build strip for Cloudflare Pages (chained after next-on-pages).
 *
 * onnxruntime-web bundles wasm binaries (up to 25.6 MiB) into
 * `.vercel/output/static/_next/static/media/` — Cloudflare Pages caps any
 * single file at 25 MiB, which fails the deploy at asset validation.
 *
 * whisper-worker.ts already points ORT at the jsDelivr CDN for these files
 * (env.backends.onnx.wasm.wasmPaths), so the bundled copies are dead weight.
 * This script deletes every `ort-wasm*.wasm` from the build output; the
 * platform then uploads a bundle that passes validation.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = '.vercel/output/static';
const found = [];

async function walk(dir) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return; // directory absent (unexpected layout) — nothing to strip
    }
    for (const entry of entries) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(p);
        } else if (/^ort-wasm.*\.wasm$/i.test(entry.name)) {
            found.push(p);
        }
    }
}

await walk(ROOT);

if (found.length === 0) {
    console.log('strip-ort-wasm: no bundled ort wasm found — nothing to do.');
    process.exit(0);
}

for (const file of found) {
    const s = await stat(file);
    await unlink(file);
    console.log(`strip-ort-wasm: removed ${file} (${(s.size / 1048576).toFixed(1)} MiB)`);
}
console.log(`strip-ort-wasm: done — ${found.length} file(s) removed, CDN serves them at runtime.`);
