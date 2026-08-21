import type { PlacedObject, Currency, ProjectInfo } from '@/components/space-planner/types';
import { EQUIPMENT_CATALOG } from '@/components/space-planner/equipment';

const CURRENCY_SYMBOLS: Record<Currency, string> = { GHS: 'GH\u20b5', NGN: '\u20a6' };

// ============ PNG Export ============
export function exportPNG(canvas: HTMLCanvasElement, filename: string = 'space-planner'): void {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============ PDF Export ============
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
  const sym = CURRENCY_SYMBOLS[currency];

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Title bar
  doc.setFillColor(42, 40, 38);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(245, 241, 234);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Creator Space Planner \u2014 Setup Sheet', 14, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${projectInfo.name || 'Untitled'} \u00b7 ${new Date().toLocaleDateString()}`, 140, 18);

  // 3D Scene image
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgX = 14;
  const imgY = 35;
  const imgW = pageW * 0.55;
  const imgH = pageH - 50;
  doc.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);

  // Info panel (right side)
  const infoX = imgX + imgW + 10;
  const infoY = 35;
  const infoW = pageW - infoX - 14;

  // Project info section
  doc.setTextColor(42, 40, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Details', infoX, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let y = infoY + 14;
  const drawLine = (label: string, value: string) => {
    doc.setTextColor(107, 104, 99);
    doc.text(label, infoX, y);
    doc.setTextColor(42, 40, 38);
    doc.text(value, infoX + 35, y);
    y += 6;
  };

  drawLine('Name:', projectInfo.name || '\u2014');
  drawLine('Location:', projectInfo.location || '\u2014');
  drawLine('Supplier:', projectInfo.supplierContact || '\u2014');
  drawLine('Room:', `${roomWidth}m \u00d7 ${roomDepth}m`);
  drawLine('Items:', `${placedObjects.length} pieces`);
  drawLine('Power:', `~${powerTotal}W`);

  // Equipment list
  y += 4;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Equipment List', infoX, y);
  y += 8;

  // Group by type
  const grouped = new Map<string, number>();
  placedObjects.forEach((o) => {
    const name = EQUIPMENT_CATALOG[o.equipmentId].name;
    grouped.set(name, (grouped.get(name) || 0) + 1);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  grouped.forEach((count, name) => {
    if (y > pageH - 30) return;
    doc.setTextColor(107, 104, 99);
    doc.text(name, infoX, y);
    doc.setTextColor(42, 40, 38);
    doc.text(`\u00d7${count}`, infoX + infoW - 10, y);
    y += 5;
  });

  // Budget total
  y += 6;
  if (y < pageH - 25) {
    doc.setDrawColor(226, 216, 197);
    doc.line(infoX, y, infoX + infoW, y);
    y += 6;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(199, 93, 63);
    doc.text(`Total: ${sym}${budgetTotal.toLocaleString()}`, infoX, y);
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    'Creator Space Planner \u00b7 Planning guidance only \u00b7 Not a compliance document',
    14, pageH - 5
  );

  doc.save(`${projectInfo.name || 'space-planner'}.pdf`);
}
