'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface BouquetCardProps {
  note: {
    to: string;
    message: string;
    from: string;
  };
  cardTemplateId?: string; // Kept for interface compatibility
  isDecoding?: boolean;
  onDecodeComplete?: () => void;
  onClick?: () => void;
  className?: string;
}

const GLYPHS = '✦✧❖★*•°~#%@&';

export function BouquetCard({
  note,
  isDecoding = false,
  onDecodeComplete,
  onClick,
  className = '',
}: BouquetCardProps) {
  const recipient = note.to.trim() || 'Someone Special';
  const sender = note.from.trim() || 'A Friend';
  const rawMessage =
    note.message.trim() ||
    'Thinking of you and sending this freshly picked bouquet to brighten your day.';

  // Decoding animation state
  const [displayedMessage, setDisplayedMessage] = useState(
    isDecoding ? '' : rawMessage
  );
  const [isFinished, setIsFinished] = useState(!isDecoding);
  const animRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDecoding) {
      setDisplayedMessage(rawMessage);
      setIsFinished(true);
      return;
    }

    setIsFinished(false);
    let charIndex = 0;
    const totalChars = rawMessage.length;

    // Smooth character decoding effect
    animRef.current = setInterval(() => {
      charIndex += 2;
      if (charIndex >= totalChars) {
        setDisplayedMessage(rawMessage);
        setIsFinished(true);
        if (animRef.current) clearInterval(animRef.current);
        if (onDecodeComplete) onDecodeComplete();
      } else {
        const decodedPart = rawMessage.slice(0, charIndex);
        const randomGlyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        setDisplayedMessage(decodedPart + randomGlyph);
      }
    }, 28);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [isDecoding, rawMessage]);

  return (
    <div
      onClick={onClick}
      className={`relative w-full max-w-[420px] aspect-[4/5] rounded-2xl p-7 sm:p-9 flex flex-col justify-between bg-[#FFFDF9] border border-rose-100 shadow-[0_10px_30px_-5px_rgba(244,114,182,0.15)] select-text transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''
      } ${className}`}
    >
      {/* 4 Minimalist Corner Crop Brackets (matches authentic DigiBouquet letterhead) */}
      <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-rose-400 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-rose-400 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-rose-400 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-rose-400 rounded-br-sm pointer-events-none" />

      {/* 1. TOP-LEFT: RECIPIENT */}
      <div className="text-left pt-1">
        <p
          className="text-rose-500 text-2xl sm:text-3xl font-medium tracking-wide"
          style={{
            fontFamily: '"Caveat", "Playfair Display", "Brush Script MT", cursive',
          }}
        >
          To: {recipient}
        </p>
      </div>

      {/* 2. CENTER: THE PERSONAL MESSAGE */}
      <div className="my-auto py-4">
        <p
          className="text-stone-700 text-lg sm:text-xl leading-relaxed"
          style={{
            fontFamily: '"Caveat", "Playfair Display", "Brush Script MT", cursive',
            letterSpacing: '0.01em',
            minHeight: '4.5rem',
          }}
        >
          {displayedMessage}
          {isDecoding && !isFinished && (
            <span className="inline-block w-2 h-4 bg-rose-400 ml-1 animate-pulse" />
          )}
        </p>
      </div>

      {/* 3. BOTTOM-RIGHT: SENDER */}
      <div className="text-right pb-1">
        <p
          className="text-rose-500 text-xl sm:text-2xl font-medium"
          style={{
            fontFamily: '"Caveat", "Playfair Display", "Brush Script MT", cursive',
          }}
        >
          With love, {sender}
        </p>
      </div>
    </div>
  );
}
