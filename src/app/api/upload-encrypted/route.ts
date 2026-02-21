import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

interface EncryptedTransaction {
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

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      );
    }

    // Insert encrypted transactions
    const stmt = db.prepare(`
      INSERT INTO transactions (
        date, description, encrypted_description, encrypted_description_iv,
        category, type, tags, amount, reference_number, encrypted_reference_number, encrypted_reference_iv
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rows: EncryptedTransaction[]) => {
      let inserted = 0;
      let skipped = 0;

      for (const t of rows) {
        try {
          // Check for duplicates
          if (t.reference_number) {
            const existing = db.prepare('SELECT id FROM transactions WHERE reference_number = ?').get(t.reference_number);
            if (existing) {
              skipped++;
              continue;
            }
          }

          stmt.run(
            t.date,
            t.description || null,
            t.encrypted_description || null,
            t.encrypted_description_iv || null,
            t.category,
            t.type,
            t.tags ? JSON.stringify(t.tags) : '[]',
            t.amount,
            t.reference_number || null,
            t.encrypted_reference_number || null,
            t.encrypted_reference_iv || null
          );
          inserted++;
        } catch (err) {
          console.error('Error inserting transaction:', err);
        }
      }

      return { inserted, skipped };
    });

    const result = insertMany(transactions);

    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      skipped: result.skipped,
    });
  } catch (err) {
    console.error('Error in encrypted upload:', err);
    return NextResponse.json(
      { error: `Failed to process encrypted transactions: ${(err as Error).message}` },
      { status: 400 }
    );
  }
}
