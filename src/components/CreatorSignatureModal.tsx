'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PenTool, RotateCcw, X, Check } from 'lucide-react';

export interface CreatorSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onSave: (dataUrl: string, name?: string) => void;
  title?: string;
  subtitle?: string;
}

export default function CreatorSignatureModal({
  isOpen,
  onClose,
  initialName,
  onSave,
  title = 'Your Electronic Signature',
  subtitle = 'Sign here once. Your signature stays saved on this device forever in your Brand Kit and will auto-sign your invoices, contracts, receipts, and uploaded documents.',
}: CreatorSignatureModalProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedText, setTypedText] = useState(initialName || '');
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setTypedText(initialName || '');
      setHasDrawn(false);
      const timer = setTimeout(() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (mode === 'draw') {
      if (canvasRef.current && hasDrawn) {
        const url = canvasRef.current.toDataURL('image/png');
        onSave(url, typedText || initialName);
      }
    } else {
      const text = typedText.trim() || initialName || 'Signature';
      const offscreen = document.createElement('canvas');
      offscreen.width = 460;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'normal 44px Caveat, cursive, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.translate(16, 60);
        ctx.rotate(-0.035);
        ctx.fillText(text, 0, 0);
        const url = offscreen.toDataURL('image/png');
        onSave(url, text);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#000000',
          border: '2px solid #000000',
          borderRadius: 8,
          boxShadow: '6px 6px 0 #000000',
          width: '100%',
          maxWidth: 480,
          padding: '24px 22px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#000', color: '#fff', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 2 }}>
                BRAND KIT &bull; eSIGN
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>{title}</h3>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#4b5563', lineHeight: 1.4 }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setMode('draw')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: mode === 'draw' ? '#000' : '#f3f4f6',
              color: mode === 'draw' ? '#fff' : '#000',
              border: '1.5px solid #000',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <PenTool size={13} /> DRAW SIGNATURE
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: mode === 'type' ? '#000' : '#f3f4f6',
              color: mode === 'type' ? '#fff' : '#000',
              border: '1.5px solid #000',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            TYPE SCRIPT
          </button>
        </div>

        {mode === 'draw' ? (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <canvas
              ref={canvasRef}
              width={440}
              height={130}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{
                width: '100%',
                height: 130,
                background: '#fafafa',
                border: '2px dashed #9ca3af',
                borderRadius: 4,
                cursor: 'crosshair',
                touchAction: 'none',
                display: 'block',
              }}
            />
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '0.62rem', color: '#9ca3af', fontFamily: 'monospace', pointerEvents: 'none' }}>
              Sign with finger or mouse inside the box
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              title="Clear drawing"
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 3,
                padding: '3px 8px',
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RotateCcw size={11} /> Clear
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your legal name..."
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1.5px solid #000',
                borderRadius: 4,
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ background: '#fafafa', border: '1.5px solid #e5e7eb', borderRadius: 4, padding: '16px 20px', minHeight: 70, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Caveat, cursive, sans-serif', fontSize: '36px', color: '#0f172a', lineHeight: 1, transform: 'rotate(-2deg)' }}>
                {typedText.trim() || 'Your Signature'}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#f3f4f6',
              border: '1.5px solid #000',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={mode === 'draw' && !hasDrawn}
            style={{
              flex: 2,
              padding: '10px 14px',
              background: mode === 'draw' && !hasDrawn ? '#9ca3af' : '#000000',
              color: '#ffffff',
              border: '1.5px solid #000',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              cursor: mode === 'draw' && !hasDrawn ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Check size={14} /> Save Signature to Device
          </button>
        </div>
      </div>
    </div>
  );
}
