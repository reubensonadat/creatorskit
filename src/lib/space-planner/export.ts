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
  ctx.fillText(`↔ WIDTH: ${roomWidth.toFixed(2)} m (${(roomWidth * 3.28084).toFixed(1)} ft)`, roomLeft + roomPxW / 2, dimTopY - 14);

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
  const tbW = 500;
  const tbH = 120;
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
  ctx.fillText(`TOP 3D ORTHOGRAPHIC BLUEPRINT`, tbX + 18, tbY + 30);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '13px monospace';
  ctx.fillText(`PROJECT: ${projectInfo.name || 'CREATOR STUDIO'}`, tbX + 18, tbY + 56);
  ctx.fillText(`STUDIO FLOOR AREA: ${(roomWidth * roomDepth).toFixed(1)} m² (${(roomWidth * roomDepth * 10.7639).toFixed(0)} sq ft)`, tbX + 18, tbY + 78);
  ctx.fillText(`EQUIPMENT PLACED: ${placedObjects.length} UNITS`, tbX + 18, tbY + 100);

  return canvas.toDataURL('image/jpeg', 0.95);
}

// ============ Multi-Angle Master PDF Export ============
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
  const curr = CURRENCY_PREFIXES[currency] || 'GHS ';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const pageH = doc.internal.pageSize.getHeight(); // 210mm

  // Capture all 5 3D camera angles from WebGL Canvas
  let angles: Record<string, string> | null = null;
  if (typeof window !== 'undefined' && typeof (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__ === 'function') {
    try {
      angles = (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__();
    } catch {}
  }

  const hero3D = angles?.hero3D || canvas.toDataURL('image/jpeg', 0.95);
  const front = angles?.front || hero3D;
  const left45 = angles?.left45 || hero3D;
  const right45 = angles?.right45 || hero3D;
  const top3D = angles?.top3D || hero3D;

  const blueprintTop = await generate2DBlueprintSchematic(placedObjects, roomWidth, roomDepth, projectInfo, top3D);

  // ==========================================
  // PAGE 1: 3D MULTI-ANGLE STUDIO PERSPECTIVES
  // ==========================================
  // Dark Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('CREATOR STUDIO SETUP — 3D PERSPECTIVES CONTACT SHEET', 14, 16);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${projectInfo.name || 'Untitled Studio'} · ${roomWidth}m × ${roomDepth}m · ${new Date().toLocaleDateString()}`, pageW - 14, 16, { align: 'right' });

  // 2x2 Matrix of 4 3D Views (Cleanly proportioned, non-overlapping)
  const padX = 14;
  const padY = 30;
  const gap = 6;
  const colW = (pageW - padX * 2 - gap) / 2; // ~131mm
  const rowH = (pageH - padY - 16 - gap) / 2; // ~79mm

  // View 1: Hero 3D (Top-Left)
  doc.addImage(hero3D, 'JPEG', padX, padY, colW, rowH);
  doc.setFillColor(15, 23, 42);
  doc.rect(padX, padY + rowH - 6.5, colW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. HERO 3D OVERVIEW (ISOMETRIC VANTAGE)', padX + 4, padY + rowH - 2);

  // View 2: Front Eye-Level (Top-Right)
  doc.addImage(front, 'JPEG', padX + colW + gap, padY, colW, rowH);
  doc.setFillColor(15, 23, 42);
  doc.rect(padX + colW + gap, padY + rowH - 6.5, colW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('2. FRONT TALENT / STAGE VIEW (EYE-LEVEL 1.6M)', padX + colW + gap + 4, padY + rowH - 2);

  // View 3: Left 45° Coverage (Bottom-Left)
  doc.addImage(left45, 'JPEG', padX, padY + rowH + gap, colW, rowH);
  doc.setFillColor(15, 23, 42);
  doc.rect(padX, padY + rowH * 2 + gap - 6.5, colW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('3. LEFT 45-DEGREE CAMERA COVERAGE', padX + 4, padY + rowH * 2 + gap - 2);

  // View 4: Right 45° Coverage (Bottom-Right)
  doc.addImage(right45, 'JPEG', padX + colW + gap, padY + rowH + gap, colW, rowH);
  doc.setFillColor(15, 23, 42);
  doc.rect(padX + colW + gap, padY + rowH * 2 + gap - 6.5, colW, 6.5, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('4. RIGHT 45-DEGREE CAMERA COVERAGE', padX + colW + gap + 4, padY + rowH * 2 + gap - 2);

  // Footer Page 1
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Creator Space Planner · Multi-Perspective Visual Proofs · Page 1 of 2', 14, pageH - 4);

  // ==========================================
  // PAGE 2: TOP 3D BLUEPRINT & BILL OF MATERIALS
  // ==========================================
  doc.addPage('a4', 'landscape');

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ARCHITECTURAL TOP 3D BLUEPRINT & EQUIPMENT SPECIFICATION', 14, 16);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Budget: ${curr}${budgetTotal.toLocaleString()} · Power Load: ${powerTotal}W`, pageW - 14, 16, { align: 'right' });

  // 3D Top-Down Blueprint View (Left Half)
  const bpW = 145;
  const bpH = pageH - 42;
  if (blueprintTop) {
    doc.addImage(blueprintTop, 'JPEG', 14, 30, bpW, bpH);
  }

  // Right Half: Project Summary & Equipment Table
  const tableX = 14 + bpW + 8;
  const tableW = pageW - tableX - 14;

  // 1. Studio Specifications Card
  doc.setFillColor(248, 250, 252);
  doc.rect(tableX, 30, tableW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(tableX, 30, tableW, 30, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Studio & Power Specifications', tableX + 4, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  let ySpec = 42;
  const drawSpecRow = (label: string, val: string) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, tableX + 4, ySpec);
    doc.setTextColor(15, 23, 42);
    doc.text(val, tableX + 38, ySpec);
    ySpec += 4.5;
  };

  drawSpecRow('Dimensions:', `${roomWidth}m × ${roomDepth}m (${(roomWidth * roomDepth).toFixed(1)} m² / ${(roomWidth * roomDepth * 10.7639).toFixed(0)} sq ft)`);
  drawSpecRow('Power Draw:', `${powerTotal} Watts (Est. ${(powerTotal / 1000).toFixed(2)} kWh)`);
  drawSpecRow('AC Circuit:', `${powerTotal > 1500 ? '20A Dedicated Breaker Required' : 'Standard 15A Studio Circuit'}`);
  drawSpecRow('Est. Budget:', `${curr}${budgetTotal.toLocaleString()}`);

  // 2. Equipment Bill of Materials Table
  let y = 65;
  doc.setFillColor(15, 23, 42);
  doc.rect(tableX, y, tableW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Gear Item', tableX + 3, y + 4.2);
  doc.text('Qty', tableX + tableW - 32, y + 4.2);
  doc.text('Power', tableX + tableW - 18, y + 4.2);
  doc.text('Subtotal', tableX + tableW - 2, y + 4.2, { align: 'right' });
  y += 9;

  const grouped = new Map<string, { count: number; watts: number; price: number; name: string }>();
  placedObjects.forEach((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    const name = def?.name || o.equipmentId;
    const price = currency === 'GHS' ? (def?.defaultPriceGHS || 0) : (def?.defaultPriceNGN || 0);
    const existing = grouped.get(o.equipmentId) || { count: 0, watts: def?.watts || 0, price, name };
    existing.count += 1;
    grouped.set(o.equipmentId, existing);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let isEven = false;
  grouped.forEach((data) => {
    if (y > pageH - 18) return;

    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y - 3.5, tableW, 4.8, 'F');
    }
    isEven = !isEven;

    doc.setTextColor(51, 65, 85);
    const truncName = data.name.length > 28 ? data.name.substring(0, 26) + '...' : data.name;
    doc.text(truncName, tableX + 3, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`×${data.count}`, tableX + tableW - 30, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`${data.watts * data.count}W`, tableX + tableW - 18, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`${curr}${(data.price * data.count).toLocaleString()}`, tableX + tableW - 2, y, { align: 'right' });
    y += 5.0;
  });

  // Total Summary Footer Bar on Page 2
  doc.setDrawColor(203, 213, 225);
  doc.line(tableX, y + 1, tableX + tableW, y + 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL SETUP COST:', tableX + 3, y + 6.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`${curr}${budgetTotal.toLocaleString()}`, tableX + tableW - 2, y + 6.5, { align: 'right' });

  // Footer Page 2
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CreatorKit Studio Space Planner · Architectural Blueprint & BOM · Page 2 of 2', 14, pageH - 4);

  doc.save(`${(projectInfo.name || 'Studio_Blueprint').replace(/\s+/g, '_')}_Master_Report.pdf`);
}
