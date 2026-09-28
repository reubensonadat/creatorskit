'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  ReceiptPrinter,
  ReceiptPrinterStage,
} from '@/components/receipt-printer';
import { BouquetCanvas } from './bouquet-canvas';
import { BouquetCard } from './bouquet-card';
import { ArrangedElement } from '@/lib/bouquet/arrangement';
import {
  X,
  Download,
  Share2,
  Check,
  Printer,
  Sparkles,
  Heart,
  RotateCcw,
} from 'lucide-react';
import { toPng } from 'html-to-image';

interface BouquetPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  greeneryLayers: ArrangedElement[];
  flowerLayers: ArrangedElement[];
  cardTemplateId: string;
  note: {
    to: string;
    message: string;
    from: string;
  };
  shareUrl?: string;
  onShare?: () => Promise<string>;
  cardPlacement?: 'right' | 'left' | 'bottom';
}

export function BouquetPrinterModal({
  isOpen,
  onClose,
  greeneryLayers,
  flowerLayers,
  cardTemplateId,
  note,
  shareUrl,
  onShare,
  cardPlacement = 'right',
}: BouquetPrinterModalProps) {
  const [stage, setStage] = useState<ReceiptPrinterStage>('processing');
  const [copied, setCopied] = useState(false);
  const [activeUrl, setActiveUrl] = useState(shareUrl || '');
  const [isExporting, setIsExporting] = useState(false);
  const [placement, setPlacement] = useState<'right' | 'left' | 'bottom'>(cardPlacement);

  const startPrintingSequence = () => {
    setStage('processing');
    const t1 = setTimeout(() => {
      setStage('printing');
    }, 700);

    const t2 = setTimeout(() => {
      setStage('complete');
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  };

  useEffect(() => {
    if (!isOpen) {
      setStage('processing');
      return;
    }

    const cleanup = startPrintingSequence();

    if (!shareUrl && onShare) {
      onShare().then((url) => {
        if (url) setActiveUrl(url);
      });
    }

    return cleanup;
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    let url = activeUrl;
    if (!url && onShare) {
      url = await onShare();
      setActiveUrl(url);
    }
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPng = async () => {
    const el = document.getElementById('bouquet-print-document');
    if (!el) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = `bouquet-keepsake-for-${(note.to || 'special-someone').toLowerCase().replace(/\s+/g, '-')}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error('Failed to export PNG', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[96vh] flex flex-col bg-[#09090b] border-2 border-zinc-700 rounded-xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black uppercase tracking-wider bg-[#FFE500] text-black px-2 py-0.5 rounded border border-black">
              OFFICIAL PRINTER
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                Keepsake Card &amp; Bouquet Printout
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startPrintingSequence}
              className="p-1.5 text-zinc-400 hover:text-white rounded border border-zinc-700 hover:border-zinc-500 font-mono text-xs flex items-center gap-1 transition-colors"
              title="Replay print sequence"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reprint</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Customization Toolbar */}
        <div className="px-5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 uppercase font-bold text-[11px]">Card Placement:</span>
            {(['right', 'left', 'bottom'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setPlacement(pos)}
                className={`px-2.5 py-1 rounded border uppercase text-[10px] font-bold transition-all ${
                  placement === pos
                    ? 'bg-[#FFE500] text-black border-black shadow-[2px_2px_0_#000]'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400">
            {stage === 'processing'
              ? 'Warming up printer head…'
              : stage === 'printing'
              ? 'Feeding out botanical keepsake sheet…'
              : 'Print sheet ready!'}
          </div>
        </div>

        {/* Scrollable Center: Physical Animated Printer */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-zinc-950">
          <ReceiptPrinter.Root
            stage={stage}
            feedMotion="stepped"
            className="w-full max-w-2xl mx-auto"
          >
            <ReceiptPrinter.Machine>
              <ReceiptPrinter.Header>
                <ReceiptPrinter.Status>
                  {stage === 'processing'
                    ? 'Preparing botanical keepsake…'
                    : stage === 'printing'
                    ? 'Printing Bouquet & Note Sheet…'
                    : 'Keepsake Print Complete'}
                </ReceiptPrinter.Status>
                <span className="rounded bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                  CREATORKIT
                </span>
              </ReceiptPrinter.Header>

              <ReceiptPrinter.Screen>
                <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                  <span>To: {note.to || 'Someone Special'}</span>
                  <span>{stage === 'complete' ? 'READY' : 'PRINTING'}</span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                  From: {note.from || 'A Friend'} · Verified Botanical Gift
                </p>
              </ReceiptPrinter.Screen>
            </ReceiptPrinter.Machine>

            {/* Output slot where document feeds out */}
            <ReceiptPrinter.Output className="h-[36rem] sm:h-[42rem]">
              <ReceiptPrinter.Paper
                variant="document"
                className="p-4 sm:p-6 rounded-lg border-2 border-zinc-300 bg-[#FAF7F2] text-stone-900 shadow-xl"
              >
                {/* Printable Document Container */}
                <div id="bouquet-print-document" className="w-full flex flex-col items-center">
                  {/* Document Header */}
                  <div className="w-full pb-3 mb-4 border-b-2 border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-stone-500 block">
                        CREATORKIT BOTANICAL ATELIER
                      </span>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                        Official Botanical Keepsake Edition
                      </h3>
                    </div>
                    <div className="text-right font-mono text-[9px] text-stone-500">
                      <div>DISPATCH REF: BQ-{Math.abs(note.to.length * 137).toString(16).toUpperCase()}</div>
                      <div>AUTHENTIC CLIENT-SIDE PRINT</div>
                    </div>
                  </div>

                  {/* Main Document Body: Bouquet & Card based on placement */}
                  <div
                    className={`w-full flex items-center justify-center gap-6 ${
                      placement === 'bottom'
                        ? 'flex-col'
                        : placement === 'left'
                        ? 'flex-col sm:flex-row-reverse'
                        : 'flex-col sm:flex-row'
                    }`}
                  >
                    {/* Bouquet Canvas */}
                    <div className="w-full max-w-[340px] shrink-0">
                      <BouquetCanvas
                        greeneryLayers={greeneryLayers}
                        flowerLayers={flowerLayers}
                        showRibbon={true}
                        className="w-full aspect-[4/5] shadow-md border-2 border-black"
                      />
                    </div>

                    {/* Accompanying Structured Note Card */}
                    <div className="w-full max-w-[280px] shrink-0">
                      <BouquetCard
                        cardTemplateId={cardTemplateId}
                        note={note}
                        className="w-full aspect-[4/5] shadow-md border-2 border-black"
                      />
                    </div>
                  </div>

                  {/* Document Footer */}
                  <div className="mt-5 pt-3 border-t-2 border-dashed border-stone-400 w-full flex items-center justify-between text-[11px] text-stone-600 font-mono">
                    <span className="flex items-center gap-1 font-bold">
                      <Heart size={13} className="text-rose-600 fill-rose-600" />
                      GIFT DISPATCH FROM {note.from.toUpperCase() || 'FRIEND'}
                    </span>
                    <span className="text-[10px]">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </ReceiptPrinter.Paper>
            </ReceiptPrinter.Output>
          </ReceiptPrinter.Root>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPng}
              disabled={isExporting}
              className="px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download size={14} />
              <span>{isExporting ? 'EXPORTING...' : 'SAVE PRINT PNG'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 transition-all flex items-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>COPIED LINK!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>COPY SHARE LINK</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider font-mono bg-[#FFE500] text-black border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer font-black"
          >
            <Printer size={15} />
            <span>SEND TO HARDWARE PRINTER</span>
          </button>
        </div>
      </div>
    </div>
  );
}
