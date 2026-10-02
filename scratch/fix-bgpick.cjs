/**
 * Repairs scratch/patch-quote-card.cjs:
 * 1. Normalizes any CRLF -> LF (apply_diff edits introduced \r\n).
 * 2. Replaces the brittle rep('bg-color-picker', find, repl) with an
 *    index-based inserter: find 'UPLOAD CUSTOM SUBJECT PNG', insert the
 *    pickers right after the following </button>. The pickers JSX is
 *    preserved from the old repl literal (minus the duplicated button head).
 */
const fs = require('fs');
const S = 'scratch/patch-quote-card.cjs';
let src = fs.readFileSync(S, 'utf8');

// 1. Normalize line endings globally (original write was LF; \r is contamination).
const hadCR = src.includes('\r');
src = src.replace(/\r\n/g, '\n');

// 2. Locate the block between markers 30 and 31.
const m30 = src.indexOf('/* 30. Card colour + format pickers');
const m31 = src.indexOf('/* 31. Empty-state:');
if (m30 === -1 || m31 === -1) {
    console.error('markers not found', m30, m31);
    process.exit(1);
}
const block = src.slice(m30, m31);

// Extract the repl literal (second backtick pair after the rep label).
const label = block.indexOf("rep('bg-color-picker',");
const t1 = block.indexOf('`', label);
const t2 = block.indexOf('`', t1 + 1);
const t3 = block.indexOf('`', t2 + 1);
const t4 = block.indexOf('`', t3 + 1);
if (t1 === -1 || t2 === -1 || t3 === -1 || t4 === -1) {
    console.error('template literals not found');
    process.exit(1);
}
let repl = block.slice(t3 + 1, t4);

// Strip the duplicated button head: keep everything after the first </button>.
const closeIdx = repl.indexOf('</button>');
if (closeIdx === -1) {
    console.error('no </button> in repl');
    process.exit(1);
}
const pickers = repl.slice(closeIdx + '</button>'.length); // starts with \n\n {/* Card background colour ...

const newBlock = [
    '/* 30. Card colour + format pickers after the custom-PNG button (index-based) */',
    'const CARD_PICKERS = `' + pickers + '`;',
    '',
    '(function () {',
    "    const anchor = 'UPLOAD CUSTOM SUBJECT PNG';",
    '    const i = src.indexOf(anchor);',
    "    const j = i === -1 ? -1 : src.indexOf('</button>', i);",
    '    if (i === -1 || j === -1) {',
    "        fails.push('bg-color-picker: anchor not found');",
    '        return;',
    '    }',
    "    const at = j + '</button>'.length;",
    '    src = src.slice(0, at) + CARD_PICKERS + src.slice(at);',
    '    ok++;',
    '})();',
    '',
].join('\n');

src = src.slice(0, m30) + newBlock + src.slice(m31);
fs.writeFileSync(S, src, 'utf8');
console.log('fixed. hadCR=', hadCR, 'pickers bytes=', pickers.length);
