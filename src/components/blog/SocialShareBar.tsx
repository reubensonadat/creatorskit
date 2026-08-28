'use client';

import React, { useState } from 'react';
import { Share2, Twitter, MessageCircle, Linkedin, Link2, Check } from 'lucide-react';

interface SocialShareBarProps {
  title: string;
  slug: string;
}

export default function SocialShareBar({ title, slug }: SocialShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const encodedUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';
  const encodedTitle = encodeURIComponent(title);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 0',
        borderTop: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#666', marginRight: 4 }}>
        SHARE:
      </span>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: '#000000',
          color: '#ffffff',
          border: '1.5px solid #000000',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <Twitter size={12} />
        X
      </a>

      {/* WhatsApp */}
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: '#25D366',
          color: '#000000',
          border: '1.5px solid #000000',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <MessageCircle size={12} />
        WhatsApp
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: '#0A66C2',
          color: '#ffffff',
          border: '1.5px solid #000000',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <Linkedin size={12} />
        LinkedIn
      </a>

      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: copied ? '#15803d' : '#ffffff',
          color: copied ? '#ffffff' : '#000000',
          border: '1.5px solid #000000',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {copied ? <Check size={12} /> : <Link2 size={12} />}
        {copied ? 'COPIED' : 'COPY LINK'}
      </button>
    </div>
  );
}
