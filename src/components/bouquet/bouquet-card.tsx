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

export interface BouquetCardProps {
  note: {
    to: string;
    message: string;
    from: string;
    closing?: string;
  };
  onNoteChange?: (note: {
    to: string;
    message: string;
    from: string;
    closing?: string;
  }) => void;
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
  const recipient = note.to.trim() || 'Beloved';
  const sender = note.from.trim() || 'Secret Admirer';
  const closing = note.closing?.trim() || 'Sincerely';
  const rawMessage =
    note.message.trim() ||
    'I have so much to tell you, but only this much space on this card! Still, you must know...';

  // Resolve active font family
  const selectedFont = useMemo(() => {
    const found = NOTE_FONTS.find((f) => f.id === cardFont);
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

  return (
    <>
      {/* Direct Google Fonts stylesheet to ensure all 8 card fonts are loaded and immediate */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Courier+Prime:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Indie+Flower&family=Kalam:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Shadows+Into+Light&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap"
      />

      <div
        onClick={onClick}
        className={`relative w-full max-w-[460px] aspect-[4/3.6] bg-white border-2 border-black p-7 sm:p-9 flex flex-col justify-between shadow-[4px_4px_0_#000] select-text transition-all ${
          onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
        } ${className}`}
        style={{
          fontFamily: selectedFont,
        }}
      >

        {/* ── TOP: DEAR [RECIPIENT], ── */}
        <div className="text-left flex items-baseline gap-1.5 text-lg sm:text-xl text-black">
          <span className="font-bold">Dear</span>
          {editable ? (
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
              maxLength={36}
              style={{ fontFamily: selectedFont }}
              className="bg-transparent border-b border-dashed border-stone-300 focus:border-black outline-none px-1 font-normal text-black placeholder:text-stone-400 placeholder:font-normal min-w-[80px] max-w-[240px]"
            />
          ) : (
            <span className="font-normal">
              {displayTo}
              {activeCursor === 'to' && (
                <span className="inline-block w-[2px] h-4 bg-black ml-0.5 animate-pulse align-middle" />
              )}
            </span>
          )}
          <span className="font-bold">,</span>
        </div>

        {/* ── CENTER: MESSAGE BODY ── */}
        <div className="my-3 flex-1 flex flex-col justify-center">
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
                style={{ fontFamily: selectedFont }}
                className="w-full flex-1 bg-transparent resize-none border-none outline-none text-base sm:text-lg leading-relaxed font-normal text-black placeholder:text-stone-400 placeholder:font-normal"
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
              className="text-base sm:text-lg leading-relaxed font-normal text-black whitespace-pre-wrap break-words"
              style={{ fontFamily: selectedFont }}
            >
              {displayBody}
              {activeCursor === 'body' && (
                <span className="inline-block w-[2px] h-4 bg-black ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>

        {/* ── BOTTOM RIGHT: SINCERELY, [SENDER] ── */}
        <div className="text-right flex flex-col items-end gap-0.5 text-base sm:text-lg text-black">
          <span className="font-bold">{closing},</span>
          {editable ? (
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
              maxLength={36}
              style={{ fontFamily: selectedFont }}
              className="bg-transparent border-b border-dashed border-stone-300 focus:border-black outline-none px-1 text-right font-normal text-black placeholder:text-stone-400 placeholder:font-normal min-w-[80px] max-w-[240px]"
            />
          ) : (
            <span className="font-normal">
              {displayFrom}
              {activeCursor === 'from' && (
                <span className="inline-block w-[2px] h-4 bg-black ml-0.5 animate-pulse align-middle" />
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
