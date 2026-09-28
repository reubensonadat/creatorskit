import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Memory cache + local JSON persistence fallback for documents
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'documents.json');

interface StoredDoc {
  id: string;
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
  created_at: string;
}

// In-memory cache
const memoryDocs = new Map<string, StoredDoc>();

function ensureStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach((doc: StoredDoc) => {
          if (doc?.id) memoryDocs.set(doc.id, doc);
        });
      }
    }
  } catch (err) {
    // Graceful fallback to memoryDocs
  }
}

function persistStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const docs = Array.from(memoryDocs.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    // Ignore write errors in read-only environments
  }
}

// Initialize on module load
ensureStorage();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  // Check memory
  let doc = memoryDocs.get(id);

  // If not found in memory, try re-reading file
  if (!doc) {
    ensureStorage();
    doc = memoryDocs.get(id);
  }

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({ data: doc });
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const id = body.id || Math.random().toString(36).substring(2, 8);

    const doc: StoredDoc = {
      id,
      receipt_number: body.receiptNumber || body.receipt_number || '',
      creator_name: body.creatorName || body.creator_name || 'Creator',
      creator_email: body.creatorEmail || body.creator_email,
      creator_phone: body.creatorPhone || body.creator_phone,
      client_name: body.clientName || body.client_name || 'Client',
      currency: body.currency || 'GHS',
      total_amount: Number(body.totalAmount ?? body.total_amount ?? 0),
      amount_paid: Number(body.amountPaid ?? body.amount_paid ?? 0),
      balance_due: Number(body.balanceDue ?? body.balance_due ?? 0),
      status: body.status || 'paid',
      payment_channel: body.paymentChannel || body.payment_channel,
      payload_string: body.payloadString || body.payload_string || '',
      metadata: body.metadata || {},
      created_at: new Date().toISOString(),
    };

    memoryDocs.set(id, doc);
    persistStorage();

    return NextResponse.json({ success: true, id, data: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save document' }, { status: 500 });
  }
}
