# -*- coding: utf-8 -*-
"""SYNC TIMINGS: one stone, two birds.

handleSyncCueTimings rebuilds word-level timings for EVERY cue:
  - typed/edited text (local model gave text, no timestamps) gets
    char-weighted word timings inside its cue slot
  - degenerate cue durations get room to actually be spoken
So the drag timeline, preview and export all stay matched up.
Plus a SYNC TIMINGS button in the cue timeline header.
"""
import io

PATH = 'src/app/auto-captions/page.tsx'

with io.open(PATH, 'r', encoding='utf-8', newline='') as f:
    raw = f.read()
is_crlf = '\r\n' in raw
src = raw.replace('\r\n', '\n')

# ── 1. handler, inserted before handleExecuteFindReplace ─────────────────────
ANCHOR_FN = "    const handleExecuteFindReplace = () => {\n"

HANDLER = """    // One stone, two birds: rebuild word-level timings for EVERY cue.
    // Cues whose text was typed or edited by hand (the local model can get
    // the text but not real timestamps) get char-weighted word timings
    // inside their slot, and degenerate cue durations get room to actually
    // be spoken — so the drag timeline, preview and export stay in sync.
    const handleSyncCueTimings = () => {
        setCues((prev) => {
            const next = prev.map((c) => {
                const textWords = c.text.trim().split(/\\s+/).filter(Boolean);
                if (textWords.length === 0) return c;
                const minSpan = Math.max(0.4, textWords.length * 0.28);
                const end = c.end - c.start < minSpan ? parseFloat((c.start + minSpan).toFixed(2)) : c.end;
                const span = Math.max(0.05, end - c.start);
                const totalChars = textWords.reduce((s, w) => s + w.length, 0) || 1;
                let t = c.start;
                const words = textWords.map((w) => {
                    const ws = parseFloat(t.toFixed(3));
                    t = Math.min(end, t + Math.max(0.06, (w.length / totalChars) * span));
                    return { word: w, start: ws, end: parseFloat(t.toFixed(3)) };
                });
                return { ...c, end, words };
            });
            const vtt = generateVtt(next);
            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
            try {
                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

"""

n = src.count(ANCHOR_FN)
assert n == 1, 'handleExecuteFindReplace anchor x%d' % n
src = src.replace(ANCHOR_FN, HANDLER + ANCHOR_FN, 1)
print('  OK sync handler')

# ── 2. SYNC TIMINGS button in the timeline header ────────────────────────────
ANCHOR_SPAN = "                                                    <span>{overlayCurrentTime.toFixed(1)} / {trackDur.toFixed(1)}s</span>\n"

BUTTON = """                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span>{overlayCurrentTime.toFixed(1)} / {trackDur.toFixed(1)}s</span>
                                                        <button
                                                            type="button"
                                                            onClick={handleSyncCueTimings}
                                                            title="Rebuild word-level timings for every cue — fixes manually typed or edited text so the karaoke reveal matches the timeline"
                                                            style={{
                                                                padding: '1px 6px',
                                                                border: '1.5px solid #000',
                                                                background: '#FFE500',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                fontSize: '0.56rem',
                                                                color: '#000',
                                                                borderRadius: 3,
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase',
                                                            }}
                                                        >
                                                            SYNC TIMINGS
                                                        </button>
                                                    </div>
"""

n = src.count(ANCHOR_SPAN)
assert n == 1, 'header span anchor x%d' % n
src = src.replace(ANCHOR_SPAN, BUTTON, 1)
print('  OK sync button')

out = src.replace('\n', '\r\n') if is_crlf else src
with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(out)
print('page.tsx written')
