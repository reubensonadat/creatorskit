'use client';

import React, { useState } from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';

export default function ArticlePoll() {
  const [selected, setSelected] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const options = [
    { label: 'Yes, always start with a misconception hook', votes: 78 },
    { label: 'No, I usually introduce myself or the topic first', votes: 22 },
  ];

  const handleVote = (idx: number) => {
    setSelected(idx);
    setHasVoted(true);
  };

  return (
    <div
      style={{
        background: '#111827',
        color: '#ffffff',
        border: '3px solid #000000',
        boxShadow: '4px 4px 0 #000000',
        padding: '18px 20px',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BarChart3 size={16} color="#FFE500" />
        <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', color: '#FFE500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          CREATOR POLL
        </span>
      </div>

      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.35, margin: '0 0 14px', color: '#ffffff' }}>
        Do you break down a misconception in the first 5 seconds of your videos?
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((opt, idx) => {
          const isSelected = selected === idx;
          const percentage = isSelected ? opt.votes + 1 : opt.votes;
          return (
            <button
              key={idx}
              disabled={hasVoted}
              onClick={() => handleVote(idx)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: isSelected ? '#FFE500' : '#1f2937',
                color: isSelected ? '#000000' : '#ffffff',
                border: '1.5px solid #374151',
                borderRadius: 4,
                cursor: hasVoted ? 'default' : 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.12s',
              }}
            >
              <span>{opt.label}</span>
              {hasVoted && (
                <span style={{ fontWeight: 900, marginLeft: 8 }}>
                  {percentage}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasVoted && (
        <div style={{ marginTop: 10, fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace', textAlign: 'right' }}>
          ✓ 1,248 creators voted
        </div>
      )}
    </div>
  );
}
