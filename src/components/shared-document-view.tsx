'use client';

/**
 * Renders the exact document a creator shared from the Business Suite.
 *
 * Receipts keep the thermal-paper ReceiptDocument. Invoices, agreements and
 * letterheads are rebuilt from the `x` extras payload (template id + styling +
 * kind-specific fields) stored alongside the receipt row in Supabase, so the
 * client sees the creator's real template — not a receipt-shaped summary.
 */
import ReceiptDocument, { type ReceiptDocumentData } from '@/components/receipt-document';
import InvoiceDocumentRenderer, { type InvoiceData, type InvoiceTemplateId } from '@/components/invoice-templates';
import ContractDocumentRenderer, { type ContractData, type ContractTemplateId } from '@/components/contract-templates';
import LetterheadDocumentRenderer, { type LetterheadData, type LetterheadTemplateId } from '@/components/letterhead-templates';
import { receiptTotals, type ReceiptPayload } from '@/lib/receipt/receipt-link';

export default function SharedDocumentView({
    data,
    qrUrl,
    showBranding = true,
}: {
    data: ReceiptPayload;
    /** URL encoded into the receipt's scannable QR code (receipts only). */
    qrUrl?: string;
    showBranding?: boolean;
}) {
    const { sym, subtotal, tax, total, paid, balance } = receiptTotals(data);
    const x = data.x || {};
    const items = data.it.map((item, idx) => ({
        id: String(idx),
        description: item.d,
        quantity: item.q,
        rate: item.r,
    }));

    if (data.k === 'invoice' && x.tpl) {
        const invoice: InvoiceData = {
            creatorName: data.n,
            creatorHandle: data.h,
            creatorEmail: data.e,
            creatorPhone: data.p,
            creatorLocation: data.l,
            creatorNiche: String(x.niche || ''),
            logoUrl: data.lg ?? null,
            clientName: data.c,
            clientContact: data.a,
            clientEmail: String(x.ce || ''),
            clientAddress: String(x.ca || ''),
            shippingAddress: x.sa || undefined,
            invoiceNumber: data.rn,
            poNumber: x.po || undefined,
            issueDate: data.dt,
            dueDate: String(x.due || data.dt),
            currency: data.cu,
            sym,
            items,
            subtotal,
            discountAmount: data.da,
            taxPercentage: data.tp,
            tax,
            totalAmount: total,
            depositPercentage: Number(x.dep || 0),
            depositRequired: Number(x.depr || 0),
            amountPaid: paid,
            balanceDue: balance,
            paymentType: (data.pt as InvoiceData['paymentType']) || 'bank',
            momoNetwork: data.mn,
            momoNumber: data.mu,
            momoName: String(x.mnm || ''),
            bankName: data.bn,
            bankAccountName: String(x.ban || ''),
            bankAccountNumber: data.ba,
            paystackLink: String(x.ps || ''),
            wireSwift: String(x.sw || ''),
            wireIban: String(x.ib || ''),
            usagePeriod: String(x.up || ''),
            revisionRounds: Number(x.rr || 0),
            turnaroundDays: Number(x.td || 0),
            signatureName: x.sig || undefined,
            customNotes: x.nts || undefined,
            headingFont: x.hf,
            bodyFont: x.bf,
            signatureFont: x.sf,
            primaryColor: x.pc,
            accentColor: x.ac,
        };
        return <InvoiceDocumentRenderer templateId={x.tpl as InvoiceTemplateId} data={invoice} showBranding={showBranding} />;
    }

    if (data.k === 'agreement' && x.tpl) {
        const contract: ContractData = {
            creatorName: data.n,
            creatorHandle: data.h,
            creatorEmail: data.e,
            creatorPhone: data.p,
            creatorLocation: data.l,
            creatorAddress: data.l,
            logoUrl: data.lg ?? null,
            clientName: data.c,
            clientContact: data.a,
            clientEmail: String(x.ce || ''),
            clientAddress: String(x.ca || ''),
            contractNumber: data.rn,
            contractTitle: x.ct || undefined,
            effectiveDate: data.dt,
            endDate: x.ced || undefined,
            currency: data.cu,
            sym,
            scopeDescription: x.csd || undefined,
            items,
            totalAmount: total,
            depositPercentage: Number(x.dep || 0),
            depositRequired: Number(x.depr || 0),
            balanceDue: balance,
            paymentType: 'fixed',
            paymentMethodDetails: x.pmd || undefined,
            usagePeriod: String(x.up || ''),
            revisionRounds: Number(x.rr || 0),
            turnaroundDays: Number(x.td || 0),
            confidentiality: x.conf !== undefined ? Boolean(x.conf) : undefined,
            exclusivity: x.excl || undefined,
            governingLaw: x.law || undefined,
            killFeePercentage: x.kill !== undefined ? Number(x.kill) : undefined,
            customTerms: x.cust || undefined,
            serviceProviderSignName: x.sig || data.n,
            clientSignName: '',
            headingFont: x.hf,
            bodyFont: x.bf,
            signatureFont: x.sf,
            primaryColor: x.pc,
            accentColor: x.ac,
        };
        return <ContractDocumentRenderer templateId={x.tpl as ContractTemplateId} data={contract} showBranding={showBranding} />;
    }

    if (data.k === 'letterhead' && x.tpl) {
        const letter: LetterheadData = {
            creatorName: data.n,
            creatorHandle: data.h,
            creatorEmail: data.e,
            creatorPhone: data.p,
            creatorLocation: data.l,
            creatorNiche: String(x.niche || ''),
            logoUrl: data.lg ?? null,
            clientName: data.c,
            clientContact: data.a,
            clientEmail: x.ce || undefined,
            clientAddress: x.ca || undefined,
            issueDate: data.dt,
            letterheadNumber: data.rn,
            letterTitle: x.lt || undefined,
            audienceFocus: x.af || undefined,
            engagementRate: x.er || undefined,
            trackRecord: x.tr || undefined,
            introText: x.it || undefined,
            bodyText: x.bt || undefined,
            items,
            totalAmount: total,
            currency: data.cu,
            sym,
            headingFont: x.hf,
            bodyFont: x.bf,
            primaryColor: x.pc,
            accentColor: x.ac,
        };
        return <LetterheadDocumentRenderer templateId={x.tpl as LetterheadTemplateId} data={letter} showBranding={showBranding} />;
    }

    // Default: thermal receipt paper (receipts, or legacy links without extras)
    const docData: ReceiptDocumentData = {
        logoUrl: data.lg ?? null,
        creatorName: data.n,
        creatorHandle: data.h,
        creatorEmail: data.e,
        creatorPhone: data.p,
        creatorLocation: data.l,
        clientName: data.c,
        clientContact: data.a,
        currency: data.cu,
        sym,
        receiptNumber: data.rn,
        issueDate: data.dt,
        items,
        discountAmount: data.da,
        taxPercentage: data.tp,
        subtotal,
        tax,
        totalAmount: total,
        amountPaid: paid,
        balanceDue: balance,
        paymentType: data.pt,
        payChannel:
            data.pt === 'momo'
                ? `MoMo · ${data.mn || 'Mobile Money'} · ${data.mu || ''}`.trim()
                : data.pt === 'bank'
                  ? `Bank · ${data.bn || 'Bank'} · ${data.ba || ''}`.trim()
                  : data.pt === 'paystack'
                    ? 'Paystack Payment Link'
                    : 'Bank Wire Transfer',
    };
    return <ReceiptDocument data={docData} qrUrl={qrUrl} docKind={data.k} showBranding={showBranding} />;
}
