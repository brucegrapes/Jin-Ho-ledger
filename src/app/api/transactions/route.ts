import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { decryptString } from '@/utils/serverEncryption';

/**
 * Check if a string is encrypted (base64 with minimum length for encrypted data)
 */
function isEncrypted(data: string | null): boolean {
  if (!data) return false;
  // Encrypted data is base64 encoded and contains IV + ciphertext + authTag
  // Minimum length is much longer than typical plaintext
  return /^[A-Za-z0-9+/]+=*$/.test(data) && data.length > 50;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

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
  query += ' ORDER BY date DESC';

  const transactions = db.prepare(query).all(...params) as any[];
  
  // Decrypt sensitive fields if they are encrypted
  const decryptedTransactions = transactions.map(t => {
    let description = t.description;
    let reference_number = t.reference_number;

    // Try to decrypt description if it looks encrypted
    if (description && isEncrypted(description)) {
      const decrypted = decryptString(description);
      description = decrypted || description; // Fall back to encrypted if decryption fails
    }

    // Try to decrypt reference_number if it looks encrypted
    if (reference_number && isEncrypted(reference_number)) {
      const decrypted = decryptString(reference_number);
      reference_number = decrypted || reference_number; // Fall back to encrypted if decryption fails
    }

    return {
      ...t,
      description,
      reference_number,
    };
  });
  
  return NextResponse.json({ transactions: decryptedTransactions });
}
