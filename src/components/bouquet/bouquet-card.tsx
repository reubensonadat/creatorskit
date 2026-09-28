'use client';

import React, { useEffect, useState, useMemo } from 'react';

export interface NoteFontOption {
  id: string;
  name: string;
  shortName: string;
  category: 'typewriter' | 'handwriting' | 'serif';
  fontFamily: string;
}

export const NOTE_FONTS: NoteFontOption[] = [
  {
    id: 'space-mono',
    name: 'Typewriter Mono',
    shortName: 'Typewriter',
    category: 'typewriter',
    fontFamily: '"Space Mono", "Courier Prime", monospace',
  },
  {
    id: 'caveat',
    name: 'Cursive Script',
    shortName: 'Cursive',
    category: 'handwriting',
    fontFamily: '"Caveat", cursive',
  },
  {
    id: 'kalam',
    name: 'Warm Ink Hand',
    shortName: 'Warm Ink',
    category: 'handwriting',
    fontFamily: '"Kalam", cursive',
  },
  {
    id: 'special-elite',
    name: 'Vintage Press',
    shortName: 'Vintage Press',
    category: 'typewriter',
    fontFamily: '"Special Elite", monospace',
  },
  {
    id: 'indie-flower',
    name: 'Playful Doodle',
    shortName: 'Playful',
    category: 'handwriting',
    fontFamily: '"Indie Flower", cursive',
  },
  {
    id: 'shadows',
    name: 'Delicate Script',
    shortName: 'Delicate',
    category: 'handwriting',
    fontFamily: '"Shadows Into Light", cursive',
  },
  {
    id: 'playfair',
    name: 'Editorial Serif',
    shortName: 'Editorial',
    category: 'serif',
    fontFamily: '"Playfair Display", Georgia, serif',
  },
  {
    id: 'eb-garamond',
    name: 'Classic Literary',
    shortName: 'Literary',
    category: 'serif',
    fontFamily: '"EB Garamond", Georgia, serif',
  },
];

export function getDynamicNameFontSize(text: string, baseRem = 1.25, minRem = 0.72): string {
  const len = (text || '').trim().length;
  if (len <= 10) return `${baseRem}rem`;
  const factor = Math.max(0, Math.min(1, (len - 10) / 26));
  const rem = baseRem - factor * (baseRem - minRem);
  return `${Math.round(rem * 100) / 100}rem`;
}

export function getDynamicMessageStyle(
  text: string,
  fontId?: string
): {
  fontSize: string;
  lineHeight: string;
  paddingClass: string;
} {
  const clean = text || '';
  const charCount = clean.length;
  const lineBreaks = (clean.match(/\n/g) || []).length;
  // Effective character load accounting for line breaks
  const effectiveScore = charCount + lineBreaks * 34;

  const cleanFont = (fontId || '').toLowerCase();
  const isTypewriter = cleanFont.includes('mono') || cleanFont.includes('elite');
  // Typewriter fonts have wider fixed-pitch glyphs, so scale down slightly more
  const factor = isTypewriter ? 0.94 : 1.0;

  if (effectiveScore <= 70) {
    return {
      fontSize: `${(1.22 * factor).toFixed(2)}rem`,
      lineHeight: '1.65',
      paddingClass: 'p-7 sm:p-9',
    };
  }
  if (effectiveScore <= 140) {
    return {
      fontSize: `${(1.08 * factor).toFixed(2)}rem`,
      lineHeight: '1.58',
      paddingClass: 'p-6 sm:p-8',
    };
  }
  if (effectiveScore <= 220) {
    return {
      fontSize: `${(0.96 * factor).toFixed(2)}rem`,
      lineHeight: '1.5',
      paddingClass: 'p-5 sm:p-7',
    };
  }
  if (effectiveScore <= 320) {
    return {
      fontSize: `${(0.84 * factor).toFixed(2)}rem`,
      lineHeight: '1.42',
      paddingClass: 'p-4 sm:p-6',
    };
  }
  if (effectiveScore <= 420) {
    return {
      fontSize: `${(0.76 * factor).toFixed(2)}rem`,
      lineHeight: '1.34',
      paddingClass: 'p-4 sm:p-5',
    };
  }
  // Up to 500 characters
  return {
    fontSize: `${(0.68 * factor).toFixed(2)}rem`,
    lineHeight: '1.26',
    paddingClass: 'p-3.5 sm:p-4.5',
  };
}

export interface CardNoteData {
  greeting?: string;
  to: string;
  message: string;
  closing?: string;
  from: string;
}

export interface BouquetCardProps {
  note: CardNoteData;
  onNoteChange?: (note: CardNoteData) => void;
  cardFont?: string;
  cardTemplateId?: string;
  editable?: boolean;
  isSelfWriting?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

export function BouquetCard({
  note,
  onNoteChange,
  cardFont = 'space-mono',
  editable = false,
  isSelfWriting = false,
  onComplete,
  onClose,
  onClick,
  className = '',
}: BouquetCardProps) {
  const greeting = note.greeting !== undefined ? note.greeting : 'Dear';
  const recipient = note.to.trim() || 'Beloved';
  const sender = note.from.trim() || 'Secret Admirer';
  const closing = note.closing !== undefined ? note.closing : 'Sincerely,';
  const rawMessage =
    note.message.trim() ||
    'I have so much to tell you, but only this much space on this card! Still, you must know...';

  // Resolve active font family
  const selectedFont = useMemo(() => {
    const norm = (cardFont || '').replace(/^font-/, '');
    const found = NOTE_FONTS.find((f) => f.id === norm || f.id === cardFont);
    return found?.fontFamily || '"Space Mono", monospace';
  }, [cardFont]);

  // Animation trigger state for playback
  const [animTrigger, setAnimTrigger] = useState(isSelfWriting ? 1 : 0);
  const [typedRecipient, setTypedRecipient] = useState(recipient);
  const [typedBody, setTypedBody] = useState(rawMessage);
  const [typedSender, setTypedSender] = useState(sender);
  const [activeCursor, setActiveCursor] = useState<'to' | 'body' | 'from' | null>(null);
  const [isFinished, setIsFinished] = useState(!isSelfWriting);

  const handleReplay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFinished(false);
    setAnimTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (editable || animTrigger === 0) {
      setTypedRecipient(recipient);
      setTypedBody(rawMessage);
      setTypedSender(sender);
      setActiveCursor(null);
      setIsFinished(true);
      return;
    }

    setTypedRecipient('');
    setTypedBody('');
    setTypedSender('');
    setActiveCursor('to');
    setIsFinished(false);

    let isCancelled = false;

    const runTypewriter = async () => {
      // 1. Recipient
      const fullTo = recipient;
      for (let i = 1; i <= fullTo.length; i++) {
        if (isCancelled) return;
        setTypedRecipient(fullTo.slice(0, i));
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 20));
      }

      await new Promise((r) => setTimeout(r, 180));
      if (isCancelled) return;
      setActiveCursor('body');

      // 2. Message body
      const fullBody = rawMessage;
      for (let i = 1; i <= fullBody.length; i++) {
        if (isCancelled) return;
        setTypedBody(fullBody.slice(0, i));
        const char = fullBody[i - 1];
        const delay =
          char === '.' || char === '!' || char === '?'
            ? 130
            : char === ','
            ? 70
            : 18 + Math.random() * 15;
        await new Promise((r) => setTimeout(r, delay));
      }

      await new Promise((r) => setTimeout(r, 220));
      if (isCancelled) return;
      setActiveCursor('from');

      // 3. Sender
      const fullFrom = sender;
      for (let i = 1; i <= fullFrom.length; i++) {
        if (isCancelled) return;
        setTypedSender(fullFrom.slice(0, i));
        await new Promise((r) => setTimeout(r, 35 + Math.random() * 20));
      }

      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled) return;
      setActiveCursor(null);
      setIsFinished(true);
      if (onComplete) onComplete();
    };

    runTypewriter();

    return () => {
      isCancelled = true;
    };
  }, [animTrigger, recipient, rawMessage, sender, editable, onComplete]);

  const isTypingActive = !editable && animTrigger > 0 && !isFinished;
  const displayTo = isTypingActive ? typedRecipient : recipient;
  const displayBody = isTypingActive ? typedBody : rawMessage;
  const displayFrom = isTypingActive ? typedSender : sender;

  const currentMessageText = editable ? note.message : rawMessage;
  const messageStyle = useMemo(() => {
    return getDynamicMessageStyle(currentMessageText, cardFont);
  }, [currentMessageText, cardFont]);

  return (
    <>
      {/* Direct Google Fonts stylesheet to ensure all 8 card fonts are loaded and immediate */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Courier+Prime:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Indie+Flower&family=Kalam:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Shadows+Into+Light&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap"
      />

      <div
        onClick={onClick}
        className={`relative w-full max-w-[460px] aspect-[4/3.6] bg-white border-2 border-black ${messageStyle.paddingClass} flex flex-col justify-between shadow-[4px_4px_0_#000] select-text transition-all ${
          onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
        } ${className}`}
        style={{
          fontFamily: selectedFont,
        }}
      >

        {/* ── TOP: [GREETING] [RECIPIENT] ── */}
        <div className="text-left flex items-baseline gap-1.5 w-full text-black">
          {editable ? (
            <>
              <input
                type="text"
                value={note.greeting !== undefined ? note.greeting : 'Dear'}
                onChange={(e) =>
                  onNoteChange?.({
                    ...note,
                    greeting: e.target.value,
                  })
                }
                placeholder="Dear"
                maxLength={20}
                style={{
                  fontFamily: selectedFont,
                  width: `${Math.max(2, ((note.greeting !== undefined ? note.greeting : 'Dear') || '').length + 0.5)}ch`,
                }}
                className="bg-transparent border-b border-dashed border-stone-300 focus:border-black outline-none font-bold text-lg sm:text-xl text-black shrink-0"
                title="Edit greeting (e.g. Dear, Dearest, To)"
              />
              <input
                type="text"
                value={note.to}
                onChange={(e) =>
                  onNoteChange?.({
                    ...note,
                    to: e.target.value,
                  })
                }
                placeholder="Beloved"
                maxLength={40}
                style={{
                  fontFamily: selectedFont,
                  fontSize: getDynamicNameFontSize(note.to, 1.25, 0.75),
                }}
                className="flex-1 min-w-[60px] bg-transparent border-b border-dashed border-stone-300 focus:border-black outline-none px-1 font-normal text-black placeholder:text-stone-400"
                title="Edit recipient name"
              />
            </>
          ) : (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-bold text-lg sm:text-xl">
                {note.greeting !== undefined ? note.greeting : 'Dear'}
              </span>
              <span
                className="font-normal"
                style={{
                  fontSize: getDynamicNameFontSize(displayTo, 1.25, 0.75),
                }}
              >
                {displayTo}
                {activeCursor === 'to' && (
                  <span className="inline-block w-[2px] h-4 bg-black ml-0.5 animate-pulse align-middle" />
                )}
              </span>
            </div>
          )}
        </div>

        {/* ── CENTER: MESSAGE BODY ── */}
        <div className="my-2.5 flex-1 flex flex-col justify-center min-h-0">
          {editable ? (
            <div className="relative w-full h-full flex flex-col">
              <textarea
                value={note.message}
                onChange={(e) =>
                  onNoteChange?.({
                    ...note,
                    message: e.target.value,
                  })
                }
                placeholder="I have so much to tell you, but only this much space on this card! Still, you must know..."
                maxLength={500}
                rows={5}
                style={{
                  fontFamily: selectedFont,
                  fontSize: messageStyle.fontSize,
                  lineHeight: messageStyle.lineHeight,
                }}
                className="w-full flex-1 bg-transparent resize-none border-none outline-none font-normal text-black placeholder:text-stone-400 placeholder:font-normal"
              />
              <div
                style={{ fontFamily: 'monospace' }}
                className="text-right text-[10px] text-stone-400 uppercase tracking-widest mt-1 select-none font-normal"
              >
                {note.message.length} / 500
              </div>
            </div>
          ) : (
            <p
              className="font-normal text-black whitespace-pre-wrap break-words"
              style={{
                fontFamily: selectedFont,
                fontSize: messageStyle.fontSize,
                lineHeight: messageStyle.lineHeight,
              }}
            >
              {displayBody}
              {activeCursor === 'body' && (
                <span className="inline-block w-[2px] h-4 bg-black ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>

        {/* ── BOTTOM RIGHT: [CLOSING] [SENDER] ── */}
        <div className="text-right flex flex-col items-end gap-1 w-full text-black">
          {editable ? (
            <>
              <input
                type="text"
                value={note.closing !== undefined ? note.closing : 'Sincerely,'}
                onChange={(e) =>
                  onNoteChange?.({
                    ...note,
                    closing: e.target.value,
                  })
                }
                placeholder="Sincerely,"
                maxLength={24}
                style={{
                  fontFamily: selectedFont,
                  width: `${Math.max(4, ((note.closing !== undefined ? note.closing : 'Sincerely,') || '').length + 0.5)}ch`,
                }}
                className="bg-transparent border-b border-dashed border-stone-300 focus:border-black outline-none text-right font-bold text-base sm:text-lg text-black"
                title="Edit sign-off (e.g. Sincerely, With love, Forever yours)"
              />
              <input
                type="text"
                value={note.from}
                onChange={(e) =>
                  onNoteChange?.({
                    ...note,
                    from: e.target.value,
                  })
                }
                placeholder="Secret Admirer"
                maxLength={40}
                style={{
                  fontFamily: selectedFont,
                  fontSize: getDynamicNameFontSize(note.from, 1.15, 0.72),
                }}
                className="w-full max-w-[320px] bg-transparent border-b border-dashed border-stone-300 focus:border-black outline-none px-1 text-right font-normal text-black placeholder:text-stone-400"
                title="Edit sender name"
              />
            </>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-bold text-base sm:text-lg">
                {note.closing !== undefined ? note.closing : 'Sincerely,'}
              </span>
              <span
                className="font-normal"
                style={{
                  fontSize: getDynamicNameFontSize(displayFrom, 1.15, 0.72),
                }}
              >
                {displayFrom}
                {activeCursor === 'from' && (
                  <span className="inline-block w-[2px] h-4 bg-black ml-0.5 animate-pulse align-middle" />
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
