import re

filepath = 'src/app/auto-captions/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Undo2, Redo2 to lucide-react imports
if 'Undo2' not in content:
    content = content.replace(
        "import {\n    Upload,",
        "import {\n    Undo2,\n    Redo2,\n    Upload,"
    )

# 2. Add pastCues, futureCues and undo/redo handlers
undo_state_code = """    const [videoRenderProgress, setVideoRenderProgress] = useState(0);

    // Cue timeline undo/redo history stacks
    const [pastCues, setPastCues] = useState<SubtitleCue[][]>([]);
    const [futureCues, setFutureCues] = useState<SubtitleCue[][]>([]);

    const handleUndoCue = useCallback(() => {
        setPastCues((past) => {
            if (past.length === 0) return past;
            const previous = past[past.length - 1];
            const newPast = past.slice(0, -1);

            setCues((current) => {
                setFutureCues((future) => [current, ...future.slice(0, 40)]);
                const vtt = generateVtt(previous);
                setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(previous)); } catch { }
                return previous;
            });

            return newPast;
        });
    }, []);

    const handleRedoCue = useCallback(() => {
        setFutureCues((future) => {
            if (future.length === 0) return future;
            const next = future[0];
            const newFuture = future.slice(1);

            setCues((current) => {
                setPastCues((past) => [...past.slice(-40), current]);
                const vtt = generateVtt(next);
                setVttUrl(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
                try { localStorage.setItem(STORAGE_KEYS.CUES, JSON.stringify(next)); } catch { }
                return next;
            });

            return newFuture;
        });
    }, []);

    // Global keyboard shortcuts for Undo / Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    handleRedoCue();
                } else {
                    e.preventDefault();
                    handleUndoCue();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedoCue();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndoCue, handleRedoCue]);"""

if 'const [pastCues, setPastCues]' not in content:
    content = content.replace("    const [videoRenderProgress, setVideoRenderProgress] = useState(0);", undo_state_code, 1)

# 3. Update handleMoveCue to push to pastCues
old_move_cue = """    const handleMoveCue = (index: number, newStartSeconds: number) => {
        setCues((prev) => {
            const cue = prev[index];
            if (!cue) return prev;
            const len = Math.max(0.05, cue.end - cue.start);
            const newStart = Math.max(0, parseFloat(newStartSeconds.toFixed(2)));
            const appliedShift = newStart - cue.start;"""

new_move_cue = """    const handleMoveCue = (index: number, newStartSeconds: number) => {
        setCues((prev) => {
            const cue = prev[index];
            if (!cue) return prev;
            const len = Math.max(0.05, cue.end - cue.start);
            const newStart = Math.max(0, parseFloat(newStartSeconds.toFixed(2)));
            if (Math.abs(newStart - cue.start) < 0.01) return prev;
            setPastCues((past) => [...past.slice(-40), prev]);
            setFutureCues([]);
            const appliedShift = newStart - cue.start;"""

if old_move_cue in content:
    content = content.replace(old_move_cue, new_move_cue, 1)

# 4. Update handleSyncCueTimings to push to pastCues
old_sync_cue = """    const handleSyncCueTimings = () => {
        setCues((prev) => {
            const next = prev.map((c) => {"""

new_sync_cue = """    const handleSyncCueTimings = () => {
        setCues((prev) => {
            setPastCues((past) => [...past.slice(-40), prev]);
            setFutureCues([]);
            const next = prev.map((c) => {"""

if old_sync_cue in content:
    content = content.replace(old_sync_cue, new_sync_cue, 1)

# 5. Timeline header: Single line on desktop, 2 lines on mobile, small icon-only undo & redo buttons
old_timeline_header = """                                                <div style={{ fontSize: '0.56rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.02em' }}>
                                                    <span>CUE TIMELINE — DRAG TO RETIME · SCROLL → FOR MORE</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                                </div>"""

new_timeline_header = """                                                <div
                                                    style={{
                                                        fontSize: '0.56rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        color: '#000',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: '4px 8px',
                                                        letterSpacing: '0.02em',
                                                    }}
                                                >
                                                    {/* On desktop: left side of 1 line. On mobile: line 1 */}
                                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
                                                        <span>CUE TIMELINE — DRAG TO RETIME · SCROLL → FOR MORE</span>
                                                    </div>

                                                    {/* On desktop: right side of 1 line. On mobile: line 2 */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 'auto' }}>
                                                        <span style={{ whiteSpace: 'nowrap' }}>{overlayCurrentTime.toFixed(1)} / {trackDur.toFixed(1)}s</span>

                                                        {/* Small icon-only Undo button */}
                                                        <button
                                                            type="button"
                                                            onClick={handleUndoCue}
                                                            disabled={pastCues.length === 0}
                                                            title="Undo (Ctrl+Z)"
                                                            aria-label="Undo cue re-time"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 20,
                                                                height: 20,
                                                                padding: 0,
                                                                border: '1.5px solid #000',
                                                                background: pastCues.length > 0 ? '#fff' : '#f4f4f5',
                                                                color: pastCues.length > 0 ? '#000' : '#a1a1aa',
                                                                borderRadius: 3,
                                                                cursor: pastCues.length > 0 ? 'pointer' : 'not-allowed',
                                                                boxShadow: pastCues.length > 0 ? '1px 1px 0 #000' : 'none',
                                                                opacity: pastCues.length > 0 ? 1 : 0.45,
                                                            }}
                                                        >
                                                            <Undo2 size={11} strokeWidth={2.6} />
                                                        </button>

                                                        {/* Small icon-only Redo button */}
                                                        <button
                                                            type="button"
                                                            onClick={handleRedoCue}
                                                            disabled={futureCues.length === 0}
                                                            title="Redo (Ctrl+Y)"
                                                            aria-label="Redo cue re-time"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 20,
                                                                height: 20,
                                                                padding: 0,
                                                                border: '1.5px solid #000',
                                                                background: futureCues.length > 0 ? '#fff' : '#f4f4f5',
                                                                color: futureCues.length > 0 ? '#000' : '#a1a1aa',
                                                                borderRadius: 3,
                                                                cursor: futureCues.length > 0 ? 'pointer' : 'not-allowed',
                                                                boxShadow: futureCues.length > 0 ? '1px 1px 0 #000' : 'none',
                                                                opacity: futureCues.length > 0 ? 1 : 0.45,
                                                            }}
                                                        >
                                                            <Redo2 size={11} strokeWidth={2.6} />
                                                        </button>

                                                        {/* Sync timings button */}
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
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '1px 1px 0 #000',
                                                            }}
                                                        >
                                                            SYNC TIMINGS
                                                        </button>
                                                    </div>
                                                </div>"""

if old_timeline_header in content:
    content = content.replace(old_timeline_header, new_timeline_header, 1)
else:
    print("WARNING: old_timeline_header not matched exactly")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied responsive cue timeline header with small icon-only undo and redo buttons!")
