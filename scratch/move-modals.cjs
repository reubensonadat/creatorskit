#!/usr/bin/env node
/**
 * scratch/move-modals.cjs — phone-test batch surgery for src/app/teleprompter/page.tsx
 *
 * 1. mirrorLink payload gains `e: eyelinePercent / 100` (failed apply_diff block, re-applied here).
 * 2. Take-prompt + CREW modals move OUT of `{mobileControlsOpen && …}` to stage level
 *    (transport-fragment siblings, before the desktop dock) — restyled as slide-up
 *    bottom sheets. Fixes: pill SECOND SCREEN dead until sheet opened; desktop CREW
 *    dead; take-prompt invisible on take end with sheet closed.
 * 3. EYELINE LEVEL stepper (− % +, clamp 15–65) inserted in the FILM MODE sheet
 *    under the EYELINE ON/OFF grid, gated on cameraActive && showEyelineGuide.
 *
 * Every mutation is marker-verified; any mismatch aborts WITHOUT writing.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'teleprompter', 'page.tsx');
const raw = fs.readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

const fail = (msg) => {
  console.error('ABORT — ' + msg);
  process.exit(1);
};
const findIdx = (needle, from = 0) => lines.findIndex((l, i) => i >= from && l.includes(needle));

/* ── 1. mirrorLink payload: add eyeline ratio ─────────────────────────── */
{
  const i = findIdx('JSON.stringify({ s: script, v: speed, f: fontSize })');
  if (i < 0) fail('mirrorLink payload line not found');
  if (findIdx('JSON.stringify({ s: script, v: speed, f: fontSize })', i + 1) >= 0) fail('mirrorLink payload line not unique');
  lines[i] = lines[i].replace(
    'JSON.stringify({ s: script, v: speed, f: fontSize })',
    'JSON.stringify({ s: script, v: speed, f: fontSize, e: eyelinePercent / 100 })',
  );
  console.log('1. mirrorLink payload: e added at line ' + (i + 1));
}

/* ── 2. Delete sheet-nested take-prompt + CREW blocks ─────────────────── */
const takeStart = findIdx('{/* End-of-take prompt: downloads live only in this tab');
const crewStart = findIdx('{/* CREW MODE — script mirror to a second screen */}');
const afterCrew = findIdx('{/* Recorded Audio Download / Preview Player (If available) */}');
if (takeStart < 0 || crewStart < 0 || afterCrew < 0) fail('modal block markers missing');
if (!(takeStart < crewStart && crewStart < afterCrew)) fail('modal block markers out of order');
// Blocks span takeStart..(afterCrew-1); keep exactly one blank line before the Recorded Audio comment.
const deletedCount = afterCrew - 1 - takeStart + 1; // lines takeStart..afterCrew-1
if (lines[afterCrew - 1].trim() !== '') fail('line before Recorded Audio comment is not blank');
const removed = lines.splice(takeStart, afterCrew - 1 - takeStart);
// After splice: [Scroll Mode </div>][blank][Recorded Audio comment] — exactly one blank remains
// (the blank that originally separated the CREW block from the Recorded Audio comment).
console.log('2. removed ' + removed.length + ' lines of nested modals (old lines ' + (takeStart + 1) + '–' + (takeStart + removed.length) + ')');
if (!removed[0].includes('End-of-take prompt')) fail('removed block start mismatch');
const lastNonBlank = removed.filter((l) => l.trim() !== '').pop();
if (!lastNonBlank || lastNonBlank.trim() !== ')}') fail('removed block end mismatch — last non-blank: ' + JSON.stringify(lastNonBlank));
if (lines[takeStart].trim() === '' && lines[takeStart + 1].trim() === '') lines.splice(takeStart, 1);

/* ── 3. Insert stage-level slide-up modals before the desktop dock ────── */
const dock = findIdx('Desktop Studio Floating Transport Dock');
if (dock < 0) fail('dock comment not found');
if (lines[dock - 1].trim() !== '') fail('dock comment not preceded by blank line');
if (!lines[dock - 2].includes('</>')) fail('dock comment not preceded by transport </>');

const takePromptBlock = [
  "          {/* End-of-take prompt — STAGE LEVEL (owner ruling 2026-10-04): it must",
  "              appear the moment a take ends even when the mobile sheet is closed;",
  "              slides up from the bottom like a sheet instead of popping mid-screen. */}",
  "          {showTakePrompt && recordedAudioUrl && (",
  "            <div",
  "              style={{",
  "                position: 'fixed',",
  "                inset: 0,",
  "                zIndex: 80,",
  "                background: 'rgba(0,0,0,0.55)',",
  "                display: 'flex',",
  "                alignItems: 'flex-end',",
  "                justifyContent: 'center',",
  "                padding: 0,",
  "              }}",
  "              onClick={() => setShowTakePrompt(false)}",
  "            >",
  "              <div",
  "                style={{",
  "                  background: '#fff',",
  "                  border: '2.5px solid #000',",
  "                  borderBottom: 'none',",
  "                  boxShadow: '4px 4px 0 #000',",
  "                  padding: 20,",
  "                  paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',",
  "                  maxWidth: 430,",
  "                  width: '100%',",
  "                  borderRadius: '18px 18px 0 0',",
  "                  animation: 'ck-prompter-sheet-up 0.32s cubic-bezier(0.2,0.9,0.3,1)',",
  "                  display: 'flex',",
  "                  flexDirection: 'column',",
  "                  gap: 12,",
  "                  maxHeight: '88dvh',",
  "                  overflowY: 'auto',",
  "                }}",
  "                onClick={(e) => e.stopPropagation()}",
  "              >",
  "                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem' }}>",
  "                  TAKE RECORDED — SAVE IT BEFORE IT'S LOST",
  "                </div>",
  "                <p style={{ margin: 0, fontSize: '0.76rem', fontFamily: 'monospace', color: '#444', lineHeight: 1.55 }}>",
  "                  The recording lives only in this browser tab. Download it now, discard it, or keep",
  "                  it in the studio for the 1-click captions handoff.",
  "                </p>",
  "                {takeIsVideo && recordedVideoUrl && (",
  "                  <video",
  "                    src={recordedVideoUrl}",
  "                    controls",
  "                    playsInline",
  "                    style={{ width: '100%', border: '2px solid #000', background: '#000', maxHeight: 240, display: 'block' }}",
  "                  />",
  "                )}",
  "                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>",
  "                  <a",
  "                    href={recordedAudioUrl}",
  "                    download={`creatorskit-take-${Date.now()}.${takeIsVideo && recordedBlob && recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`}",
  "                    onClick={() => setShowTakePrompt(false)}",
  "                    style={{",
  "                      border: '2px solid #000',",
  "                      background: '#FFE500',",
  "                      color: '#000',",
  "                      padding: '9px 14px',",
  "                      fontFamily: 'monospace',",
  "                      fontWeight: 800,",
  "                      fontSize: '0.72rem',",
  "                      cursor: 'pointer',",
  "                      textDecoration: 'none',",
  "                    }}",
  "                  >",
  "                    ⬇ DOWNLOAD TAKE",
  "                  </a>",
  "                  <button",
  "                    onClick={() => {",
  "                      URL.revokeObjectURL(recordedAudioUrl);",
  "                      if (recordedVideoUrl) {",
  "                        URL.revokeObjectURL(recordedVideoUrl);",
  "                        setRecordedVideoUrl(null);",
  "                      }",
  "                      setRecordedAudioUrl(null);",
  "                      setRecordedBlob(null);",
  "                      setTakeIsVideo(false);",
  "                      setHandoffSuccessNotice(false);",
  "                      setShowTakePrompt(false);",
  "                      // Also drop the pre-saved handoff so a discarded",
  "                      // take can never resurrect inside Auto Captions.",
  "                      clearHandoffSession().catch(() => { });",
  "                    }}",
  "                    style={{",
  "                      border: '2px solid #000',",
  "                      background: '#fff',",
  "                      padding: '9px 14px',",
  "                      fontFamily: 'monospace',",
  "                      fontWeight: 800,",
  "                      fontSize: '0.72rem',",
  "                      cursor: 'pointer',",
  "                    }}",
  "                  >",
  "                    ✕ DISCARD",
  "                  </button>",
  "                  <button",
  "                    onClick={() => setShowTakePrompt(false)}",
  "                    style={{",
  "                      border: '2px solid #000',",
  "                      background: '#f4f4f5',",
  "                      padding: '9px 14px',",
  "                      fontFamily: 'monospace',",
  "                      fontWeight: 700,",
  "                      fontSize: '0.72rem',",
  "                      cursor: 'pointer',",
  "                    }}",
  "                  >",
  "                    KEEP IN STUDIO",
  "                  </button>",
  "                </div>",
  "              </div>",
  "            </div>",
  "          )}",
  "",
];

const crewBlock = [
  "          {/* CREW MODE — script mirror to a second screen. Stage level for the",
  "              same reason: SECOND SCREEN must respond immediately from the pill",
  "              or the desktop dock — never only with the settings sheet open. */}",
  "          {mirrorOpen && (",
  "            <div",
  "              style={{",
  "                position: 'fixed',",
  "                inset: 0,",
  "                zIndex: 80,",
  "                background: 'rgba(0,0,0,0.55)',",
  "                display: 'flex',",
  "                alignItems: 'flex-end',",
  "                justifyContent: 'center',",
  "                padding: 0,",
  "              }}",
  "              onClick={() => setMirrorOpen(false)}",
  "            >",
  "              <div",
  "                style={{",
  "                  background: '#fff',",
  "                  border: '2.5px solid #000',",
  "                  borderBottom: 'none',",
  "                  boxShadow: '4px 4px 0 #000',",
  "                  padding: 20,",
  "                  paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',",
  "                  maxWidth: 430,",
  "                  width: '100%',",
  "                  borderRadius: '18px 18px 0 0',",
  "                  animation: 'ck-prompter-sheet-up 0.32s cubic-bezier(0.2,0.9,0.3,1)',",
  "                  display: 'flex',",
  "                  flexDirection: 'column',",
  "                  gap: 12,",
  "                  maxHeight: '88dvh',",
  "                  overflowY: 'auto',",
  "                }}",
  "                onClick={(e) => e.stopPropagation()}",
  "              >",
  "                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem' }}>",
  "                  SECOND SCREEN — CREW MODE",
  "                </div>",
  "                <p style={{ margin: 0, fontSize: '0.76rem', fontFamily: 'monospace', color: '#444', lineHeight: 1.55 }}>",
  "                  Film on your phone's camera app at full quality while this script scrolls on a",
  "                  laptop or a second phone. Send this link there (WhatsApp it to yourself or type",
  "                  it), open it, press play, then put the phone on the tripod and hit record.",
  "                </p>",
  "                <div",
  "                  style={{",
  "                    border: '1.5px dashed #000',",
  "                    padding: '8px 10px',",
  "                    fontFamily: 'monospace',",
  "                    fontSize: '0.64rem',",
  "                    wordBreak: 'break-all',",
  "                    background: '#f4f4f5',",
  "                  }}",
  "                >",
  "                  {mirrorLink()}",
  "                </div>",
  "                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>",
  "                  <button",
  "                    onClick={() => {",
  "                      navigator.clipboard.writeText(mirrorLink()).catch(() => { });",
  "                    }}",
  "                    style={{",
  "                      border: '2px solid #000',",
  "                      background: '#FFE500',",
  "                      color: '#000',",
  "                      padding: '9px 14px',",
  "                      fontFamily: 'monospace',",
  "                      fontWeight: 800,",
  "                      fontSize: '0.72rem',",
  "                      cursor: 'pointer',",
  "                    }}",
  "                  >",
  "                    COPY LINK",
  "                  </button>",
  "                  <button",
  "                    onClick={() => window.open(mirrorLink(), '_blank')}",
  "                    style={{",
  "                      border: '2px solid #000',",
  "                      background: '#fff',",
  "                      padding: '9px 14px',",
  "                      fontFamily: 'monospace',",
  "                      fontWeight: 800,",
  "                      fontSize: '0.72rem',",
  "                      cursor: 'pointer',",
  "                    }}",
  "                  >",
  "                    OPEN HERE",
  "                  </button>",
  "                  <button",
  "                    onClick={() => setMirrorOpen(false)}",
  "                    style={{",
  "                      border: '2px solid #000',",
  "                      background: '#f4f4f5',",
  "                      padding: '9px 14px',",
  "                      fontFamily: 'monospace',",
  "                      fontWeight: 700,",
  "                      fontSize: '0.72rem',",
  "                      cursor: 'pointer',",
  "                    }}",
  "                  >",
  "                    DONE",
  "                  </button>",
  "                </div>",
  "              </div>",
  "            </div>",
  "          )}",
  "",
];

lines.splice(dock, 0, ...takePromptBlock, ...crewBlock);
console.log('3. stage-level slide-up modals inserted before dock comment');

/* ── 4. EYELINE LEVEL stepper in the FILM MODE sheet ──────────────────── */
const eyBtn = findIdx("EYELINE ON' : 'EYELINE OFF'");
if (eyBtn < 0) fail('EYELINE ON/OFF button not found');
let closeIdx = -1;
for (let i = eyBtn + 1; i < eyBtn + 12; i++) {
  if (lines[i].trim() === ')}') { closeIdx = i; break; }
}
if (closeIdx < 0) fail('closing )} of the PIP/EYELINE grid not found');

const stepper = [
  "                    {cameraActive && showEyelineGuide && (",
  "                      <div>",
  "                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>",
  "                          Eyeline Level",
  "                        </span>",
  "                        <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', borderRadius: 8, overflow: 'hidden' }}>",
  "                          <button onClick={(e) => { e.stopPropagation(); setEyelinePercent((p) => Math.max(15, p - 5)); }} style={{ flex: 1, minHeight: 38, border: 'none', background: '#fff', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>−</button>",
  "                          <span style={{ flex: 1.4, textAlign: 'center', fontSize: '0.85rem', fontWeight: 900, fontFamily: 'monospace', background: '#f4f4f5' }}>{eyelinePercent}%</span>",
  "                          <button onClick={(e) => { e.stopPropagation(); setEyelinePercent((p) => Math.min(65, p + 5)); }} style={{ flex: 1, minHeight: 38, border: 'none', background: '#fff', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>+</button>",
  "                        </div>",
  "                      </div>",
  "                    )}",
  "",
];
lines.splice(closeIdx + 1, 0, ...stepper);
console.log('4. EYELINE LEVEL stepper inserted after grid close (line ' + (closeIdx + 1) + ')');

/* ── Write back ───────────────────────────────────────────────────────── */
fs.writeFileSync(file, lines.join(eol));
console.log('OK — page.tsx rewritten: ' + lines.length + ' lines, eol=' + JSON.stringify(eol));
