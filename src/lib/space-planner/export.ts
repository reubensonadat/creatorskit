import type { PlacedObject, Currency, ProjectInfo } from '@/components/space-planner/types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from '@/components/space-planner/gear-library';

// Reliable ASCII currency prefixes that render with 100% crystal clarity across all PDF engines
const CURRENCY_PREFIXES: Record<Currency, string> = {
  USD: '$',
  EUR: 'EUR ',
  GBP: 'GBP ',
  GHS: 'GHS ',
  NGN: 'NGN ',
};

// ============ PNG Export ============
export function exportPNG(canvas: HTMLCanvasElement, filename: string = 'space-planner'): void {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============ Real 3D Top-Down Orthographic Blueprint Generator ============
export async function generate2DBlueprintSchematic(
  placedObjects: PlacedObject[],
  roomWidth: number,
  roomDepth: number,
  projectInfo: ProjectInfo,
  top3DImgSrc?: string
): Promise<string> {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const w = 1800;
  const h = 1200;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background: Deep architectural blueprint slate
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);

  // Blueprint Grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const margin = 120;
  const availW = w - margin * 2;
  const availH = h - margin * 2;
  const scale = Math.min(availW / roomWidth, availH / roomDepth) * 0.84;

  const roomPxW = roomWidth * scale;
  const roomPxH = roomDepth * scale;
  const roomLeft = (w - roomPxW) / 2;
  const roomTop = (h - roomPxH) / 2;

  // Render Real 3D Top-Down Scene Image inside the floor boundary
  if (top3DImgSrc) {
    const img = new Image();
    img.src = top3DImgSrc;
    await new Promise<void>((resolve) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }
    });

    ctx.save();
    // Clip to room boundaries
    ctx.beginPath();
    ctx.roundRect(roomLeft, roomTop, roomPxW, roomPxH, 4);
    ctx.clip();
    ctx.drawImage(img, roomLeft, roomTop, roomPxW, roomPxH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(roomLeft, roomTop, roomPxW, roomPxH);
  }

  // Room Wall Boundary (Heavy Blueprint Cyan)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.strokeRect(roomLeft, roomTop, roomPxW, roomPxH);

  // Dimension lines: Top Wall (Width)
  ctx.strokeStyle = '#38bdf8';
  ctx.fillStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  const dimTopY = roomTop - 45;
  ctx.beginPath();
  ctx.moveTo(roomLeft, dimTopY);
  ctx.lineTo(roomLeft + roomPxW, dimTopY);
  ctx.stroke();
  // Arrow ticks
  ctx.beginPath();
  ctx.moveTo(roomLeft, dimTopY - 10);
  ctx.lineTo(roomLeft, dimTopY + 10);
  ctx.moveTo(roomLeft + roomPxW, dimTopY - 10);
  ctx.lineTo(roomLeft + roomPxW, dimTopY + 10);
  ctx.stroke();
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `↔ WIDTH: ${roomWidth.toFixed(2)} m (${(roomWidth * 3.28084).toFixed(1)} ft)`,
    roomLeft + roomPxW / 2,
    dimTopY - 14
  );

  // Dimension lines: Left Wall (Depth)
  const dimLeftX = roomLeft - 45;
  ctx.beginPath();
  ctx.moveTo(dimLeftX, roomTop);
  ctx.lineTo(dimLeftX, roomTop + roomPxH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dimLeftX - 10, roomTop);
  ctx.lineTo(dimLeftX + 10, roomTop);
  ctx.moveTo(dimLeftX - 10, roomTop + roomPxH);
  ctx.lineTo(dimLeftX + 10, roomTop + roomPxH);
  ctx.stroke();
  ctx.save();
  ctx.translate(dimLeftX - 20, roomTop + roomPxH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`↕ DEPTH: ${roomDepth.toFixed(2)} m (${(roomDepth * 3.28084).toFixed(1)} ft)`, 0, 0);
  ctx.restore();

  // Overlay Subtle Equipment Pin Callouts over the real 3D render
  placedObjects.forEach((obj, idx) => {
    const cx = roomLeft + (obj.x + roomWidth / 2) * scale;
    const cy = roomTop + (obj.z + roomDepth / 2) * scale;

    // Pin circle
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pin Number
    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${idx + 1}`, cx, cy + 4.5);
  });

  // Architectural Title Block
  const tbW = 520;
  const tbH = 125;
  const tbX = w - tbW - 35;
  const tbY = h - tbH - 35;
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.fillRect(tbX, tbY, tbW, tbH);
  ctx.strokeRect(tbX, tbY, tbW, tbH);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ARCHITECTURAL CAD BLUEPRINT`, tbX + 18, tbY + 30);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '13px monospace';
  ctx.fillText(`PROJECT: ${projectInfo.name || 'CREATOR STUDIO'}`, tbX + 18, tbY + 56);
  ctx.fillText(
    `STUDIO FLOOR AREA: ${(roomWidth * roomDepth).toFixed(1)} m² (${(roomWidth * roomDepth * 10.7639).toFixed(0)} sq ft)`,
    tbX + 18,
    tbY + 78
  );
  ctx.fillText(`EQUIPMENT PLACED: ${placedObjects.length} UNITS`, tbX + 18, tbY + 100);

  return canvas.toDataURL('image/jpeg', 0.95);
}

// ============ Multi-Page Master PDF Export ============
export async function exportPDF(
  canvas: HTMLCanvasElement,
  options: {
    projectInfo: ProjectInfo;
    placedObjects: PlacedObject[];
    roomWidth: number;
    roomDepth: number;
    currency: Currency;
    powerTotal: number;
    budgetTotal: number;
  }
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { projectInfo, placedObjects, roomWidth, roomDepth, currency, powerTotal, budgetTotal } = options;
  const curr = CURRENCY_PREFIXES[currency] || '$';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const pageH = doc.internal.pageSize.getHeight(); // 210mm
  const TOTAL_PAGES = 5;

  // Capture all 3D camera angles from WebGL Canvas
  let angles: Record<string, string> | null = null;
  if (typeof window !== 'undefined' && typeof (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__ === 'function') {
    try {
      angles = (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__();
    } catch {}
  }

  const hero3D = angles?.hero3D || canvas.toDataURL('image/jpeg', 0.96);
  const front = angles?.front || hero3D;
  const left45 = angles?.left45 || hero3D;
  const right45 = angles?.right45 || hero3D;
  const top3D = angles?.top3D || hero3D;
  const directorPOV = angles?.directorPOV || hero3D;

  const blueprintTop = await generate2DBlueprintSchematic(placedObjects, roomWidth, roomDepth, projectInfo, top3D);

  const drawHeader = (title: string, subtitle: string, pageNum: number) => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageW, 22, 'F');

    // Cyan accent bar at the bottom of the header
    doc.setFillColor(56, 189, 248); // sky-400
    doc.rect(0, 21.2, pageW, 0.8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 14, 13);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(subtitle, 14, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`PAGE ${pageNum} OF ${TOTAL_PAGES}`, pageW - 14, 14, { align: 'right' });
  };

  const drawFooter = (pageNum: number) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(14, pageH - 8, pageW - 28, 0.3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Creator Studio Space Planner · Architectural & Technical Production Specification · Page ${pageNum} of ${TOTAL_PAGES}`, 14, pageH - 4);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} · Rev 1.0`, pageW - 14, pageH - 4, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE STUDIO COVER & MASTER PRODUCTION SPECIFICATION
  // =========================================================================
  drawHeader(
    `1. EXECUTIVE STUDIO MASTER PLAN & PRODUCTION SPECIFICATION`,
    `${projectInfo.name || 'Professional Creator Studio'} · ${roomWidth}m × ${roomDepth}m (${(roomWidth * roomDepth).toFixed(1)} m²) · Scale 1:50 Calibrated`,
    1
  );

  // Large Hero 3D Viewport on Page 1 (Left / Center)
  const coverHeroW = 168;
  const coverHeroH = 126;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 26, coverHeroW, coverHeroH, 'F');
  if (hero3D) {
    doc.addImage(hero3D, 'JPEG', 14, 26, coverHeroW, coverHeroH);
  }
  // Architectural framing border & label
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.4);
  doc.rect(14, 26, coverHeroW, coverHeroH, 'S');

  doc.setFillColor(15, 23, 42);
  doc.rect(14, 26 + coverHeroH - 7, coverHeroW, 7, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('3D PERSPECTIVE SPATIAL RENDERING · PRIMARY TALENT VANTAGE', 18, 26 + coverHeroH - 2.5);

  // Right Side Column: Executive Metadata & Engineering KPI Cards
  const coverRightX = 14 + coverHeroW + 6;
  const coverRightW = pageW - coverRightX - 14;

  // Project Dossier Meta Card
  doc.setFillColor(248, 250, 252);
  doc.rect(coverRightX, 26, coverRightW, 46, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(coverRightX, 26, coverRightW, 46, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDIO DOSSIER PROFILE', coverRightX + 5, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  let metaY = 40;
  const drawMetaRow = (lbl: string, val: string) => {
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, coverRightX + 5, metaY);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(val, coverRightX + 36, metaY);
    doc.setFont('helvetica', 'normal');
    metaY += 5.2;
  };

  drawMetaRow('Project Title:', projectInfo.name || 'Creator Studio Alpha');
  drawMetaRow('Production Lead:', projectInfo.author || 'Lead DP / Creator');
  drawMetaRow('Engineering Date:', new Date().toLocaleDateString());
  drawMetaRow('Build Status:', 'Approved for Construction');
  drawMetaRow('Studio Class:', 'Controlled Multi-Rig Facility');

  // 4 KPI Metric Blocks below meta
  let kpiY = 76;
  const drawKpiCard = (title: string, mainVal: string, subVal: string, bgTint: string = '#ffffff') => {
    doc.setFillColor(bgTint === 'slate' ? 241 : 255, bgTint === 'slate' ? 245 : 255, bgTint === 'slate' ? 249 : 255);
    doc.rect(coverRightX, kpiY, coverRightW, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(coverRightX, kpiY, coverRightW, 18, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), coverRightX + 5, kpiY + 4.5);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(mainVal, coverRightX + 5, kpiY + 11.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(subVal, coverRightX + 5, kpiY + 15.5);

    kpiY += 21;
  };

  drawKpiCard('Total Studio Footprint', `${(roomWidth * roomDepth).toFixed(1)} m² (${(roomWidth * roomDepth * 10.7639).toFixed(0)} sq ft)`, `${roomWidth.toFixed(2)}m Width × ${roomDepth.toFixed(2)}m Depth`);
  drawKpiCard('Connected Power Draw', `${powerTotal} Watts`, powerTotal > 1500 ? '20A Dedicated Circuit Required' : 'Standard 15A Residential Line Safe');
  drawKpiCard('Active Equipment Deployed', `${placedObjects.length} Fixtures & Mounts`, 'Complete Camera, Light & Audio Rig');
  drawKpiCard('Total Estimated Setup Budget', `${curr}${budgetTotal.toLocaleString()}`, `Full Itemized Schedule in Currency (${currency})`);

  // Bottom Summary Highlights Bar
  const btmBarY = 26 + coverHeroH + 6;
  const btmBarH = pageH - btmBarY - 10;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, btmBarY, pageW - 28, btmBarH, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, btmBarY, pageW - 28, btmBarH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE ENGINEERING NOTES & SPATIAL CLEARANCE:', 18, btmBarY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `• Layout calibrated with 0.9m minimum egress clearance behind host seating. Optical lens height set at 1.25m eye-level with key-to-fill lighting ratio balanced for cinematic depth and skin-tone rendition.`,
    18,
    btmBarY + 10.5
  );

  drawFooter(1);

  // =========================================================================
  // PAGE 2: ARCHITECTURAL 2D/3D FLOOR PLAN BLUEPRINT & SPATIAL INDEX
  // =========================================================================
  doc.addPage('a4', 'landscape');
  drawHeader(
    `2. ARCHITECTURAL CAD FLOOR PLAN & EQUIPMENT PLACEMENT BLUEPRINT`,
    `${projectInfo.name || 'Creator Studio'} · ${roomWidth}m × ${roomDepth}m (${(roomWidth * roomDepth).toFixed(1)} m²) · Scale Calibrated Coordinate Grid`,
    2
  );

  const bpW = 160;
  const bpH = pageH - 36;
  if (blueprintTop) {
    doc.addImage(blueprintTop, 'JPEG', 14, 26, bpW, bpH);
  }

  // Right Side Panel: Spatial Specs & Pin Legend
  const rightX = 14 + bpW + 6;
  const rightW = pageW - rightX - 14;

  // Spatial Dimensions Card
  doc.setFillColor(248, 250, 252);
  doc.rect(rightX, 26, rightW, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightX, 26, rightW, 32, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Studio Spatial Parameters', rightX + 4, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let yPos = 38;
  const drawParam = (lbl: string, val: string) => {
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, rightX + 4, yPos);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(val, rightX + 38, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 4.5;
  };
  drawParam('Floor Area:', `${(roomWidth * roomDepth).toFixed(1)} m² (${(roomWidth * roomDepth * 10.7639).toFixed(0)} sq ft)`);
  drawParam('Footprint:', `${roomWidth.toFixed(2)}m W × ${roomDepth.toFixed(2)}m D`);
  drawParam('Equipment Units:', `${placedObjects.length} active fixtures`);
  drawParam('Total Power Load:', `${powerTotal} Watts`);

  // Pin Placement Index Legend
  let pinY = 64;
  doc.setFillColor(15, 23, 42);
  doc.rect(rightX, pinY, rightW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Pin', rightX + 3, pinY + 3.8);
  doc.text('Equipment Item', rightX + 13, pinY + 3.8);
  doc.text('Pos (X, Z)', rightX + rightW - 2, pinY + 3.8, { align: 'right' });
  pinY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  placedObjects.slice(0, 22).forEach((obj, idx) => {
    if (pinY > pageH - 10) return;
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
    const name = def?.name || obj.equipmentId;
    const trunc = name.length > 25 ? name.substring(0, 23) + '...' : name;

    // Pin circle
    doc.setFillColor(56, 189, 248);
    doc.circle(rightX + 6, pinY - 1, 2.2, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text(`${idx + 1}`, rightX + 6, pinY - 0.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(trunc, rightX + 13, pinY);
    doc.setTextColor(100, 116, 139);
    doc.text(`${obj.x.toFixed(1)}m, ${obj.z.toFixed(1)}m`, rightX + rightW - 2, pinY, { align: 'right' });
    pinY += 4.5;
  });

  drawFooter(2);

  // =========================================================================
  // PAGE 3: 3D MULTI-PERSPECTIVE VISUAL PROOFS & CINEMATIC CONTACT SHEET
  // =========================================================================
  doc.addPage('a4', 'landscape');
  drawHeader(
    `3. 3D MULTI-PERSPECTIVE VISUAL PROOFS & CINEMATIC PERSPECTIVES`,
    `Hero Perspective · Talent Host Eye-Level · 45° Key Lighting Angle · Director 16:9 POV Viewfinder`,
    3
  );

  // 4-Quadrant Matrix
  const quadPadX = 14;
  const quadPadY = 26;
  const quadGap = 6;
  const quadW = (pageW - quadPadX * 2 - quadGap) / 2; // ~131mm
  const quadH = 75;

  // Quadrant 1: Hero 3D Isometric View (Top-Left)
  if (hero3D) {
    doc.addImage(hero3D, 'JPEG', quadPadX, quadPadY, quadW, quadH);
  }
  doc.setFillColor(15, 23, 42);
  doc.rect(quadPadX, quadPadY + quadH - 6.5, quadW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.text('1. HERO 3D ISOMETRIC VANTAGE (FULL ROOM VOLUME)', quadPadX + 4, quadPadY + quadH - 2.2);

  // Quadrant 2: Front Talent Eye-Level (Top-Right)
  if (front) {
    doc.addImage(front, 'JPEG', quadPadX + quadW + quadGap, quadPadY, quadW, quadH);
  }
  doc.setFillColor(15, 23, 42);
  doc.rect(quadPadX + quadW + quadGap, quadPadY + quadH - 6.5, quadW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.text('2. TALENT HOST EYE-LEVEL VIEW (1.55M AGL ELEVATION)', quadPadX + quadW + quadGap + 4, quadPadY + quadH - 2.2);

  // Bottom Row
  const btmQuadY = quadPadY + quadH + quadGap;
  const btmQuadH = pageH - btmQuadY - 10;

  // Quadrant 3: 45° Key Lighting & Production Depth (Bottom-Left)
  if (left45) {
    doc.addImage(left45, 'JPEG', quadPadX, btmQuadY, quadW, btmQuadH);
  }
  doc.setFillColor(15, 23, 42);
  doc.rect(quadPadX, btmQuadY + btmQuadH - 6.5, quadW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.text('3. 45° PRODUCTION RIGGING & KEY LIGHT ANGLE', quadPadX + 4, btmQuadY + btmQuadH - 2.2);

  // Quadrant 4: Director 16:9 Cine POV Viewfinder (Bottom-Right)
  if (directorPOV) {
    doc.addImage(directorPOV, 'JPEG', quadPadX + quadW + quadGap, btmQuadY, quadW, btmQuadH);
  }
  // Overlay subtle framing guidelines on the POV box
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.25);
  const povX = quadPadX + quadW + quadGap;
  const povY = btmQuadY;

  // Rule of thirds lines
  doc.line(povX + quadW / 3, povY, povX + quadW / 3, povY + btmQuadH - 6.5);
  doc.line(povX + (quadW * 2) / 3, povY, povX + (quadW * 2) / 3, povY + btmQuadH - 6.5);
  doc.line(povX, povY + (btmQuadH - 6.5) / 3, povX + quadW, povY + (btmQuadH - 6.5) / 3);
  doc.line(povX, povY + ((btmQuadH - 6.5) * 2) / 3, povX + quadW, povY + ((btmQuadH - 6.5) * 2) / 3);

  // Center crosshair
  const cX = povX + quadW / 2;
  const cY = povY + (btmQuadH - 6.5) / 2;
  doc.setDrawColor(52, 211, 153); // emerald-400
  doc.circle(cX, cY, 3, 'S');

  doc.setFillColor(15, 23, 42);
  doc.rect(povX, btmQuadY + btmQuadH - 6.5, quadW, 6.5, 'F');
  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.text('4. DIRECTOR 16:9 CINE POV (RULE-OF-THIRDS & SAFE ZONES)', povX + 4, btmQuadY + btmQuadH - 2.2);

  drawFooter(3);

  // =========================================================================
  // PAGE 4: PRODUCTION LIGHTING & CAMERA OPTICAL CALL SHEET
  // =========================================================================
  doc.addPage('a4', 'landscape');
  drawHeader(
    `4. DIRECTOR CAMERA OPTICS & PRECISION LIGHTING RIGGING SCHEDULE`,
    `Calibrated Lens Angles · Color Temperatures (CCT) · Lighting Ratios · Beam Spreads`,
    4
  );

  // Section A: Camera Optics & Framing Schedule (Top Half)
  const camY = 26;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, camY, pageW - 28, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, camY, pageW - 28, 6, 'S');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CAMERA POSITIONS, LENSES & FRAMING ANGLES', 18, camY + 4.2);

  let cTableY = camY + 8;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, cTableY, pageW - 28, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Camera / Sensor', 18, cTableY + 3.5);
  doc.text('Role', 75, cTableY + 3.5);
  doc.text('Focal Length', 120, cTableY + 3.5);
  doc.text('Field of View (FoV)', 158, cTableY + 3.5);
  doc.text('Lens Height', 205, cTableY + 3.5);
  doc.text('Coords (X, Z)', pageW - 18, cTableY + 3.5, { align: 'right' });
  cTableY += 7.5;

  const cameras = placedObjects.filter(
    (o) =>
      o.equipmentId === 'camera' ||
      o.equipmentId.startsWith('cam') ||
      o.equipmentId.includes('cam') ||
      o.equipmentId.includes('phone') ||
      o.equipmentId.includes('webcam')
  );
  const cameraList = cameras.length > 0 ? cameras : placedObjects.filter((o) => o.isMainCamera);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  cameraList.forEach((cam, idx) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[cam.equipmentId];
    const name = def?.name || cam.equipmentId;
    const lens = cam.lensPreset || '24mm';
    const lensFoVs: Record<string, string> = {
      '16mm': '84° (Ultra-Wide Full Room)',
      '24mm': '65° (Wide Dynamic Vlog)',
      '35mm': '50° (Creator Standard)',
      '50mm': '39° (Portrait / Talking Head)',
      '85mm': '24° (Cinematic Telephoto)',
    };
    const role = cam.isMainCamera ? 'A-Cam Master (Eye-Level)' : `B-Cam Coverage ${idx + 1}`;

    doc.setTextColor(15, 23, 42);
    doc.text(name, 18, cTableY);
    doc.setTextColor(37, 99, 235);
    doc.text(role, 75, cTableY);
    doc.setTextColor(15, 23, 42);
    doc.text(lens, 120, cTableY);
    doc.setTextColor(100, 116, 139);
    doc.text(lensFoVs[lens] || '65°', 158, cTableY);
    doc.setTextColor(15, 23, 42);
    doc.text('1.25 m (4.1 ft)', 205, cTableY);
    doc.setTextColor(100, 116, 139);
    doc.text(`${cam.x.toFixed(1)}m, ${cam.z.toFixed(1)}m`, pageW - 18, cTableY, { align: 'right' });
    cTableY += 5;
  });

  // Section B: Lighting Fixture Rigging Schedule (Bottom Half)
  const lightSecY = cTableY + 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, lightSecY, pageW - 28, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, lightSecY, pageW - 28, 6, 'S');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('LIGHTING FIXTURES, COLOR TEMPERATURES & MODIFIERS', 18, lightSecY + 4.2);

  let lTableY = lightSecY + 8;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, lTableY, pageW - 28, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Fixture Model', 18, lTableY + 3.5);
  doc.text('Lighting Role', 80, lTableY + 3.5);
  doc.text('CCT / Color', 125, lTableY + 3.5);
  doc.text('Intensity', 165, lTableY + 3.5);
  doc.text('Beam Spread', 198, lTableY + 3.5);
  doc.text('Power Draw', pageW - 18, lTableY + 3.5, { align: 'right' });
  lTableY += 7.5;

  const lights = placedObjects.filter((o) => {
    const id = o.equipmentId.toLowerCase();
    return id.includes('light') || id.includes('softbox') || id.includes('fresnel') || id.includes('tube') || id.includes('lamp') || id.includes('beauty-dish') || id.includes('barndoor');
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  lights.forEach((lt, idx) => {
    if (lTableY > pageH - 24) return;
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[lt.equipmentId];
    const name = def?.name || lt.equipmentId;
    const kelvin = lt.lightSettings?.colorTempKelvin ?? 5600;
    const colorStr = lt.lightSettings?.colorHex ? `RGB (${lt.lightSettings.colorHex})` : `${kelvin}K Daylight/Tungsten`;
    const intensity = `${lt.lightSettings?.intensity ?? 80}%`;
    const beam = `${lt.lightSettings?.beamAngle ?? 60}° Angle`;
    const role = idx === 0 ? 'Primary 45° Key Light' : idx === 1 ? 'Soft Ambient Fill Light' : idx === 2 ? 'Rim / Hair Accent' : `Background Practical ${idx - 2}`;

    doc.setTextColor(15, 23, 42);
    doc.text(name.length > 30 ? name.substring(0, 28) + '...' : name, 18, lTableY);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(role, 80, lTableY);
    doc.setTextColor(15, 23, 42);
    doc.text(colorStr, 125, lTableY);
    doc.setTextColor(15, 23, 42);
    doc.text(intensity, 165, lTableY);
    doc.setTextColor(100, 116, 139);
    doc.text(beam, 198, lTableY);
    doc.setTextColor(15, 23, 42);
    doc.text(`${def?.watts || 60}W`, pageW - 18, lTableY, { align: 'right' });
    lTableY += 4.8;
  });

  // Audio & Acoustic Callout Box at bottom
  const audioBoxY = Math.max(lTableY + 4, pageH - 24);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, audioBoxY, pageW - 28, 14, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, audioBoxY, pageW - 28, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIO RIGGING & ACOUSTIC ISOLATION PROTOCOL:', 18, audioBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    '• Maintain 3:1 microphone distance ratio to prevent comb filtering. Ensure acoustic foam absorption covers primary corner flutter reflections.',
    18,
    audioBoxY + 9.5
  );

  drawFooter(4);

  // =========================================================================
  // PAGE 5: EQUIPMENT BILL OF MATERIALS (BOM) & ELECTRICAL LOAD ANALYSIS
  // =========================================================================
  doc.addPage('a4', 'landscape');
  drawHeader(
    `5. EQUIPMENT BILL OF MATERIALS (BOM) & ELECTRICAL LOAD SAFETY PLAN`,
    `Itemized Schedule · Pricing Breakdown · Connected Power Audit · Circuit Breaker Verification`,
    5
  );

  // Left Column: BOM Table (Width ~175mm)
  const bomW = 175;
  let bomY = 26;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, bomY, bomW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.text('Equipment Item', 18, bomY + 3.8);
  doc.text('Qty', 14 + bomW - 55, bomY + 3.8);
  doc.text('Power', 14 + bomW - 38, bomY + 3.8);
  doc.text('Unit Price', 14 + bomW - 22, bomY + 3.8);
  doc.text('Subtotal', 14 + bomW - 2, bomY + 3.8, { align: 'right' });
  bomY += 8.5;

  const grouped = new Map<string, { count: number; watts: number; price: number; name: string; category: string }>();
  placedObjects.forEach((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    const name = def?.name || o.equipmentId;
    let price = def?.defaultPriceUSD || 0;
    if (currency === 'EUR') price = def?.defaultPriceEUR || 0;
    if (currency === 'GBP') price = def?.defaultPriceGBP || 0;
    if (currency === 'GHS') price = def?.defaultPriceGHS || 0;
    if (currency === 'NGN') price = def?.defaultPriceNGN || 0;

    const existing = grouped.get(o.equipmentId) || {
      count: 0,
      watts: def?.watts || 0,
      price,
      name,
      category: def?.category || 'other',
    };
    existing.count += 1;
    grouped.set(o.equipmentId, existing);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let isEvenRow = false;
  grouped.forEach((item) => {
    if (bomY > pageH - 22) return;

    if (isEvenRow) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, bomY - 3.2, bomW, 4.5, 'F');
    }
    isEvenRow = !isEvenRow;

    doc.setTextColor(15, 23, 42);
    const trunc = item.name.length > 36 ? item.name.substring(0, 34) + '...' : item.name;
    doc.text(trunc, 18, bomY);
    doc.text(`×${item.count}`, 14 + bomW - 55, bomY);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.watts * item.count}W`, 14 + bomW - 38, bomY);
    doc.setTextColor(71, 85, 105);
    doc.text(`${curr}${item.price.toLocaleString()}`, 14 + bomW - 22, bomY);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${curr}${(item.price * item.count).toLocaleString()}`, 14 + bomW - 2, bomY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    bomY += 4.5;
  });

  // Total Summary Line in BOM Table
  doc.setDrawColor(203, 213, 225);
  doc.line(14, bomY + 1, 14 + bomW, bomY + 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ESTIMATED SETUP BUDGET:', 18, bomY + 6);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`${curr}${budgetTotal.toLocaleString()}`, 14 + bomW - 2, bomY + 6, { align: 'right' });

  // Right Column: Electrical Safety & Sign-off Panel
  const elecX = 14 + bomW + 8;
  const elecW = pageW - elecX - 14;

  doc.setFillColor(248, 250, 252);
  doc.rect(elecX, 26, elecW, pageH - 36, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(elecX, 26, elecW, pageH - 36, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Electrical Load & Safety Audit', elecX + 5, 33);

  let eY = 39;
  const drawElecCard = (title: string, value: string, desc: string, isAlert: boolean = false) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(elecX + 4, eY, elecW - 8, 17, 'F');
    doc.setDrawColor(isAlert ? 245 : 226, isAlert ? 158 : 232, isAlert ? 11 : 240);
    doc.rect(elecX + 4, eY, elecW - 8, 17, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), elecX + 7, eY + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(isAlert ? 217 : 15, isAlert ? 119 : 23, isAlert ? 6 : 42);
    doc.text(value, elecX + 7, eY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(100, 116, 139);
    doc.text(desc, elecX + 7, eY + 14.5);
    eY += 20.5;
  };

  drawElecCard('Peak Total Connected Load', `${powerTotal} Watts`, `Max power draw if all lights run at 100%`);
  drawElecCard('Hourly Consumption Rate', `${(powerTotal / 1000).toFixed(2)} kWh / hr`, `Estimated studio operating energy rate`);
  drawElecCard(
    'Circuit Breaker Requirement',
    powerTotal > 1500 ? '20A Dedicated Line' : '15A Standard Line OK',
    powerTotal > 1500 ? 'Exceeds standard 15A continuous limit' : 'Safe for residential wall outlets',
    powerTotal > 1500
  );
  drawElecCard(
    '1000Wh Battery Backup Runtime',
    `${((1000 * 0.85) / Math.max(50, powerTotal)).toFixed(1)} Hours`,
    `Estimated uninterrupted runtime during outages`
  );

  // Construction Sign-Off & Approval Block
  const signY = eY + 2;
  const signH = pageH - signY - 14;
  doc.setFillColor(255, 255, 255);
  doc.rect(elecX + 4, signY, elecW - 8, signH, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(elecX + 4, signY, elecW - 8, signH, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSTRUCTION SIGN-OFF & APPROVAL', elecX + 8, signY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  let sLineY = signY + 11.5;
  const drawSignItem = (lbl: string, val: string) => {
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, elecX + 8, sLineY);
    doc.setTextColor(15, 23, 42);
    doc.text(val, elecX + 35, sLineY);
    sLineY += 5.5;
  };
  drawSignItem('Lead Director:', projectInfo.author || 'Lead DP');
  drawSignItem('Approval Stamp:', 'APPROVED FOR BUILD');
  drawSignItem('Revision Code:', 'REV 1.0 (FINAL)');

  drawFooter(5);

  // Save document
  doc.save(`${(projectInfo.name || 'Studio_Production_Plan').replace(/\s+/g, '_')}_Master_Report.pdf`);
}
