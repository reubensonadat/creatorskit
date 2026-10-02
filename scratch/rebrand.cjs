/**
 * One-shot rebrand sweep: CreatorKit → CreatorsKit (domain truth:
 * creatorskit.win). Preserves the internal TypeScript identifier
 * `CreatorKitProjectMetadata` so imports never break.
 *
 * Run from project root: node scratch/rebrand.cjs
 */
const fs = require('fs');
const path = require('path');

const roots = ['src'];
const exts = new Set(['.ts', '.tsx']);
const RX = /CreatorKit(?!ProjectMetadata)/g;

let filesChanged = 0;
let hits = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (exts.has(path.extname(p))) {
      const src = fs.readFileSync(p, 'utf8');
      const found = src.match(RX);
      if (found) {
        const out = src.replace(RX, 'CreatorsKit');
        fs.writeFileSync(p, out);
        filesChanged++;
        hits += found.length;
        console.log('rebranded:', p, `(${found.length})`);
      }
    }
  }
}

roots.forEach(walk);
console.log(`\ndone: ${filesChanged} files, ${hits} replacements`);
