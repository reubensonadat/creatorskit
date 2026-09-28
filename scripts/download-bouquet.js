const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
  // Flowers
  { url: 'https://digibouquet.app/local-assets/flowers/flower-rose-pink-v01.png', dir: 'flowers', name: 'rose-pink.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-peony-blush-v01.png', dir: 'flowers', name: 'peony-blush.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-tulip-rose-v01.png', dir: 'flowers', name: 'tulip-rose.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-lily-ivory-v01.png', dir: 'flowers', name: 'lily-ivory.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-orchid-lilac-v01.png', dir: 'flowers', name: 'orchid-lilac.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-sunflower-golden-v01.png', dir: 'flowers', name: 'sunflower-golden.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-ranunculus-blush-v01.png', dir: 'flowers', name: 'ranunculus-blush.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-carnation-blush-v01.png', dir: 'flowers', name: 'carnation-blush.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-camellia-pink-v01.png', dir: 'flowers', name: 'camellia-pink.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-lotus-blush-v01.png', dir: 'flowers', name: 'lotus-blush.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-daisy-cream-v01.png', dir: 'flowers', name: 'daisy-cream.png' },
  { url: 'https://digibouquet.app/local-assets/flowers/flower-african-daisy-coral-v01.png', dir: 'flowers', name: 'african-daisy-coral.png' },

  // Greenery
  { url: 'https://digibouquet.app/local-assets/greenery/greenery-watercolor-fern-fan-v01.png', dir: 'greenery', name: 'fern-fan.png' },
  { url: 'https://digibouquet.app/local-assets/greenery-clean/greenery-fern-illustration-v01.png', dir: 'greenery', name: 'fern-illustration.png' },
  { url: 'https://digibouquet.app/local-assets/greenery-clean/greenery-curled-frond-cluster-v01.png', dir: 'greenery', name: 'curled-frond.png' },
  { url: 'https://digibouquet.app/local-assets/greenery-clean/greenery-olive-branch-spray-v01.png', dir: 'greenery', name: 'olive-spray.png' },
  { url: 'https://digibouquet.app/local-assets/greenery-clean/greenery-berry-branch-mix-v01.png', dir: 'greenery', name: 'berry-branch.png' },
  { url: 'https://digibouquet.app/local-assets/greenery-clean/greenery-berry-bouquet-spray-v01.png', dir: 'greenery', name: 'berry-spray.png' },

  // Cards
  { url: 'https://digibouquet.app/local-assets/card-templates/card-classic-cream-v01.png', dir: 'cards', name: 'classic-cream.png' },
  { url: 'https://digibouquet.app/local-assets/card-templates/card-garden-party-v01.png', dir: 'cards', name: 'garden-party.png' },
  { url: 'https://digibouquet.app/local-assets/card-templates/card-watercolor-wash-v01.png', dir: 'cards', name: 'watercolor-wash.png' },
  { url: 'https://digibouquet.app/local-assets/card-templates/card-torn-vintage-v01.png', dir: 'cards', name: 'torn-vintage.png' },

  // Overlays
  { url: 'https://digibouquet.app/local-assets/overlays/overlay-ribbon-bouquet-wrap-v01.png', dir: 'overlays', name: 'ribbon-wrap.png' },
  { url: 'https://digibouquet.app/local-assets/overlays/overlay-soft-petal-fall-v01.png', dir: 'overlays', name: 'petal-fall.png' },

  // Backgrounds
  { url: 'https://digibouquet.app/app/theme-backgrounds/theme-soft-blush-v01.png', dir: 'backgrounds', name: 'soft-blush.png' }
];

const baseOut = path.join(process.cwd(), 'public', 'assets', 'bouquet');

function download(item) {
  return new Promise((resolve) => {
    const targetDir = path.join(baseOut, item.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const dest = path.join(targetDir, item.name);
    const file = fs.createWriteStream(dest);

    https.get(item.url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            try {
              const size = fs.statSync(dest).size;
              console.log(`[OK] ${item.dir}/${item.name} (${Math.round(size / 1024)} KB)`);
              resolve(true);
            } catch (err) {
              resolve(false);
            }
          });
        });
      } else {
        console.warn(`[FAIL ${res.statusCode}] ${item.url}`);
        file.close(() => {
          try { fs.unlinkSync(dest); } catch (e) {}
          resolve(false);
        });
      }
    }).on('error', (err) => {
      console.error(`[ERROR] ${item.url}:`, err.message);
      file.close(() => {
        try { fs.unlinkSync(dest); } catch (e) {}
        resolve(false);
      });
    });
  });
}

async function downloadWithRetry(item, retries = 3) {
  const dest = path.join(baseOut, item.dir, item.name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`[SKIP] Already exists: ${item.dir}/${item.name}`);
    return true;
  }
  for (let i = 0; i < retries; i++) {
    const success = await download(item);
    if (success) return true;
    console.log(`Retrying ${item.name} (${i + 1}/${retries})...`);
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function run() {
  console.log(`Starting download of ${assets.length} bouquet assets...`);
  for (const item of assets) {
    await downloadWithRetry(item);
  }
  console.log('All downloads finished!');
}

run();
