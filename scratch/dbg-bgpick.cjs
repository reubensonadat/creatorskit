const fs = require('fs');
const script = fs.readFileSync('scratch/patch-quote-card.cjs', 'utf8');
const file = fs.readFileSync('src/app/quote-card/page.tsx', 'utf8');

// Extract the bg-color-picker find string (first template literal after the rep label)
const label = script.indexOf("rep('bg-color-picker',");
const t1 = script.indexOf('`', label);
const t2 = script.indexOf('`', t1 + 1);
const find = script.slice(t1 + 1, t2);

const i = file.indexOf('UPLOAD CUSTOM SUBJECT PNG');
const region = file.slice(i - 400, i + 150);

console.log('=== FIND (JSON-escaped) ===');
console.log(JSON.stringify(find));
console.log('=== FILE REGION (JSON-escaped) ===');
console.log(JSON.stringify(region));
console.log('=== indexOf(find) in file ===', file.indexOf(find));
