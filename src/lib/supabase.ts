import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lnfzixiwmdxoqoueadkq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZnppeGl3bWR4b3FvdWVhZGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDY1NDksImV4cCI6MjEwMzUyMjU0OX0.Y-VNay9jo6n20wQBMl0lTkzVnmjQqhcMiysNW66i76A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StoredReceipt {
  id: string; // short code e.g. "rcpt_k8w2"
  receipt_number: string;
  creator_name: string;
  creator_email?: string;
  creator_phone?: string;
  client_name: string;
  currency: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_channel?: string;
  payload_string: string;
  metadata?: any;
  created_at?: string;
}

/**
 * Save a receipt to Supabase and return the short code for branded share links.
 */
export async function saveReceiptToDatabase(data: {
  receiptNumber: string;
  creatorName: string;
  creatorEmail?: string;
  creatorPhone?: string;
  clientName: string;
  currency: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentChannel?: string;
  payloadString: string;
  metadata?: any;
}): Promise<string> {
  // Generate random 6-character clean slug
  const shortId = Math.random().toString(36).substring(2, 8);

  try {
    const { error } = await supabase.from('receipts').insert([
      {
        id: shortId,
        receipt_number: data.receiptNumber,
        creator_name: data.creatorName,
        creator_email: data.creatorEmail,
        creator_phone: data.creatorPhone,
        client_name: data.clientName,
        currency: data.currency,
        total_amount: data.totalAmount,
        amount_paid: data.amountPaid,
        balance_due: data.balanceDue,
        status: data.amountPaid >= data.totalAmount ? 'paid' : 'partial',
        payment_channel: data.paymentChannel,
        payload_string: data.payloadString,
        metadata: data.metadata,
      },
    ]);

    if (error) {
      console.warn('Supabase insert error (falling back to direct payload link):', error.message);
      return '';
    }

    return shortId;
  } catch (err) {
    console.warn('Failed to save receipt to Supabase:', err);
    return '';
  }
}

/**
 * Fetch a receipt by its short code.
 */
export async function getReceiptByShortId(id: string): Promise<StoredReceipt | null> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as StoredReceipt;
  } catch (err) {
    console.error('Error fetching receipt from Supabase:', err);
    return null;
  }
}
