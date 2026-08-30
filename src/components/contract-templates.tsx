'use client';

import React, { useEffect } from 'react';
import { injectInvoiceGoogleFont } from '@/lib/invoice-fonts';

export type ContractTemplateId = 'service' | 'business' | 'creator';

export interface ContractItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface ContractData {
  // Parties
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
  creatorPhone: string;
  creatorLocation: string;
  creatorAddress?: string;
  logoUrl?: string | null;

  clientName: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;

  // Contract Details
  contractNumber?: string;
  contractTitle?: string;
  effectiveDate: string;
  endDate?: string;
  currency: string;
  sym: string;

  // Deliverables & Scope
  scopeDescription?: string;
  items: ContractItem[];

  // Financials
  totalAmount: number;
  depositPercentage: number;
  depositRequired: number;
  balanceDue: number;
  paymentType: 'fixed' | 'milestone' | 'hourly';
  hourlyRate?: number;
  paymentMethodDetails?: string;

  // Terms & Clauses
  usagePeriod: string;
  revisionRounds: number;
  turnaroundDays: number;
  confidentiality?: boolean;
  exclusivity?: string;
  governingLaw?: string;
  killFeePercentage?: number;
  customTerms?: string;

  // Signatures
  serviceProviderSignName?: string;
  clientSignName?: string;

  // Typography & Styling
  headingFont?: string;
  bodyFont?: string;
  signatureFont?: string;
  primaryColor?: string;
  accentColor?: string;
}

interface ContractTemplateProps {
  data: ContractData;
  showBranding?: boolean;
}

/* =========================================================================
   TEMPLATE 1: SERVICE CONTRACT (eSign Legal Standard)
   Clean legal layout with numbered clauses, checkboxes, deliverable box,
   and dedicated fixed blank manual signing spaces.
   ========================================================================= */
export function ServiceContract({ data, showBranding = true }: ContractTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  const primaryColor = data.primaryColor || '#111827';
  const contractTitle = data.contractTitle || 'SERVICE CONTRACT';

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#111827',
        fontFamily: `${bodyFont}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        padding: 'clamp(28px, 4vw, 44px)',
        fontSize: '11px',
        lineHeight: 1.6,
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: `${headingFont}, sans-serif`,
            fontSize: '1.45rem',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            color: primaryColor,
          }}
        >
          {contractTitle}
        </h1>
        {data.contractNumber && (
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', marginTop: 4 }}>
            REF: {data.contractNumber}
          </div>
        )}
      </div>

      {/* 1. THE PARTIES */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
          1. THE PARTIES. <span style={{ fontWeight: 400 }}>This Service Contract (the &quot;Agreement&quot;) made on </span>
          <span style={{ borderBottom: '1px solid #111', padding: '0 4px', fontWeight: 700 }}>{data.effectiveDate}</span>
          <span style={{ fontWeight: 400 }}> (the &quot;Effective Date&quot;) is by and between:</span>
        </div>

        <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div>
            <strong>Service Provider:</strong>{' '}
            <span style={{ borderBottom: '1px solid #d1d5db', paddingBottom: 1, fontWeight: 700 }}>
              {data.creatorName}
            </span>
            , with a mailing address of{' '}
            <span style={{ borderBottom: '1px solid #d1d5db', paddingBottom: 1 }}>
              {data.creatorLocation || data.creatorAddress || 'Accra, Ghana'} ({data.creatorEmail})
            </span>{' '}
            (the &quot;Service Provider&quot;), and
          </div>
          <div>
            <strong>Client:</strong>{' '}
            <span style={{ borderBottom: '1px solid #d1d5db', paddingBottom: 1, fontWeight: 700 }}>
              {data.clientName}
            </span>
            {data.clientContact ? ` (Attn: ${data.clientContact})` : ''}, with a mailing address of{' '}
            <span style={{ borderBottom: '1px solid #d1d5db', paddingBottom: 1 }}>
              {data.clientAddress || data.clientEmail || 'Client Office'}
            </span>{' '}
            (the &quot;Client&quot;).
          </div>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0 }}>
          The Service Provider and the Client are each referred to as a &quot;Party&quot; and, collectively, as the &quot;Parties.&quot;
        </p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>
          IN CONSIDERATION of the provisions contained in this Agreement and for other good and valuable consideration, the Client hires the Service Provider to work under the terms and conditions hereby agreed upon by the Parties:
        </p>
      </div>

      {/* 2. TERM */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
          2. TERM. <span style={{ fontWeight: 400 }}>The term of this Agreement shall commence on </span>
          <span style={{ borderBottom: '1px solid #111', padding: '0 4px', fontWeight: 700 }}>{data.effectiveDate}</span>
          <span style={{ fontWeight: 400 }}> and terminate: (check one)</span>
        </div>
        <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, border: '1.5px solid #000', fontSize: '9px', fontWeight: 900 }}>✓</span>
            <span>
              On the date of <strong>{data.endDate || `${data.turnaroundDays} business days following brief approval`}</strong>.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, border: '1.5px solid #000', fontSize: '9px', fontWeight: 900 }}>✓</span>
            <span>Upon completion of the Services performed.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, border: '1.5px solid #9ca3af', fontSize: '9px' }}></span>
            <span>Other: Upon mutual written consent or completion of campaign flight.</span>
          </div>
        </div>
      </div>

      {/* 3. SERVICES */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
          3. SERVICES. <span style={{ fontWeight: 400 }}>The Service Provider agrees to provide the following:</span>
        </div>

        {/* Scope Box */}
        <div
          style={{
            border: '1.5px solid #111827',
            background: '#fafafa',
            padding: '12px 16px',
            margin: '8px 0 10px',
          }}
        >
          {data.scopeDescription && (
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{data.scopeDescription}</p>
          )}
          <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#4b5563', marginBottom: 4 }}>
            Campaign Deliverables:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.items.map((i) => (
              <li key={i.id} style={{ marginBottom: 3 }}>
                <strong>{i.quantity}x</strong> {i.description}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ margin: '0 0 6px' }}>Hereinafter known as the &quot;Services.&quot;</p>
        <p style={{ margin: 0 }}>
          The Service Provider guarantees that they shall perform the Services in compliance with the policies, standards, and regulations of the Client, including local, state, and federal laws, and to the best of their abilities.
        </p>
      </div>

      {/* 4. PAYMENT AMOUNT & TERMS */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
          4. PAYMENT AMOUNT. <span style={{ fontWeight: 400 }}>The Client agrees to pay the Service Provider the following compensation for the Services performed under this Agreement: (check all that apply)</span>
        </div>

        <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, border: '1.5px solid #000', fontSize: '9px', fontWeight: 900, flexShrink: 0 }}>✓</span>
            <div>
              <strong>Per Job:</strong> Total compensation of{' '}
              <strong style={{ fontSize: '12px' }}>{data.sym}{data.totalAmount.toLocaleString()}</strong> for the completion of the Services.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: 22 }}>
            <span>•</span>
            <div>
              <strong>Upfront Deposit:</strong> {data.depositPercentage}% (<strong>{data.sym}{data.depositRequired.toLocaleString()}</strong>) required prior to commencement of production.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: 22 }}>
            <span>•</span>
            <div>
              <strong>Final Balance:</strong> <strong>{data.sym}{data.balanceDue.toLocaleString()}</strong> due upon draft approval prior to public publishing.
            </div>
          </div>
          {data.paymentMethodDetails && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: 22, color: '#374151' }}>
              <span>•</span>
              <div>
                <strong>Payment Channel:</strong> {data.paymentMethodDetails}
              </div>
            </div>
          )}
        </div>

        <p style={{ margin: '8px 0 0' }}>Hereinafter known as the &quot;Compensation.&quot;</p>
      </div>

      {/* 5. REVISIONS, APPROVALS & USAGE RIGHTS */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
          5. REVISIONS &amp; USAGE RIGHTS.
        </div>
        <p style={{ margin: '0 0 6px' }}>
          <strong>Revisions:</strong> The compensation includes up to <strong>{data.revisionRounds} rounds of minor revisions</strong> strictly adhering to the agreed creative brief. Substantial creative changes or re-shoots requested after production will incur a 50% re-shoot fee.
        </p>
        <p style={{ margin: '0 0 6px' }}>
          <strong>Usage &amp; Licensing:</strong> Client receives a non-exclusive license to use the delivered assets on organic digital channels for <strong>{data.usagePeriod}</strong>. Paid whitelisting, Dark Posting, or TV broadcast rights require a separate written licensing agreement.
        </p>
        {data.exclusivity && data.exclusivity !== 'None' && (
          <p style={{ margin: '0 0 6px' }}>
            <strong>Exclusivity:</strong> {data.exclusivity}
          </p>
        )}
      </div>

      {/* 6. CONFIDENTIALITY & GOVERNING LAW */}
      {data.confidentiality !== false && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
            6. CONFIDENTIALITY &amp; GOVERNING LAW.
          </div>
          <p style={{ margin: 0 }}>
            Both Parties agree to hold campaign strategies, unreleased assets, and commercial terms in strict confidence. This Agreement shall be governed under the laws of <strong>{data.governingLaw || 'Ghana'}</strong>.
          </p>
        </div>
      )}

      {/* 7. SPECIAL TERMS & CONDITIONS (Optional) */}
      {data.customTerms && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#000', marginBottom: 6 }}>
            7. SPECIAL TERMS &amp; CONDITIONS.
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fafafa', padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
            {data.customTerms}
          </div>
        </div>
      )}

      {/* DEDICATED MANUAL SIGNATURE SPACES */}
      <div style={{ marginTop: 32, borderTop: '1px solid #d1d5db', paddingTop: 20 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 700, marginBottom: 16 }}>
          IN WITNESS WHEREOF, the Parties have executed this Service Contract as of the Effective Date written above.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
          {/* Service Provider Signature */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#374151' }}>
              Service Provider Signature:
            </div>
            {/* Fixed-height blank signature space with solid line for manual pen signing */}
            <div
              style={{
                height: 64,
                borderBottom: '1.5px solid #000',
                marginBottom: 6,
              }}
            />
            <div style={{ fontWeight: 700, fontSize: '10.5px' }}>
              Name: {data.creatorName}
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
              Title: Content Creator / Principal
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
              Date: {data.effectiveDate}
            </div>
          </div>

          {/* Client Signature */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#374151' }}>
              Client Signature:
            </div>
            {/* Fixed-height blank signature space with solid line for manual pen signing */}
            <div
              style={{
                height: 64,
                borderBottom: '1.5px solid #000',
                marginBottom: 6,
              }}
            />
            <div style={{ fontWeight: 700, fontSize: '10.5px' }}>
              Name: {data.clientContact || data.clientName}
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
              Title: Authorized Representative
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
              Date: _______________
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 36,
          paddingTop: 12,
          borderTop: '1px solid #f3f4f6',
          fontSize: '9.5px',
          color: '#9ca3af',
        }}
      >
        <div style={{ fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827' }}>
          eSign Verified
        </div>
        {showBranding && (
          <div style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase' }}>
            Powered by CreatorKit
          </div>
        )}
        <div style={{ fontWeight: 600 }}>Page 1 of 1</div>
      </div>
    </div>
  );
}

/* =========================================================================
   TEMPLATE 2: BUSINESS CONTRACT AGREEMENT (Modern Editorial)
   Large tracked title, Roman numeral clauses with right-aligned subtle
   grey helper tags, 3-column milestone table, and dedicated manual signing spaces.
   ========================================================================= */
export function BusinessContractAgreement({ data, showBranding = true }: ContractTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  const contractTitle = data.contractTitle || 'BUSINESS CONTRACT AGREEMENT';

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
      {/* Top Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: `${headingFont}, sans-serif`,
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: 0,
            color: '#000000',
          }}
        >
          {contractTitle}
        </h1>
      </div>

      {/* Recital Paragraph */}
      <p style={{ fontSize: '11px', marginBottom: 24, lineHeight: 1.7 }}>
        This Business Contract (&quot;Agreement&quot;) is entered into on{' '}
        <span style={{ borderBottom: '1px solid #000', padding: '0 4px', fontWeight: 700 }}>{data.effectiveDate}</span>
        {' '}by and between{' '}
        <span style={{ borderBottom: '1px solid #000', padding: '0 4px', fontWeight: 700 }}>{data.creatorName}</span>
        {' '}(&quot;Party A&quot;), located at{' '}
        <span style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.creatorLocation || data.creatorAddress || 'Accra, Ghana'}</span>
        , and{' '}
        <span style={{ borderBottom: '1px solid #000', padding: '0 4px', fontWeight: 700 }}>{data.clientName}</span>
        {' '}(&quot;Party B&quot;), located at{' '}
        <span style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.clientAddress || 'Client HQ'}</span>.
      </p>

      {/* I. Scope of Work */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{ fontSize: '12.5px', fontWeight: 900, margin: 0, textTransform: 'none' }}>
            I. Scope of Work
          </h2>
          <div style={{ background: '#f4f4f5', color: '#71717a', fontSize: '9px', fontStyle: 'italic', padding: '2px 8px', borderRadius: 2 }}>
            Describe the nature of the work or services involved.
          </div>
        </div>
        <p style={{ margin: '0 0 6px' }}>Party A agrees to provide the following services or deliverables to Party B:</p>
        <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '10px 14px', margin: '6px 0 8px' }}>
          {data.scopeDescription && (
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{data.scopeDescription}</p>
          )}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.items.map((i) => (
              <li key={i.id} style={{ marginBottom: 3 }}>
                <strong>{i.quantity}x</strong> {i.description}
              </li>
            ))}
          </ul>
        </div>
        <p style={{ margin: 0 }}>The work shall be completed in accordance with the terms outlined in this Agreement.</p>
      </div>

      {/* II. Term */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{ fontSize: '12.5px', fontWeight: 900, margin: 0 }}>
            II. Term
          </h2>
          <div style={{ background: '#f4f4f5', color: '#71717a', fontSize: '9px', fontStyle: 'italic', padding: '2px 8px', borderRadius: 2 }}>
            Define when the agreement starts and ends.
          </div>
        </div>
        <p style={{ margin: 0 }}>
          This Agreement shall commence on <strong style={{ borderBottom: '1px solid #111', padding: '0 3px' }}>{data.effectiveDate}</strong> and continue until <strong style={{ borderBottom: '1px solid #111', padding: '0 3px' }}>{data.endDate || `${data.turnaroundDays} business days`}</strong>, unless terminated earlier in accordance with Section VI.
        </p>
      </div>

      {/* III. Compensation */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{ fontSize: '12.5px', fontWeight: 900, margin: 0 }}>
            III. Compensation
          </h2>
          <div style={{ background: '#f4f4f5', color: '#71717a', fontSize: '9px', fontStyle: 'italic', padding: '2px 8px', borderRadius: 2 }}>
            Detail payment terms, amounts, and methods.
          </div>
        </div>
        <p style={{ margin: '0 0 8px' }}>
          Party B agrees to pay Party A <strong style={{ fontSize: '12px' }}>{data.sym}{data.totalAmount.toLocaleString()}</strong> for the services provided. Payment shall be made via {data.paymentMethodDetails || 'agreed payment channel'}, with the following schedule or milestones:
        </p>

        {/* 3-Column Milestone Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: 8 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ border: '1.5px solid #111827', padding: '6px 10px', textAlign: 'left', fontWeight: 800, width: '50%' }}>
                Milestone / Deliverable
              </th>
              <th style={{ border: '1.5px solid #111827', padding: '6px 10px', textAlign: 'right', fontWeight: 800, width: '25%' }}>
                Amount
              </th>
              <th style={{ border: '1.5px solid #111827', padding: '6px 10px', textAlign: 'right', fontWeight: 800, width: '25%' }}>
                Due Date
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '6px 10px', fontWeight: 600 }}>
                1. Upfront Production Deposit ({data.depositPercentage}%)
              </td>
              <td style={{ border: '1px solid #111827', padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>
                {data.sym}{data.depositRequired.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #111827', padding: '6px 10px', textAlign: 'right' }}>
                Upon Signing
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '6px 10px', fontWeight: 600 }}>
                2. Final Deliverables Approval ({100 - data.depositPercentage}%)
              </td>
              <td style={{ border: '1px solid #111827', padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>
                {data.sym}{data.balanceDue.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #111827', padding: '6px 10px', textAlign: 'right' }}>
                Upon Completion
              </td>
            </tr>
            <tr style={{ background: '#f9fafb', fontWeight: 800 }}>
              <td style={{ border: '1.5px solid #111827', padding: '6px 10px' }}>
                TOTAL CONTRACT VALUE
              </td>
              <td style={{ border: '1.5px solid #111827', padding: '6px 10px', textAlign: 'right', fontSize: '11px' }}>
                {data.sym}{data.totalAmount.toLocaleString()}
              </td>
              <td style={{ border: '1.5px solid #111827', padding: '6px 10px', textAlign: 'right', fontSize: '9px', color: '#4b5563' }}>
                Net 0 / Standard
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* IV. Confidentiality */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{ fontSize: '12.5px', fontWeight: 900, margin: 0 }}>
            IV. Confidentiality
          </h2>
          <div style={{ background: '#f4f4f5', color: '#71717a', fontSize: '9px', fontStyle: 'italic', padding: '2px 8px', borderRadius: 2 }}>
            Specify obligations regarding sensitive information.
          </div>
        </div>
        <p style={{ margin: 0 }}>
          Both parties agree to keep confidential any non-public information exchanged during the course of this Agreement. Confidential information shall not be disclosed to any third party without prior written consent, unless required by law.
        </p>
      </div>

      {/* V. Rights & Revisions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{ fontSize: '12.5px', fontWeight: 900, margin: 0 }}>
            V. Rights &amp; Revisions
          </h2>
          <div style={{ background: '#f4f4f5', color: '#71717a', fontSize: '9px', fontStyle: 'italic', padding: '2px 8px', borderRadius: 2 }}>
            Ownership and licensing provisions.
          </div>
        </div>
        <p style={{ margin: '0 0 6px' }}>
          Party A retains intellectual property ownership of original footage and concepts. Party B is granted a non-exclusive license to utilize finished assets for <strong>{data.usagePeriod}</strong> across organic digital channels. Includes up to <strong>{data.revisionRounds} rounds of minor revisions</strong>.
        </p>
        {data.exclusivity && data.exclusivity !== 'None' && (
          <p style={{ margin: 0 }}>
            <strong>Exclusivity:</strong> {data.exclusivity}
          </p>
        )}
      </div>

      {/* VI. Special Provisions (Optional) */}
      {data.customTerms && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <h2 style={{ fontSize: '12.5px', fontWeight: 900, margin: 0 }}>
              VI. Special Provisions
            </h2>
            <div style={{ background: '#f4f4f5', color: '#71717a', fontSize: '9px', fontStyle: 'italic', padding: '2px 8px', borderRadius: 2 }}>
              Additional custom covenants.
            </div>
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fafafa', padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
            {data.customTerms}
          </div>
        </div>
      )}

      {/* DEDICATED MANUAL SIGNATURE SPACES */}
      <div style={{ marginTop: 32, borderTop: '1.5px solid #111827', paddingTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
          {/* Party A */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111827' }}>
              PARTY A SIGNATURE:
            </div>
            {/* Fixed-height blank signature space with solid line for manual pen signing */}
            <div
              style={{
                height: 64,
                borderBottom: '1.5px solid #111827',
                marginBottom: 6,
              }}
            />
            <div style={{ fontWeight: 700, fontSize: '10.5px' }}>
              {data.creatorName}
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
              Date: {data.effectiveDate}
            </div>
          </div>

          {/* Party B */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111827' }}>
              PARTY B SIGNATURE:
            </div>
            {/* Fixed-height blank signature space with solid line for manual pen signing */}
            <div
              style={{
                height: 64,
                borderBottom: '1.5px solid #111827',
                marginBottom: 6,
              }}
            />
            <div style={{ fontWeight: 700, fontSize: '10.5px' }}>
              {data.clientContact || data.clientName}
            </div>
            <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
              Date: _______________
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 36,
          paddingTop: 10,
          borderTop: '1px solid #f3f4f6',
          fontSize: '9.5px',
          color: '#9ca3af',
        }}
      >
        <div>
          {showBranding && <span>Powered by CreatorKit</span>}
        </div>
        <div style={{ fontWeight: 600 }}>1</div>
      </div>
    </div>
  );
}

/* =========================================================================
   TEMPLATE 3: CREATOR SPONSORSHIP & LICENSING AGREEMENT
   Modern digital creator deal contract with deliverables list, deposit terms,
   usage rights, revision limits, kill fee clause, and dedicated manual signing spaces.
   ========================================================================= */
export function CreatorSponsorshipAgreement({ data, showBranding = true }: ContractTemplateProps) {
  const headingFont = data.headingFont || 'Inter';
  const bodyFont = data.bodyFont || 'Inter';

  useEffect(() => {
    injectInvoiceGoogleFont(headingFont);
    injectInvoiceGoogleFont(bodyFont);
  }, [headingFont, bodyFont]);

  const contractTitle = data.contractTitle || 'CONTENT CREATOR SPONSORSHIP & LICENSING AGREEMENT';

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
      {/* Header */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 14, marginBottom: 20 }}>
        <div style={{ fontSize: '9px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
          DEAL MEMO &amp; LEGAL AGREEMENT
        </div>
        <h1
          style={{
            fontFamily: `${headingFont}, sans-serif`,
            fontSize: '1.25rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            margin: '4px 0 0',
          }}
        >
          {contractTitle}
        </h1>
      </div>

      <p style={{ margin: '0 0 14px' }}>
        This agreement is entered into on <strong>{data.effectiveDate}</strong> between <strong>{data.creatorName}</strong> (&quot;Creator&quot;) and <strong>{data.clientName}</strong> (&quot;Brand/Client&quot;).
      </p>

      {/* 1. Scope of Deliverables */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          1. Scope of Deliverables
        </div>
        <ul style={{ paddingLeft: 18, margin: '4px 0 0' }}>
          {data.items.map((i) => (
            <li key={i.id} style={{ marginBottom: 3 }}>
              <strong>{i.quantity}x</strong> {i.description}
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Compensation & Payment Terms */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          2. Compensation &amp; Payment Terms
        </div>
        <p style={{ margin: 0 }}>
          Total compensation is <strong>{data.sym}{data.totalAmount.toLocaleString()}</strong>. A non-refundable deposit of <strong>{data.depositPercentage}% ({data.sym}{data.depositRequired.toLocaleString()})</strong> is required prior to production commencement. The balance of <strong>{data.sym}{data.balanceDue.toLocaleString()}</strong> is due upon draft approval prior to public release.
        </p>
        {data.paymentMethodDetails && (
          <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '10px' }}>
            Payment Channel: {data.paymentMethodDetails}
          </p>
        )}
      </div>

      {/* 3. Revisions & Approvals */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          3. Revisions &amp; Approvals
        </div>
        <p style={{ margin: 0 }}>
          The campaign includes up to <strong>{data.revisionRounds} rounds of minor revisions</strong> aligned with the agreed creative brief. Full script changes or re-shoots requested after filming will incur a separate 50% re-shoot fee.
        </p>
      </div>

      {/* 4. Usage Rights & Whitelisting */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          4. Usage Rights &amp; Whitelisting
        </div>
        <p style={{ margin: 0 }}>
          Creator grants Brand the right to use the content for <strong>{data.usagePeriod}</strong> across organic social media channels. Paid ad whitelisting, Meta Spark Ads, TikTok Dark Posting, or TV broadcast rights require a separate written licensing agreement.
        </p>
        {data.exclusivity && data.exclusivity !== 'None' && (
          <p style={{ margin: '4px 0 0', color: '#1f2937' }}>
            <strong>Exclusivity:</strong> {data.exclusivity}
          </p>
        )}
      </div>

      {/* 5. Cancellation & Kill Fee */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          5. Cancellation &amp; Kill Fee
        </div>
        <p style={{ margin: 0 }}>
          If Brand cancels the campaign after filming has occurred, Creator shall retain the {data.depositPercentage}% deposit as a kill fee to cover production expenses and reserved studio schedule.
        </p>
      </div>

      {/* 6. Special Terms & Custom Notes (Optional) */}
      {data.customTerms && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            6. Special Terms &amp; Custom Covenants
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fafafa', padding: '8px 12px', whiteSpace: 'pre-wrap', fontSize: '10.5px' }}>
            {data.customTerms}
          </div>
        </div>
      )}

      {/* DEDICATED MANUAL SIGNATURE SPACES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 28, borderTop: '1px dashed #d4d4d8', paddingTop: 18 }}>
        <div>
          <div style={{ fontSize: '9.5px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
            FOR CREATOR:
          </div>
          {/* Fixed-height blank signature space with solid line for manual pen signing */}
          <div
            style={{
              height: 64,
              borderBottom: '1.5px solid #000',
              marginTop: 4,
              marginBottom: 6,
            }}
          />
          <div style={{ fontWeight: 800 }}>{data.creatorName}</div>
          <div style={{ fontSize: '9.5px', color: '#666' }}>Date: {data.effectiveDate}</div>
        </div>

        <div>
          <div style={{ fontSize: '9.5px', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
            FOR BRAND / AGENCY:
          </div>
          {/* Fixed-height blank signature space with solid line for manual pen signing */}
          <div
            style={{
              height: 64,
              borderBottom: '1.5px solid #000',
              marginTop: 4,
              marginBottom: 6,
            }}
          />
          <div style={{ fontWeight: 800 }}>
            {data.clientContact ? `${data.clientContact} (${data.clientName})` : data.clientName}
          </div>
          <div style={{ fontSize: '9.5px', color: '#666' }}>Date: _______________</div>
        </div>
      </div>

      {/* Footer */}
      {showBranding && (
        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: '9px',
            fontFamily: 'monospace',
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Powered by CreatorKit
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   ROUTER RENDERER
   ========================================================================= */
export default function ContractDocumentRenderer({
  templateId,
  data,
  showBranding = true,
}: {
  templateId: ContractTemplateId;
  data: ContractData;
  showBranding?: boolean;
}) {
  switch (templateId) {
    case 'service':
      return <ServiceContract data={data} showBranding={showBranding} />;
    case 'business':
      return <BusinessContractAgreement data={data} showBranding={showBranding} />;
    case 'creator':
    default:
      return <CreatorSponsorshipAgreement data={data} showBranding={showBranding} />;
  }
}
