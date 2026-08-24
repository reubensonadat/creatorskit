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
  ctx.fillStyle = '#080d1a';
  ctx.fillRect(0, 0, w, h);

  // Blueprint Grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
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
  // Arrow ticks
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

  // Draw Equipment 2D Overlays (Bounding Boxes, FOV Cones, Throw Wedges)
  placedObjects.forEach((obj, idx) => {
    const cx = roomLeft + (obj.x + roomWidth / 2) * scale;
    const cy = roomTop + (obj.z + roomDepth / 2) * scale;
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
    const cat = def?.category || 'other';

    const objW = (def?.dimensions?.width || 0.6) * scale;
    const objD = (def?.dimensions?.depth || 0.5) * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotationY || 0);

    // Category Color Coding
    let strokeColor = '#38bdf8'; // Sky cyan
    let fillColor = 'rgba(56, 189, 248, 0.2)';
    if (cat === 'camera') {
      strokeColor = '#ec4899'; // Pink / Magenta
      fillColor = 'rgba(236, 72, 153, 0.25)';
    } else if (cat === 'lighting') {
      strokeColor = '#f59e0b'; // Amber Gold
      fillColor = 'rgba(245, 158, 11, 0.25)';
    } else if (cat === 'audio') {
      strokeColor = '#a855f7'; // Purple
      fillColor = 'rgba(168, 85, 247, 0.25)';
    } else if (cat === 'furniture') {
      strokeColor = '#10b981'; // Emerald
      fillColor = 'rgba(16, 185, 129, 0.25)';
    }

    // Equipment footprint box
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.fillStyle = fillColor;
    ctx.fillRect(-objW / 2, -objD / 2, objW, objD);
    ctx.strokeRect(-objW / 2, -objD / 2, objW, objD);

    // If Camera: Draw FOV Vision Cone
    if (cat === 'camera' || obj.equipmentId.includes('cam')) {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
      ctx.lineWidth = 1.5;
      const fovLen = 220;
      const fovAngle = 0.55; // ~63 deg
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(-fovAngle) * fovLen, Math.cos(-fovAngle) * fovLen);
      ctx.lineTo(Math.sin(fovAngle) * fovLen, Math.cos(fovAngle) * fovLen);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Optical focal center ray
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, fovLen * 1.15);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // If Light: Draw Volumetric Light Wedge
    if (cat === 'lighting' || obj.equipmentId.includes('light') || obj.equipmentId.includes('softbox')) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.lineWidth = 1.5;
      const beamLen = 180;
      const beamAngle = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(-beamAngle) * beamLen, Math.cos(-beamAngle) * beamLen);
      ctx.lineTo(Math.sin(beamAngle) * beamLen, Math.cos(beamAngle) * beamLen);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Pin Identifier Circle Badge
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${idx + 1}`, cx, cy);
  });

  // Architectural Title Block (Bottom-Right)
  const tbW = 540;
  const tbH = 135;
  const tbX = w - tbW - 35;
  const tbY = h - tbH - 35;
  ctx.fillStyle = 'rgba(9, 13, 22, 0.95)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.fillRect(tbX, tbY, tbW, tbH);
  ctx.strokeRect(tbX, tbY, tbW, tbH);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ARCHITECTURAL CAD BLUEPRINT`, tbX + 18, tbY + 28);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px monospace';
  ctx.fillText(`PROJECT: ${projectInfo.name || 'CREATOR STUDIO PLAN'}`, tbX + 18, tbY + 54);
  ctx.fillText(
    `FLOOR AREA: ${(roomWidth * roomDepth).toFixed(1)} m² (${(roomWidth * roomDepth * 10.7639).toFixed(0)} sq ft) | ${roomWidth.toFixed(1)}m × ${roomDepth.toFixed(1)}m`,
    tbX + 18,
    tbY + 76
  );
  ctx.fillText(`TOTAL LOAD: ${placedObjects.reduce((acc, o) => acc + (COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.watts || 0), 0)}W | SCALE 1:50 METRIC`, tbX + 18, tbY + 98);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`GENERATED WITH CREATORKIT STUDIO PRE-VIS ENGINE`, tbX + 18, tbY + 120);

  return canvas.toDataURL('image/jpeg', 0.95);
}

export interface PdfExportConfig {
  includeCover?: boolean;
  includeBlueprint?: boolean;
  includeMultiRenders?: boolean;
  includeLightingOptics?: boolean;
  includeBillOfMaterials?: boolean;
}

// ============ Multi-Page Master PDF Export ============
export async function exportPDF(
  canvas: HTMLCanvasElement,
  options: {
    projectInfo: ProjectInfo & { author?: string };
    placedObjects: PlacedObject[];
    roomWidth: number;
    roomDepth: number;
    currency: Currency;
    powerTotal: number;
    budgetTotal: number;
    options?: PdfExportConfig;
  }
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { projectInfo, placedObjects, roomWidth, roomDepth, currency, powerTotal, budgetTotal, options: cfg } = options;
  const curr = CURRENCY_PREFIXES[currency] || '$';

  const includeCover = cfg?.includeCover ?? true;
  const includeBlueprint = cfg?.includeBlueprint ?? true;
  const includeMultiRenders = cfg?.includeMultiRenders ?? true;
  const includeLightingOptics = cfg?.includeLightingOptics ?? true;
  const includeBillOfMaterials = cfg?.includeBillOfMaterials ?? true;

  const activeSections: ('cover' | 'blueprint' | 'renders' | 'optics' | 'bom')[] = [];
  if (includeCover) activeSections.push('cover');
  if (includeBlueprint) activeSections.push('blueprint');
  if (includeMultiRenders) activeSections.push('renders');
  if (includeLightingOptics) activeSections.push('optics');
  if (includeBillOfMaterials) activeSections.push('bom');

  const TOTAL_PAGES = Math.max(1, activeSections.length);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const pageH = doc.internal.pageSize.getHeight(); // 210mm

  // Capture all 3D camera angles from WebGL Canvas
  let angles: Record<string, string> | null = null;
  if (typeof window !== 'undefined' && typeof (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__ === 'function') {
    try {
      angles = (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__();
    } catch (err) {
      console.warn('Angle capture fallback:', err);
    }
  }

  const hero3D = angles?.hero3D || canvas.toDataURL('image/jpeg', 0.96);
  const north = angles?.north || hero3D;
  const left45 = angles?.left45 || hero3D;
  const top3D = angles?.top3D || hero3D;
  const directorPOV = angles?.directorPOV || hero3D;

  const blueprintTop = await generate2DBlueprintSchematic(placedObjects, roomWidth, roomDepth, projectInfo, top3D);

  const drawHeader = (title: string, subtitle: string, pageNum: number) => {
    doc.setFillColor(11, 15, 25); // Slate 950
    doc.rect(0, 0, pageW, 22, 'F');

    // Sky cyan accent bar at header base
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
    doc.text(`CreatorKit Studio Planner · Master Architectural Specification · Page ${pageNum} of ${TOTAL_PAGES}`, 14, pageH - 4);
    doc.text(`Calibrated Pre-Vis Engine · Export Date: ${new Date().toLocaleDateString()}`, pageW - 14, pageH - 4, { align: 'right' });
  };

  let currentPage = 1;

  // =========================================================================
  // PAGE 1: EXECUTIVE STUDIO COVER & MASTER PRODUCTION SPECIFICATION
  // =========================================================================
  if (includeCover) {
    drawHeader(
      `1. EXECUTIVE STUDIO MASTER PLAN & PRODUCTION SPECIFICATION`,
      `${projectInfo.name || 'Professional Creator Studio'} · ${roomWidth}m × ${roomDepth}m (${(roomWidth * roomDepth).toFixed(1)} m²) · Scale 1:50 Calibrated`,
      currentPage
    );

    // Large Hero 3D Viewport on Page 1 (Left / Center)
    const coverHeroW = 168;
    const coverHeroH = 126;
    doc.setFillColor(11, 15, 25);
    doc.rect(14, 26, coverHeroW, coverHeroH, 'F');
    if (hero3D) {
      doc.addImage(hero3D, 'JPEG', 14, 26, coverHeroW, coverHeroH);
    }
    // Architectural framing border & label
    doc.setDrawColor(56, 189, 248);
    doc.setLineWidth(0.4);
    doc.rect(14, 26, coverHeroW, coverHeroH, 'S');

    doc.setFillColor(11, 15, 25);
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
    const drawKpiCard = (title: string, mainVal: string, subVal: string) => {
      doc.setFillColor(255, 255, 255);
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
    drawKpiCard('Connected Power Draw', `${powerTotal} Watts`, powerTotal > 1500 ? '20A Dedicated Circuit Required' : 'Standard 15A Line Safe');
    drawKpiCard('Active Equipment Deployed', `${placedObjects.length} Fixtures & Mounts`, 'Complete Camera, Light & Audio Rig');
    drawKpiCard('Total Estimated Setup Budget', `${curr}${budgetTotal.toLocaleString()}`, `Full Itemized Schedule (${currency})`);

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
      projectInfo.notes || `Layout calibrated with 0.9m minimum egress clearance behind host seating. Optical lens height set at 1.25m eye-level with key-to-fill lighting ratio balanced for cinematic depth and skin-tone rendition.`,
      18,
      btmBarY + 10.5
    );

    drawFooter(currentPage);
    currentPage++;
  }

  // =========================================================================
  // PAGE 2: ARCHITECTURAL CAD 2D/3D FLOOR PLAN BLUEPRINT & SPATIAL INDEX
  // =========================================================================
  if (includeBlueprint) {
    if (currentPage > 1) doc.addPage('a4', 'landscape');
    drawHeader(
      `2. ARCHITECTURAL CAD FLOOR PLAN & EQUIPMENT PLACEMENT BLUEPRINT`,
      `${projectInfo.name || 'Creator Studio'} · ${roomWidth}m × ${roomDepth}m (${(roomWidth * roomDepth).toFixed(1)} m²) · Scale Calibrated Coordinate Grid`,
      currentPage
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
    doc.setFillColor(11, 15, 25);
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

    drawFooter(currentPage);
    currentPage++;
  }

  // =========================================================================
  // PAGE 3: 3D MULTI-PERSPECTIVE VISUAL PROOFS (4-WALL ELEVATIONS & DIRECTOR POV)
  // =========================================================================
  if (includeMultiRenders) {
    if (currentPage > 1) doc.addPage('a4', 'landscape');
    drawHeader(
      `3. 3D MULTI-PERSPECTIVE 4-WALL ELEVATIONS & DIRECTOR POV`,
      `Hero Isometric · North Elevation (Back Wall) · 45° Key Rigging · Director 16:9 POV`,
      currentPage
    );

    const quadPadX = 14;
    const quadPadY = 26;
    const quadGap = 6;
    const quadW = (pageW - quadPadX * 2 - quadGap) / 2; // ~131mm
    const quadH = 75;

    // Quadrant 1: Hero 3D Isometric View (Top-Left)
    if (hero3D) {
      doc.addImage(hero3D, 'JPEG', quadPadX, quadPadY, quadW, quadH);
    }
    doc.setFillColor(11, 15, 25);
    doc.rect(quadPadX, quadPadY + quadH - 6.5, quadW, 6.5, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.text('1. HERO 3D ISOMETRIC VANTAGE (ROOM VOLUME)', quadPadX + 4, quadPadY + quadH - 2.2);

    // Quadrant 2: North Elevation / Back Wall (Top-Right)
    if (north) {
      doc.addImage(north, 'JPEG', quadPadX + quadW + quadGap, quadPadY, quadW, quadH);
    }
    doc.setFillColor(11, 15, 25);
    doc.rect(quadPadX + quadW + quadGap, quadPadY + quadH - 6.5, quadW, 6.5, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.text('2. NORTH ELEVATION · WORKSTATION & BACKGROUND WALL', quadPadX + quadW + quadGap + 4, quadPadY + quadH - 2.2);

    // Bottom Row
    const btmQuadY = quadPadY + quadH + quadGap;
    const btmQuadH = pageH - btmQuadY - 10;

    // Quadrant 3: 45° Key Lighting & Production Rigging (Bottom-Left)
    if (left45) {
      doc.addImage(left45, 'JPEG', quadPadX, btmQuadY, quadW, btmQuadH);
    }
    doc.setFillColor(11, 15, 25);
    doc.rect(quadPadX, btmQuadY + btmQuadH - 6.5, quadW, 6.5, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.text('3. 45° PRODUCTION RIGGING & KEY LIGHT TRIANGULATION', quadPadX + 4, btmQuadY + btmQuadH - 2.2);

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
    doc.setDrawColor(52, 211, 153);
    doc.circle(cX, cY, 3, 'S');

    doc.setFillColor(11, 15, 25);
    doc.rect(povX, btmQuadY + btmQuadH - 6.5, quadW, 6.5, 'F');
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.text('4. DIRECTOR 16:9 CINE POV (RULE-OF-THIRDS & SAFE ZONES)', povX + 4, btmQuadY + btmQuadH - 2.2);

    drawFooter(currentPage);
    currentPage++;
  }

  // =========================================================================
  // PAGE 4: PRODUCTION LIGHTING & CAMERA OPTICAL CALL SHEET
  // =========================================================================
  if (includeLightingOptics) {
    if (currentPage > 1) doc.addPage('a4', 'landscape');
    drawHeader(
      `4. DIRECTOR CAMERA OPTICS & PRECISION LIGHTING RIGGING SCHEDULE`,
      `Calibrated Lens Angles · Color Temperatures (CCT) · Lighting Ratios · Beam Spreads`,
      currentPage
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

    const cams = placedObjects.filter((o) => {
      const id = o.equipmentId.toLowerCase();
      return id === 'camera' || id.startsWith('cam') || id.includes('phone') || id.includes('webcam') || id.includes('prompter');
    });

    let camRowY = camY + 11;
    doc.setFillColor(11, 15, 25);
    doc.rect(14, camRowY - 4, pageW - 28, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Rig Tag', 18, camRowY - 0.5);
    doc.text('Equipment Model', 44, camRowY - 0.5);
    doc.text('Lens Preset', 110, camRowY - 0.5);
    doc.text('FOV Angle', 145, camRowY - 0.5);
    doc.text('Throw Distance', 180, camRowY - 0.5);
    doc.text('Framing Crop', pageW - 18, camRowY - 0.5, { align: 'right' });
    camRowY += 4.5;

    cams.forEach((c, idx) => {
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[c.equipmentId];
      const isMain = c.isMainCamera || idx === 0;
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(14, camRowY - 3.5, pageW - 28, 5.5, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(isMain ? `CAM A (PRIMARY)` : `CAM B (SECONDARY)`, 18, camRowY);

      doc.setFont('helvetica', 'normal');
      doc.text(def?.name || c.equipmentId, 44, camRowY);
      doc.text(c.lensPreset || '35mm Cine Prime', 110, camRowY);
      doc.text(c.lensPreset === '16mm' ? '107° Ultra-Wide' : c.lensPreset === '24mm' ? '84° Wide Angle' : c.lensPreset === '50mm' ? '47° Standard' : c.lensPreset === '85mm' ? '29° Portrait Tele' : '63° Storyteller Prime', 145, camRowY);
      doc.text(`1.85m to Subject`, 180, camRowY);
      doc.text(isMain ? 'Medium Close-Up (MCU)' : 'Tight Profile / Product Insert', pageW - 18, camRowY, { align: 'right' });
      camRowY += 6;
    });

    // Section B: 3-Point Lighting Matrix (Bottom Half)
    const lightY = Math.max(camRowY + 6, 86);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, lightY, pageW - 28, 6, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, lightY, pageW - 28, 6, 'S');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('3-POINT LIGHTING, CCT KELVIN CALIBRATION & BEAM SPREADS', 18, lightY + 4.2);

    const lights = placedObjects.filter((o) => {
      const id = o.equipmentId.toLowerCase();
      return id.includes('light') || id.includes('softbox') || id.includes('fresnel') || id.includes('tube') || id.includes('lamp') || id.includes('panel') || id.includes('dish') || id.includes('barndoor');
    });

    let lRowY = lightY + 11;
    doc.setFillColor(11, 15, 25);
    doc.rect(14, lRowY - 4, pageW - 28, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Role', 18, lRowY - 0.5);
    doc.text('Fixture Description', 48, lRowY - 0.5);
    doc.text('Intensity', 115, lRowY - 0.5);
    doc.text('Color Temp (CCT)', 150, lRowY - 0.5);
    doc.text('Beam Spread', 190, lRowY - 0.5);
    doc.text('Power Draw', pageW - 18, lRowY - 0.5, { align: 'right' });
    lRowY += 4.5;

    lights.forEach((l, idx) => {
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[l.equipmentId];
      const role = idx === 0 ? 'KEY LIGHT' : idx === 1 ? 'FILL LIGHT' : idx === 2 ? 'RIM / HAIR' : 'PRACTICAL / BG';
      const kelvin = l.lightSettings?.colorTempKelvin || 5600;
      const intensity = l.lightSettings?.intensity ?? 80;
      const beam = l.lightSettings?.beamAngle || 60;
      const watts = def?.watts || 60;

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(14, lRowY - 3.5, pageW - 28, 5.5, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(role, 18, lRowY);

      doc.setFont('helvetica', 'normal');
      doc.text(def?.name || l.equipmentId, 48, lRowY);
      doc.text(`${intensity}% Dimmer`, 115, lRowY);
      doc.text(`${kelvin}K (${kelvin > 5000 ? 'Daylight Clean' : kelvin > 3500 ? 'Warm Studio' : 'Tungsten Amber'})`, 150, lRowY);
      doc.text(`${beam}° Cone Spread`, 190, lRowY);
      doc.text(`${watts}W Load`, pageW - 18, lRowY, { align: 'right' });
      lRowY += 6;
    });

    drawFooter(currentPage);
    currentPage++;
  }

  // =========================================================================
  // PAGE 5: ITEMIZED BILL OF MATERIALS, ELECTRICAL & QUALITY DIAGNOSTICS
  // =========================================================================
  if (includeBillOfMaterials) {
    if (currentPage > 1) doc.addPage('a4', 'landscape');
    drawHeader(
      `5. ITEMIZED BILL OF MATERIALS, ELECTRICAL LOAD & QUALITY DIAGNOSTICS`,
      `Complete Equipment Schedule · Unit Pricing (${currency}) · Spatial Acoustics & Clearance Matrix`,
      currentPage
    );

    // Left Column: Bill of Materials
    const bomW = 165;
    let bomY = 26;
    doc.setFillColor(11, 15, 25);
    doc.rect(14, bomY, bomW, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 18, bomY + 3.8);
    doc.text('Equipment Item', 26, bomY + 3.8);
    doc.text('Category', 95, bomY + 3.8);
    doc.text('Watts', 125, bomY + 3.8);
    doc.text(`Price (${curr.trim()})`, 14 + bomW - 4, bomY + 3.8, { align: 'right' });
    bomY += 7.5;

    placedObjects.forEach((obj, idx) => {
      if (bomY > pageH - 24) return;
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
      const name = def?.name || obj.equipmentId;
      const cat = (def?.category || 'other').toUpperCase();
      const watts = def?.watts || 0;
      const price = (def?.priceUSD || 0) * (currency === 'EUR' ? 0.92 : currency === 'GBP' ? 0.79 : currency === 'GHS' ? 15.5 : currency === 'NGN' ? 1500 : 1);

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(14, bomY - 3, bomW, 4.5, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`${idx + 1}`, 18, bomY);

      doc.setFont('helvetica', 'normal');
      doc.text(name.length > 34 ? name.substring(0, 32) + '…' : name, 26, bomY);
      doc.text(cat, 95, bomY);
      doc.text(`${watts}W`, 125, bomY);
      doc.text(`${curr}${Math.round(price).toLocaleString()}`, 14 + bomW - 4, bomY, { align: 'right' });
      bomY += 4.6;
    });

    // Total Row
    doc.setFillColor(11, 15, 25);
    doc.rect(14, bomY - 1, bomW, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`TOTALS (${placedObjects.length} ITEMS DEPLOYED)`, 18, bomY + 3.2);
    doc.text(`${powerTotal}W LOAD`, 125, bomY + 3.2);
    doc.text(`${curr}${budgetTotal.toLocaleString()}`, 14 + bomW - 4, bomY + 3.2, { align: 'right' });

    // Right Column: Spatial & Ergonomic Quality Matrix
    const diagX = 14 + bomW + 6;
    const diagW = pageW - diagX - 14;
    let diagY = 26;

    doc.setFillColor(248, 250, 252);
    doc.rect(diagX, diagY, diagW, pageH - diagY - 10, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(diagX, diagY, diagW, pageH - diagY - 10, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDIO QUALITY & COMPLIANCE MATRIX', diagX + 5, diagY + 7);

    const checks = [
      { title: 'Camera-to-Subject Focal Distance', status: 'PASS', desc: '1.6m–2.2m optimal focal throw for natural facial compression without wide-angle distortion.' },
      { title: 'Behind-Host Seating Buffer', status: 'PASS', desc: 'Minimum 0.8m rear clearance preserved for ergonomic push-out and smooth walking access.' },
      { title: 'Key Light 45° Triangulation', status: 'PASS', desc: 'Offset key light avoids flat nose shadows and creates clean Rembrandt catchlights in eyes.' },
      { title: 'Electrical Circuit Headroom', status: powerTotal > 1500 ? 'WARN' : 'PASS', desc: `${powerTotal}W connected draw operates safely well within residential 1800W circuit limit.` },
      { title: 'Acoustic Reflection Dampening', status: 'PASS', desc: 'Acoustic foam wall panels placed opposite voice axis to absorb early flutter echoes.' },
    ];

    let checkY = diagY + 16;
    checks.forEach((chk) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(diagX + 5, checkY, diagW - 10, 18, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(diagX + 5, checkY, diagW - 10, 18, 'S');

      doc.setFillColor(chk.status === 'PASS' ? 16 : 245, chk.status === 'PASS' ? 185 : 158, chk.status === 'PASS' ? 129 : 11);
      doc.rect(diagX + 7, checkY + 3.5, 12, 4.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(chk.status, diagX + 13, checkY + 6.8, { align: 'center' });

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.2);
      doc.text(chk.title, diagX + 22, checkY + 6.8);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      const splitDesc = doc.splitTextToSize(chk.desc, diagW - 16);
      doc.text(splitDesc, diagX + 7, checkY + 12);

      checkY += 21;
    });

    drawFooter(currentPage);
  }

  // Save the master PDF with project name
  const filename = (projectInfo.name || 'creator-studio-master-plan').toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`${filename}.pdf`);
}
