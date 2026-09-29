# NO CUE LEFT BEHIND: the cue timeline must render EVERY cue as a visible,
# draggable card. Fixes: (1) trackDur now spans all cue ends (audio metadata
# can be shorter than the cues), (2) negative / NaN cue timestamps are
# normalized at render time, (3) lane packing runs in time order so dragged
# cues still pack cleanly, (4) drag origin uses normalized start.
import io

PATH = 'src/app/auto-captions/page.tsx'
raw = io.open(PATH, 'r', encoding='utf-8', newline='').read()
is_crlf = '\r\n' in raw
src = raw.replace('\r\n', '\n')


def sub_once(text, old, new, name):
    n = text.count(old)
    assert n == 1, '%s anchor x%d' % (name, n)
    return text.replace(old, new, 1)


def indent_of(text, needle):
    idx = text.find(needle)
    assert idx != -1
    ls = text.rfind('\n', 0, idx) + 1
    return text[ls:idx]


# ── 1. normalized geometry + all-spanning trackDur ───────────────────────────
OLD_TRACKDUR = "const trackDur = Math.max(1, audioDuration || cues[cues.length - 1].end);"
assert src.count(OLD_TRACKDUR) == 1, 'trackDur anchor x%d' % src.count(OLD_TRACKDUR)
ind = indent_of(src, OLD_TRACKDUR)
NEW_TRACKDUR = (
    "// Normalized cue geometry: clamp negative starts, repair NaN/degenerate\n"
    + ind + "// timestamps — guarantees EVERY cue renders a visible, draggable card.\n"
    + ind + "const norm = cues.map((c) => {\n"
    + ind + "    const st = Number.isFinite(c.start) ? Math.max(0, c.start) : 0;\n"
    + ind + "    const en = Number.isFinite(c.end) && c.end > st ? c.end : st + 2;\n"
    + ind + "    return { st, en, text: c.text };\n"
    + ind + "});\n"
    + ind + "// Track must span every cue end (audio metadata can be shorter).\n"
    + ind + "const trackDur = Math.max(1, audioDuration || 0, norm.reduce((m, n) => Math.max(m, n.en), 0));"
)
src = sub_once(src, OLD_TRACKDUR, NEW_TRACKDUR, 'trackDur')
print('  OK trackDur spans all cues + norm geometry')

# ── 2. time-sorted lane packing over norm ────────────────────────────────────
OLD_PACK = (
    "const laneEnds: number[] = [];\n"
    + ind + "const laneOf = cues.map((c) => {\n"
    + ind + "    const leftPx = (c.start / trackDur) * basePx;\n"
    + ind + "    const wPx = Math.max((Math.max(0.05, c.end - c.start) / trackDur) * basePx, textPx(c.text));\n"
    + ind + "    let lane = laneEnds.findIndex((end) => leftPx >= end + CARD_GAP);\n"
    + ind + "    if (lane === -1) {\n"
    + ind + "        lane = laneEnds.length;\n"
    + ind + "        laneEnds.push(0);\n"
    + ind + "    }\n"
    + ind + "    laneEnds[lane] = leftPx + wPx;\n"
    + ind + "    return lane;\n"
    + ind + "});"
)
NEW_PACK = (
    "// Pack lanes in TIME order (dragging a cue earlier must not interleave\n"
    + ind + "// lanes) and key results back to the original cue index.\n"
    + ind + "const laneEnds: number[] = [];\n"
    + ind + "const laneOf: number[] = new Array(cues.length).fill(0);\n"
    + ind + "cues.map((_, k) => k)\n"
    + ind + "    .sort((a, b) => (norm[a].st - norm[b].st) || (a - b))\n"
    + ind + "    .forEach((k) => {\n"
    + ind + "        const leftPx = (norm[k].st / trackDur) * basePx;\n"
    + ind + "        const wPx = Math.max(((norm[k].en - norm[k].st) / trackDur) * basePx, textPx(norm[k].text));\n"
    + ind + "        let lane = laneEnds.findIndex((end) => leftPx >= end + CARD_GAP);\n"
    + ind + "        if (lane === -1) {\n"
    + ind + "            lane = laneEnds.length;\n"
    + ind + "            laneEnds.push(0);\n"
    + ind + "        }\n"
    + ind + "        laneEnds[lane] = leftPx + wPx;\n"
    + ind + "        laneOf[k] = lane;\n"
    + ind + "    });"
)
src = sub_once(src, OLD_PACK, NEW_PACK, 'lane packing')
print('  OK time-sorted lane packing')

# ── 3. render math from norm ─────────────────────────────────────────────────
# The render block lives deeper in the JSX than the IIFE body (and the user
# re-nests it while editing live) — derive its own indentation dynamically.
RENDER_FIRST = "const len = Math.max(0.05, c.end - c.start);"
assert src.count(RENDER_FIRST) == 1, 'render first line x%d' % src.count(RENDER_FIRST)
ind2 = indent_of(src, RENDER_FIRST)
OLD_RENDER = (
    RENDER_FIRST + "\n"
    + ind2 + "const posStart = cueDragView && cueDragView.index === i ? cueDragView.newStart : c.start;\n"
    + ind2 + "const leftPct = Math.min(99, (posStart / trackDur) * 100);\n"
    + ind2 + "const widthPct = Math.max(0.8, (len / trackDur) * 100);"
)
NEW_RENDER = (
    "const len = Math.max(0.05, norm[i].en - norm[i].st);\n"
    + ind2 + "const rawStart = cueDragView && cueDragView.index === i ? cueDragView.newStart : norm[i].st;\n"
    + ind2 + "const posStart = Number.isFinite(rawStart) ? Math.max(0, Math.min(trackDur - 0.05, rawStart)) : 0;\n"
    + ind2 + "const leftPct = Math.min(99.2, (posStart / trackDur) * 100);\n"
    + ind2 + "const widthPct = Math.max(0.8, (len / trackDur) * 100);"
)
src = sub_once(src, OLD_RENDER, NEW_RENDER, 'render math')
print('  OK render math normalized')

# ── 4. drag origin from norm ─────────────────────────────────────────────────
src = sub_once(src, "origStart: c.start,", "origStart: norm[i].st,", 'drag origStart')
print('  OK drag origin normalized')

out = src.replace('\n', '\r\n') if is_crlf else src
io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
print('page.tsx written')
