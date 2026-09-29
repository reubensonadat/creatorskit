# Removes the accidentally-duplicated handleSyncCueTimings block (2nd copy).
import io

path = 'src/app/auto-captions/page.tsx'
raw = io.open(path, 'r', encoding='utf-8').read()
is_crlf = '\r\n' in raw
src = raw.replace('\r\n', '\n')

block = (
    "    // One stone, two birds: rebuild word-level timings for EVERY cue.\n"
    "    // Cues whose text was typed or edited by hand (the local model can get\n"
    "    // the text but not real timestamps) get char-weighted word timings\n"
    "    // inside their slot, and degenerate cue durations get room to actually\n"
    "    // be spoken — so the drag timeline, preview and export stay in sync.\n"
    "    const handleSyncCueTimings = () => {\n"
    "        setCues((prev) => {\n"
    "            const next = prev.map((c) => {\n"
    "                const textWords = c.text.trim().split(/\\s+/).filter(Boolean);\n"
    "                if (textWords.length === 0) return c;\n"
    "                const minSpan = Math.max(0.4, textWords.length * 0.28);\n"
    "                const end = c.end - c.start < minSpan ? parseFloat((c.start + minSpan).toFixed(2)) : c.end;\n"
    "                const span = Math.max(0.05, end - c.start);\n"
    "                const totalChars = textWords.reduce((s, w) => s + w.length, 0) || 1;\n"
    "                let t = c.start;\n"
    "                const words = textWords.map((w) => {\n"
    "                    const ws = parseFloat(t.toFixed(3));\n"
    "                    t = Math.min(end, t + Math.max(0.06, (w.length / totalChars) * span));\n"
    "                    return { word: w, start: ws, end: parseFloat(t.toFixed(3)) };\n"
    "                });\n"
    "                return { ...c, end, words };\n"
    "            });\n"
    "            const vtt = generateVtt(next);\n"
    "            setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));\n"
    "            try {\n"
    "                localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next));\n"
    "            } catch { }\n"
    "            return next;\n"
    "        });\n"
    "    };\n"
    "\n"
)

count = src.count(block)
assert count == 2, f"expected 2 copies of sync block, found {count}"
doubled = block + block
assert doubled in src, "the two copies are not adjacent — aborting"

src = src.replace(doubled, block, 1)
assert src.count(block) == 1

out = src.replace('\n', '\r\n') if is_crlf else src
io.open(path, 'w', encoding='utf-8', newline='').write(out)
print("OK: removed duplicate handleSyncCueTimings")
