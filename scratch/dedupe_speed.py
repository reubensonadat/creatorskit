# Collapses the double-applied speed-control edits (script ran twice) into one
# copy each: state line, apply-rate effect, SPEED row. Also normalizes the
# stray double blank line left before handleExecuteFindReplace.
import io

PATH = 'src/app/auto-captions/page.tsx'
raw = io.open(PATH, 'r', encoding='utf-8', newline='').read()
is_crlf = '\r\n' in raw
src = raw.replace('\r\n', '\n')


def dedupe(text, pat, name):
    n = text.count(pat)
    if n == 1:
        print('  SKIP %s (already single)' % name)
        return text
    assert n == 2, '%s: expected 1-2 copies, found %d' % (name, n)
    doubled = pat + pat
    assert doubled in text, '%s: copies are not adjacent' % name
    return text.replace(doubled, pat, 1)


# 1. duplicated state line
P_STATE = "    const [overlayPlaybackRate, setOverlayPlaybackRate] = useState<number>(1);\n"
src = dedupe(src, P_STATE, 'state line')
print('  OK state line deduped')

# 2. duplicated apply-rate effect
P_EFFECT = (
    "    // Apply playback rate to the overlay audio (pitch-preserved) whenever\n"
    "    // it changes or a fresh audio element mounts.\n"
    "    useEffect(() => {\n"
    "        const audio = overlayAudioRef.current;\n"
    "        if (!audio) return;\n"
    "        audio.preservesPitch = true;\n"
    "        audio.playbackRate = overlayPlaybackRate;\n"
    "    }, [overlayPlaybackRate, audioUrl, overlayPlaying]);\n"
    "\n"
)
src = dedupe(src, P_EFFECT, 'apply-rate effect')
print('  OK effect deduped')

# 3. duplicated SPEED row JSX block
P_SPEED = (
    "                                    {/* Playback speed \u2014 slow the audio to pinpoint exact moments while retiming */}\n"
    "                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>\n"
    "                                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>SPEED</span>\n"
    "                                        {[0.5, 0.75, 1, 1.5, 2].map((r) => (\n"
    "                                            <button\n"
    "                                                key={r}\n"
    '                                                type="button"\n'
    "                                                onClick={() => setOverlayPlaybackRate(r)}\n"
    '                                                title="Slow playback to pinpoint exact cue moments \u2014 captions follow automatically"\n'
    "                                                style={{\n"
    "                                                    padding: '2px 7px',\n"
    "                                                    border: '1.5px solid #000',\n"
    "                                                    background: overlayPlaybackRate === r ? '#000' : '#fff',\n"
    "                                                    color: overlayPlaybackRate === r ? '#FFE500' : '#000',\n"
    "                                                    fontFamily: 'monospace',\n"
    "                                                    fontWeight: 900,\n"
    "                                                    fontSize: '0.62rem',\n"
    "                                                    cursor: 'pointer',\n"
    "                                                    borderRadius: 3,\n"
    "                                                }}\n"
    "                                            >\n"
    "                                                {r}\u00d7\n"
    "                                            </button>\n"
    "                                        ))}\n"
    "                                    </div>\n"
    "\n"
)
src = dedupe(src, P_SPEED, 'SPEED row')
print('  OK speed row deduped')

# 4. stray double blank line before handleExecuteFindReplace (tolerant)
P_BLANK_OLD = "    };\n\n\n    const handleExecuteFindReplace = () => {\n"
P_BLANK_NEW = "    };\n\n    const handleExecuteFindReplace = () => {\n"
if src.count(P_BLANK_OLD) == 1:
    src = src.replace(P_BLANK_OLD, P_BLANK_NEW, 1)
    print('  OK blank line normalized')
else:
    print('  SKIP blank line (x%d)' % src.count(P_BLANK_OLD))

# final sanity: exactly one of each remaining
assert src.count(P_STATE) == 1
assert src.count(P_EFFECT) == 1
assert src.count(P_SPEED) == 1
assert src.count('const handleSyncCueTimings') == 1

out = src.replace('\n', '\r\n') if is_crlf else src
io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
print('page.tsx written')
