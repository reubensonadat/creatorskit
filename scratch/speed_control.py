# -*- coding: utf-8 -*-
"""Playback speed control for the overlay preview (0.5x .. 2x).

Slow the audio to pinpoint exact moments while retiming on the cue
timeline. Captions follow automatically (preview loop reads
audio.currentTime); pitch is preserved; export is unaffected (frame-exact).
"""
import io

PATH = 'src/app/auto-captions/page.tsx'

with io.open(PATH, 'r', encoding='utf-8', newline='') as f:
    raw = f.read()
is_crlf = '\r\n' in raw
src = raw.replace('\r\n', '\n')

# ── 1. state ──────────────────────────────────────────────────────────────────
ST_OLD = "    const cueTrackScrollRef = useRef<HTMLDivElement | null>(null);\n"
ST_NEW = ("    const cueTrackScrollRef = useRef<HTMLDivElement | null>(null);\n"
          "    const [overlayPlaybackRate, setOverlayPlaybackRate] = useState<number>(1);\n")
n = src.count(ST_OLD)
assert n == 1, 'state anchor x%d' % n
src = src.replace(ST_OLD, ST_NEW, 1)
print('  OK state')

# ── 2. apply-rate effect ──────────────────────────────────────────────────────
EFF_OLD = "    const toggleOverlayPlayback = () => {\n"
EFF_NEW = """    // Apply playback rate to the overlay audio (pitch-preserved) whenever
    // it changes or a fresh audio element mounts.
    useEffect(() => {
        const audio = overlayAudioRef.current;
        if (!audio) return;
        audio.preservesPitch = true;
        audio.playbackRate = overlayPlaybackRate;
    }, [overlayPlaybackRate, audioUrl, overlayPlaying]);

    const toggleOverlayPlayback = () => {
"""
n = src.count(EFF_OLD)
assert n == 1, 'effect anchor x%d' % n
src = src.replace(EFF_OLD, EFF_NEW, 1)
print('  OK effect')

# ── 3. speed row, spliced before the timeline strip comment ──────────────────
SPEED_BLOCK = """                                    {/* Playback speed — slow the audio to pinpoint exact moments while retiming */}
                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>SPEED</span>
                                        {[0.5, 0.75, 1, 1.5, 2].map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setOverlayPlaybackRate(r)}
                                                title="Slow playback to pinpoint exact cue moments \u2014 captions follow automatically"
                                                style={{
                                                    padding: '2px 7px',
                                                    border: '1.5px solid #000',
                                                    background: overlayPlaybackRate === r ? '#000' : '#fff',
                                                    color: overlayPlaybackRate === r ? '#FFE500' : '#000',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    fontSize: '0.62rem',
                                                    cursor: 'pointer',
                                                    borderRadius: 3,
                                                }}
                                            >
                                                {r}\u00d7
                                            </button>
                                        ))}
                                    </div>

"""

marker = ' {/* Per-cue timeline strip'
m = src.find(marker)
assert m != -1, 'timeline comment marker missing'
m2 = src.rfind('\n', 0, m) + 1
src = src[:m2] + SPEED_BLOCK + src[m2:]
print('  OK speed row splice')

out = src.replace('\n', '\r\n') if is_crlf else src
with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(out)
print('page.tsx written')
