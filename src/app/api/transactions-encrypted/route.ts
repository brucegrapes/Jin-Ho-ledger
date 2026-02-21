import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

interface EncryptedTransaction {
  id: number;
  date: string;
  description?: string;
  encrypted_description?: string;
  encrypted_description_iv?: string;
  category: string;
  type: string;
  tags: string;
  amount: number;
  reference_number?: string;
  encrypted_reference_number?: string;
  encrypted_reference_iv?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const onlyEncrypted = searchParams.get('onlyEncrypted') === 'true';

  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params: string[] = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (start) {
    query += ' AND date >= ?';
    params.push(start);
  }
  if (end) {
    query += ' AND date <= ?';
    params.push(end);
  }
  if (onlyEncrypted) {
    query += ' AND encrypted_description IS NOT NULL';
  }
  
  query += ' ORDER BY date DESC';

  const transactions = db.prepare(query).all(...params) as EncryptedTransaction[];
  
  // Return both encrypted and decrypted data
  // Client will decrypt using their browser key
  return NextResponse.json({ 
    transactions,
    encryptionEnabled: transactions.some(t => !!t.encrypted_description)
  });
}
