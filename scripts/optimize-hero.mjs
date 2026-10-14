import sharp from 'sharp';
import fs from 'fs';

async function optimize() {
  const input = 'public/assets/text-behind/creators-behind-2532x1424.jpg';
  
  // 1. High-res WebP for desktop (1600w)
  await sharp(input)
    .resize(1600, null, { withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile('public/assets/text-behind/creators-hero.webp');
  
  // 2. Mobile WebP (800w)
  await sharp(input)
    .resize(800, null, { withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile('public/assets/text-behind/creators-hero-mobile.webp');

  // 3. Perfect OG Image (1200 x 630)
  await sharp(input)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile('public/og/home.jpg');

  await sharp(input)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .png({ quality: 85, compressionLevel: 8 })
    .toFile('public/og/home.png');

  console.log('Optimizations generated:');
  console.log('creators-hero.webp size:', fs.statSync('public/assets/text-behind/creators-hero.webp').size);
  console.log('creators-hero-mobile.webp size:', fs.statSync('public/assets/text-behind/creators-hero-mobile.webp').size);
  console.log('og/home.png size:', fs.statSync('public/og/home.png').size);
}

optimize().catch(console.error);
