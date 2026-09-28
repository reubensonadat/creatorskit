const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const assets = [
  // Flowers from digibouquet.net
  { url: 'https://digibouquet.net/assests/rose-removebg-preview.png', dir: 'flowers', name: 'net-rose' },
  { url: 'https://digibouquet.net/assests/peony-removebg-preview.png', dir: 'flowers', name: 'net-peony' },
  { url: 'https://digibouquet.net/assests/tulip-removebg-preview.png', dir: 'flowers', name: 'net-tulip' },
  { url: 'https://digibouquet.net/assests/daisy-removebg-preview.png', dir: 'flowers', name: 'net-daisy' },
  { url: 'https://digibouquet.net/assests/lily-removebg-preview.png', dir: 'flowers', name: 'net-lily' },
  { url: 'https://digibouquet.net/assests/orchid-removebg-preview.png', dir: 'flowers', name: 'net-orchid' },
  { url: 'https://digibouquet.net/assests/camellia-removebg-preview.png', dir: 'flowers', name: 'net-camellia' },
  { url: 'https://digibouquet.net/assests/lotus-removebg-preview.png', dir: 'flowers', name: 'net-lotus' },

  // Greenery
  { url: 'https://digibouquet.net/flower_assests/greenery_1.png', dir: 'greenery', name: 'net-leafy' },
  { url: 'https://digibouquet.net/flower_assests/greenery_2.png', dir: 'greenery', name: 'net-fern' },
  { url: 'https://digibouquet.net/flower_assests/greenery_3.png', dir: 'greenery', name: 'net-eucalyptus' },
  { url: 'https://digibouquet.net/flower_assests/greenery_4.png', dir: 'greenery', name: 'net-willow' },

  // Details
  { url: 'https://digibouquet.net/flower_assests/details_1.webp', dir: 'overlays', name: 'net-details' }
];

const baseOut = path.join(process.cwd(), 'public', 'assets', 'bouquet');

function fetchBuffer(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      } else {
        console.warn(`[FAIL ${res.statusCode}] ${url}`);
        resolve(null);
      }
    }).on('error', (err) => {
      console.error(`[ERROR] ${url}:`, err.message);
      resolve(null);
    });
  });
}

async function run() {
  console.log(`Downloading and compressing ${assets.length} items from digibouquet.net...`);

  for (const item of assets) {
    const targetDir = path.join(baseOut, item.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const buf = await fetchBuffer(item.url);
    if (!buf) continue;

    const outWebp = path.join(targetDir, `${item.name}.webp`);

    // If source is already webp and we just want to save it or recompress:
    if (item.url.endsWith('.webp')) {
      fs.writeFileSync(outWebp, buf);
      console.log(`[SAVED WEBP] ${item.dir}/${item.name}.webp (${Math.round(buf.length / 1024)} KB)`);
    } else {
      // Compress PNG -> WebP directly in memory, never saving huge PNG to disk!
      await sharp(buf)
        .webp({ quality: 82, alphaQuality: 90, effort: 5 })
        .toFile(outWebp);

      const newSize = fs.statSync(outWebp).size;
      console.log(`[COMPRESSED WEBP] ${item.dir}/${item.name}.webp: ${Math.round(buf.length / 1024)}KB -> ${Math.round(newSize / 1024)}KB`);
    }
  }

  console.log('\nAll digibouquet.net assets acquired & compressed directly to WebP!');
}

run().catch(console.error);
