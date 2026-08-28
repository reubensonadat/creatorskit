'use client';

import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Mail } from 'lucide-react';

export default function NewsletterCard() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section
      style={{
        marginTop: 40,
        background: '#FFE500',
        border: '2.5px solid #000000',
        boxShadow: '4px 4px 0 #000000',
        borderRadius: 4,
        padding: 'clamp(20px, 4vw, 28px)',
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 900,
            color: '#000000',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            background: '#ffffff',
            border: '1.5px solid #000',
            padding: '2px 8px',
            borderRadius: 3,
            boxShadow: '1.5px 1.5px 0 #000',
            display: 'inline-block',
          }}
        >
          WEEKLY CREATOR PLAYBOOK
        </span>
      </div>

      <h3
        style={{
          fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
          fontWeight: 900,
          color: '#000000',
          letterSpacing: '-0.02em',
          margin: '0 0 6px',
        }}
      >
        Get Notified When We Drop New Breakdowns
      </h3>

      <p
        style={{
          fontSize: '0.88rem',
          color: '#18181b',
          lineHeight: 1.45,
          margin: '0 0 18px',
          maxWidth: 640,
          fontWeight: 600,
        }}
      >
        Tactical retention formulas, brand deal negotiation templates, and algorithm case studies. Zero spam.
      </p>

      {submitted ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#ffffff',
            border: '2px solid #000',
            borderRadius: 4,
            color: '#000',
            padding: '12px 18px',
            fontWeight: 800,
            fontSize: '0.88rem',
            boxShadow: '2px 2px 0 #000',
            fontFamily: 'monospace',
          }}
        >
          <CheckCircle2 size={18} color="#16a34a" />
          <span>You&apos;re subscribed! You&apos;ll get our next case study right in your inbox.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="email"
            required
            placeholder="Enter your creator email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              minWidth: 240,
              padding: '10px 14px',
              border: '2px solid #000',
              borderRadius: 4,
              fontSize: '0.86rem',
              fontWeight: 700,
              outline: 'none',
              background: '#ffffff',
              color: '#000',
              boxShadow: '2px 2px 0 #000',
              fontFamily: 'monospace',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: '#000000',
              color: '#FFE500',
              border: '2px solid #000',
              borderRadius: 4,
              fontWeight: 900,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 #000',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Subscribe
            <ArrowRight size={14} />
          </button>
        </form>
      )}
    </section>
  );
}
