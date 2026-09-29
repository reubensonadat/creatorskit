# -*- coding: utf-8 -*-
"""CapCut-style lanes + 2 more kinetic presets.

page.tsx: card packing into lanes (no stacking), dynamic track height.
overlay-renderer.ts: add Neon Burst + Viral Violet kinetic presets.
"""
import io

def edit(path, edits):
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        raw = f.read()
    is_crlf = '\r\n' in raw
    src = raw.replace('\r\n', '\n')
    for label, old, new in edits:
        n = src.count(old)
        assert n == 1, "%s: %s anchor x%d" % (path, label, n)
        src = src.replace(old, new, 1)
        print("  OK %s" % label)
    out = src.replace('\n', '\r\n') if is_crlf else src
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print("%s written" % path)

# ── page.tsx ──────────────────────────────────────────────────────────────────

LANES_OLD = """                                        const basePx = Math.max(480, Math.ceil(trackDur * 24));
                                        // Widen the track so even the longest cue's full text fits
                                        const textPx = (t: string) => t.trim().length * 6 + 16;
                                        const neededPx = cues.reduce((mx, c) => Math.max(mx, Math.ceil((c.start / trackDur) * basePx + textPx(c.text))), 0);
                                        const innerWidth = `max(100%, ${Math.max(basePx, neededPx)}px)`;
"""

LANES_NEW = """                                        const basePx = Math.max(480, Math.ceil(trackDur * 24));
                                        // Full-text cards, CapCut-style lanes: each cue is a separate
                                        // card sized to show its entire text; a card that would overlap
                                        // the previous one gets its own lane (row) so no two cues ever
                                        // look like they appear at the same time.
                                        const CARD_GAP = 6;
                                        const textPx = (t: string) => t.trim().length * 6 + 16;
                                        const laneEnds: number[] = [];
                                        const laneOf = cues.map((c) => {
                                            const leftPx = (c.start / trackDur) * basePx;
                                            const wPx = Math.max((Math.max(0.05, c.end - c.start) / trackDur) * basePx, textPx(c.text));
                                            let lane = laneEnds.findIndex((end) => leftPx >= end + CARD_GAP);
                                            if (lane === -1) {
                                                lane = laneEnds.length;
                                                laneEnds.push(0);
                                            }
                                            laneEnds[lane] = leftPx + wPx;
                                            return lane;
                                        });
                                        const laneCount = Math.max(1, laneEnds.length);
                                        const trackH = laneCount * 37 + 16;
                                        const innerWidth = `max(100%, ${Math.max(basePx, ...laneEnds, 0) + 8}px)`;
"""

HEIGHT_OLD = """                                                            minWidth: '100%',
                                                            height: 50,
"""

HEIGHT_NEW = """                                                            minWidth: '100%',
                                                            height: trackH,
"""

BLOCK_OLD = """                                                                        position: 'absolute',
                                                                        top: 4,
                                                                        height: 32,
                                                                        left: `${leftPct}%`,
"""

BLOCK_NEW = """                                                                        position: 'absolute',
                                                                        top: 4 + laneOf[i] * 37,
                                                                        height: 32,
                                                                        left: `${leftPct}%`,
"""

# ── overlay-renderer.ts ──────────────────────────────────────────────────────

PRESETS_OLD = """        highlighterColor: '#F97316',
        springPhysics: true,
        bounceIntensity: 1.3,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
];
"""

PRESETS_NEW = """        highlighterColor: '#F97316',
        springPhysics: true,
        bounceIntensity: 1.3,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Kinetic variation 4: hot-pink active word on Poppins with the
        // hardest bounce in the family — pure neon shortform energy.
        id: 'neon-burst',
        name: 'Neon Burst',
        videoMode: 'kinetic-pop',
        fontFamily: 'poppins',
        fontSize: 62,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#EC4899',
        springPhysics: true,
        bounceIntensity: 1.35,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Kinetic variation 5: Roboto Black + violet active word — a
        // cooler, techy pop that still reads huge on any background.
        id: 'viral-violet',
        name: 'Viral Violet',
        videoMode: 'kinetic-pop',
        fontFamily: 'roboto-black',
        fontSize: 62,
        letterSpacing: -0.5,
        yPositionPercent: 71,
        pillBackground: 'dark',
        highlighterColor: '#A78BFA',
        springPhysics: true,
        bounceIntensity: 1.2,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
];
"""

if __name__ == '__main__':
    edit('src/app/auto-captions/page.tsx', [
        ('lanes', LANES_OLD, LANES_NEW),
        ('track-height', HEIGHT_OLD, HEIGHT_NEW),
        ('block-lane-top', BLOCK_OLD, BLOCK_NEW),
    ])
    edit('src/lib/captions/overlay-renderer.ts', [
        ('presets+2', PRESETS_OLD, PRESETS_NEW),
    ])
    print('done')
