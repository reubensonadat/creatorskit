/**
 * scripts/indexnow-submit.mjs
 *
 * IndexNow submission — tells Bing, Yandex, Seznam, Naver and (via their
 * shared endpoint) every participating engine about new/changed URLs the
 * moment they ship. Google does not use IndexNow; use GSC's "Request
 * Indexing" / sitemap resubmission for Google.
 *
 * One key per site. The key file is served from the site root
 * (https://creatorskit.win/<key>.txt) so engines can verify ownership.
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs                 # submit every sitemap URL
 *   node scripts/indexnow-submit.mjs /watermark /blog # submit specific paths
 *
 * Run AFTER the deploy is live (the key file must be reachable).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const SITE = 'https://creatorskit.win';
const KEY_FILE_STORE = path.join(process.cwd(), '.data', 'indexnow-key.txt');
const PUBLIC_KEY_FILE = () => path.join(process.cwd(), 'public', `${readKeySyncPlaceholder}.txt`);

let cachedKey = null;
function readKeySyncPlaceholder() {
    return cachedKey;
}

async function getKey() {
    if (cachedKey) return cachedKey;
    try {
        cachedKey = (await readFile(KEY_FILE_STORE, 'utf8')).trim();
    } catch {
        cachedKey = randomBytes(16).toString('hex');
        await mkdir(path.dirname(KEY_FILE_STORE), { recursive: true });
        await writeFile(KEY_FILE_STORE, cachedKey, 'utf8');
    }
    // The verification file must be served from the site root.
    await mkdir(path.join(process.cwd(), 'public'), { recursive: true });
    await writeFile(path.join(process.cwd(), 'public', `${cachedKey}.txt`), cachedKey, 'utf8');
    return cachedKey;
}

async function sitemapUrls() {
    const res = await fetch(`${SITE}/sitemap.xml`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
    const args = process.argv.slice(2);
    const urls = args.length
        ? args.map((p) => (p.startsWith('http') ? p : `${SITE}${p.startsWith('/') ? '' : '/'}${p}`))
        : await sitemapUrls();

    if (!urls.length) {
        console.error('No URLs to submit.');
        process.exit(1);
    }

    const key = await getKey();

    // IndexNow limit: 10,000 URLs per request — chunk defensively at 1,000.
    for (let i = 0; i < urls.length; i += 1000) {
        const chunk = urls.slice(i, i + 1000);
        const body = JSON.stringify({
            host: new URL(SITE).host,
            key,
            keyLocation: `${SITE}/${key}.txt`,
            urlList: chunk,
        });
        const res = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body,
        });
        // 200 = OK, 202 = accepted (key not verified yet — will retry on crawl)
        console.log(`chunk ${i / 1000 + 1}: ${res.status} ${res.statusText} (${chunk.length} URLs)`);
        if (!res.ok && res.status !== 202) {
            console.error(await res.text().catch(() => ''));
            process.exitCode = 1;
        }
    }
    console.log(`\nDone. Key file: public/${key}.txt (commit it — it must stay at site root).`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
