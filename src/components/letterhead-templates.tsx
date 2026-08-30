'use client';

import React, { useEffect } from 'react';
import { injectInvoiceGoogleFont } from '@/lib/invoice-fonts';

export type LetterheadTemplateId = 'creative' | 'executive' | 'minimal';

export interface LetterheadItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface LetterheadData {
  // Creator
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
  creatorPhone: string;
  creatorLocation: string;
  creatorNiche: string;
  logoUrl?: string | null;

  // Client
  clientName: string;
  clientContact: string;
  clientEmail?: string;
  clientAddress?: string;

  // Letterhead Meta
  issueDate: string;
  letterheadNumber?: string;
  letterTitle?: string;
  audienceFocus?: string;
  engagementRate?: string;
  trackRecord?: string;

  // Proposal Content
  introText?: string;
  bodyText?: string;
  items: LetterheadItem[];
  totalAmount: number;
  currency: string;
  sym: string;

  // Styling
  headingFont?: string;
  bodyFont?: string;
  primaryColor?: string;
  accentColor?: string;
}

interface LetterheadTemplateProps {
  data: LetterheadData;
  showBranding?: boolean;
}

/* =========================================================================
   TEMPLATE 1: CREATIVE PITCH (Media Kit & High Conversion Package)
   ========================================================================= */
export function CreativePitchLetterhead({ data, showBranding = true }: LetterheadTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#111827',
        fontFamily: `${bodyFont}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        padding: 'clamp(28px, 4vw, 44px)',
        fontSize: '11.5px',
        lineHeight: 1.7,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 18, marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {data.logoUrl && (
            <img
              src={data.logoUrl}
              alt={`${data.creatorName} logo`}
              style={{ height: 48, width: 48, objectFit: 'contain', border: '1px solid #e5e7eb', background: '#fff', padding: 2 }}
            />
          )}
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#000' }}>
              {data.creatorName}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', marginTop: 1 }}>
              {data.creatorHandle} · {data.creatorNiche}
            </div>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: 2 }}>
              {data.creatorPhone} | {data.creatorEmail} | {data.creatorLocation}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            {data.letterTitle || 'Campaign Proposal'}
          </div>
          {data.letterheadNumber && (
            <div style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', color: '#6b7280', marginTop: 4 }}>
              REF: {data.letterheadNumber}
            </div>
          )}
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280' }}>
            DATE: {data.issueDate}
          </div>
        </div>
      </div>

      {/* Audience Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #e5e7eb', background: '#fafafa', padding: '12px 16px', marginBottom: 24, gap: 12 }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audience Focus</div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#111827', marginTop: 2 }}>{data.audienceFocus || 'Ghana & West Africa Diaspora'}</div>
        </div>
        <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 12 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Engagement</div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#111827', marginTop: 2 }}>{data.engagementRate || '82% Mobile · High Conversion'}</div>
        </div>
        <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 12 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Content Quality</div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#111827', marginTop: 2 }}>{data.trackRecord || '4K Cinematic Social Storytelling'}</div>
        </div>
      </div>

      <p style={{ margin: '0 0 12px' }}>Dear {data.clientContact || 'Partnerships Lead'},</p>
      <p style={{ margin: '0 0 12px' }}>
        {data.introText || `I am writing to officially propose a high-impact content partnership between ${data.creatorName} (${data.creatorHandle}) and ${data.clientName}.`}
      </p>
      <p style={{ margin: '0 0 16px' }}>
        {data.bodyText || `As an active ${data.creatorNiche} creator, my community trusts my recommendations for authentic product storytelling, high-retention hooks, and engaging short-form video. Below is the tailored package crafted to maximize your brand objectives:`}
      </p>

      {/* Package Table */}
      <div style={{ margin: '20px 0 24px' }}>
        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
          Recommended Campaign Package
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #111827' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 800 }}>Deliverable Item</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 800, width: '15%' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 800, width: '25%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 0', color: '#374151', fontWeight: 500 }}>{i.description}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{i.quantity}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                  {data.sym}{(i.quantity * i.rate).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid #111827', fontWeight: 900 }}>
              <td colSpan={2} style={{ padding: '10px 0', fontSize: '11.5px' }}>Total Package Investment</td>
              <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '12.5px' }}>
                {data.sym}{data.totalAmount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ margin: '0 0 24px' }}>
        I look forward to collaborating on this campaign. Feel free to contact me directly at {data.creatorPhone} or {data.creatorEmail} to align on timelines and creative execution.
      </p>

      {/* Sign-off */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontWeight: 600, color: '#374151' }}>Warm regards,</div>
        <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#111827', marginTop: 12 }}>{data.creatorName}</div>
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: 2 }}>{data.creatorHandle} · {data.creatorLocation}</div>
      </div>

      {/* Footer */}
      {showBranding && (
        <div style={{ marginTop: 36, paddingTop: 12, borderTop: '1px solid #f3f4f6', textAlign: 'center', fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Powered by CreatorKit
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   TEMPLATE 2: EXECUTIVE PROPOSAL LETTERHEAD
   ========================================================================= */
export function ExecutiveProposalLetterhead({ data, showBranding = true }: LetterheadTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#111827',
        fontFamily: `${bodyFont}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        padding: 'clamp(28px, 4vw, 48px)',
        fontSize: '11px',
        lineHeight: 1.65,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Formal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #111827', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {data.creatorName}
          </div>
          <div style={{ fontSize: '9.5px', color: '#4b5563', marginTop: 2 }}>
            {data.creatorHandle} | {data.creatorNiche} | {data.creatorLocation}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#4b5563' }}>
          <div>{data.creatorEmail}</div>
          <div>{data.creatorPhone}</div>
          <div style={{ fontWeight: 700, color: '#000', marginTop: 4 }}>Date: {data.issueDate}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700 }}>TO:</div>
        <div>{data.clientName}</div>
        {data.clientContact && <div>Attn: {data.clientContact}</div>}
        {data.clientAddress && <div style={{ color: '#4b5563' }}>{data.clientAddress}</div>}
      </div>

      <div style={{ fontWeight: 800, fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 14 }}>
        RE: {data.letterTitle || 'OFFICIAL BRAND PARTNERSHIP PROPOSAL'}
      </div>

      <p style={{ margin: '0 0 12px' }}>
        Dear {data.clientContact || 'Partnerships Director'},
      </p>
      <p style={{ margin: '0 0 12px' }}>
        {data.introText || `We are pleased to submit this formal proposal on behalf of ${data.creatorName} to provide dedicated content creation and audience activation services for ${data.clientName}.`}
      </p>
      <p style={{ margin: '0 0 16px' }}>
        {data.bodyText || `Our community of active followers consistently engages with high-fidelity storytelling, genuine recommendations, and multi-platform reach. The deliverables below have been structured to deliver maximum return on investment:`}
      </p>

      {/* Items Box */}
      <div style={{ border: '1.5px solid #111827', padding: '12px 16px', margin: '16px 0 20px', background: '#fafafa' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          Scope of Deliverables &amp; Investment
        </div>
        {data.items.map((i) => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
            <span><strong>{i.quantity}x</strong> {i.description}</span>
            <span style={{ fontWeight: 700 }}>{data.sym}{(i.quantity * i.rate).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #111827', fontWeight: 900, fontSize: '11.5px' }}>
          <span>Total Proposed Investment</span>
          <span>{data.sym}{data.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <p style={{ margin: '0 0 24px' }}>
        We remain at your disposal to discuss custom campaign adjustments and look forward to partnering with your brand.
      </p>

      <div style={{ marginTop: 28 }}>
        <div>Respectfully submitted,</div>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', marginTop: 12 }}>{data.creatorName}</div>
        <div style={{ fontSize: '9.5px', color: '#6b7280' }}>Principal Creator / Producer</div>
      </div>

      {showBranding && (
        <div style={{ marginTop: 32, paddingTop: 10, borderTop: '1px solid #f3f4f6', textAlign: 'center', fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Powered by CreatorKit
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   ROUTER RENDERER
   ========================================================================= */
export default function LetterheadDocumentRenderer({
  templateId = 'creative',
  data,
  showBranding = true,
}: {
  templateId?: LetterheadTemplateId;
  data: LetterheadData;
  showBranding?: boolean;
}) {
  switch (templateId) {
    case 'executive':
      return <ExecutiveProposalLetterhead data={data} showBranding={showBranding} />;
    case 'creative':
    default:
      return <CreativePitchLetterhead data={data} showBranding={showBranding} />;
  }
}
