const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const baseDir = path.join(process.cwd(), 'public', 'assets', 'bouquet');

async function processDirectory(dirName) {
  const fullDir = path.join(baseDir, dirName);
  if (!fs.existsSync(fullDir)) return;

  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.png'));
  console.log(`\nCompressing ${files.length} images in ${dirName}...`);

  for (const file of files) {
    const pngPath = path.join(fullDir, file);
    const webpName = file.replace(/\.png$/, '.webp');
    const webpPath = path.join(fullDir, webpName);

    const origSize = fs.statSync(pngPath).size;

    await sharp(pngPath)
      .webp({ quality: 82, alphaQuality: 90, effort: 5 })
      .toFile(webpPath);

    const newSize = fs.statSync(webpPath).size;
    const savings = Math.round((1 - newSize / origSize) * 100);
    console.log(`  ${file} -> ${webpName}: ${Math.round(origSize / 1024)}KB -> ${Math.round(newSize / 1024)}KB (${savings}% smaller)`);
  }
}

async function main() {
  console.log('--- Starting WebP Compression (Transparent Alpha Preserved) ---');
  await processDirectory('flowers');
  await processDirectory('greenery');
  await processDirectory('cards');
  await processDirectory('overlays');
  console.log('\nCompression complete!');
}

main().catch(console.error);
