import db from './db';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import * as xlsx from 'xlsx';
import { extractTransactions, extractTransactionsFallback, extractIndianBankTransactions, ExtractionRules } from './transactionExtractor';
import { encryptString } from './serverEncryption';

export interface Transaction {
  date: string;
  description: string;
  category: string;
  type: string;
  tags: string[];
  amount: number;
  reference_number?: string | null;
}

/**
 * Find header row in CSV content and extract just the data portion
 */
function findAndExtractData(csvContent: string) {
  const lines = csvContent.split('\n');
  let headerIndex = -1;
  
  // Look for the header row (contains "Date" column)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Date') && (lines[i].includes('Narration') || lines[i].includes('Description'))) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex > 0) {
    return lines.slice(headerIndex).join('\n');
  }
  return csvContent;
}

export function importCSV(filePath: string, bankType: string = 'hdfc', rules?: ExtractionRules): Transaction[] {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (bankType === 'indian_bank' || bankType === 'iob') {
    return extractIndianBankTransactions(content, rules);
  }

  const dataContent = findAndExtractData(content);
  const records: Record<string, string>[] = parse(dataContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  // Try HDFC-specific extraction first
  let transactions = extractTransactions(records, rules);
  
  // If no transactions, try fallback extraction
  if (transactions.length === 0) {
    transactions = extractTransactionsFallback(records, rules);
  }
  
  return transactions;
}

export function importExcel(filePath: string, bankType: string = 'hdfc', rules?: ExtractionRules): Transaction[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to CSV first to use same parsing logic
    const csv = xlsx.utils.sheet_to_csv(sheet);

    if (bankType === 'indian_bank' || bankType === 'iob') {
      return extractIndianBankTransactions(csv, rules);
    }

    const dataContent = findAndExtractData(csv);
    const json: Record<string, string>[] = parse(dataContent, {
      columns: true,
      skip_empty_lines: true,
    });
    
    // Try HDFC-specific extraction first
    let transactions = extractTransactions(json, rules);
    
    // If no transactions, try fallback extraction
    if (transactions.length === 0) {
      transactions = extractTransactionsFallback(json, rules);
    }
    
    return transactions;
  } catch (err) {
    throw new Error(`Failed to read Excel file: ${filePath} - ${(err as Error).message}`);
  }
}

export function saveTransactions(
  transactions: Transaction[],
  userId?: string
): { inserted: number; skipped: number; errors: string[] } {
  const stmt = db.prepare('INSERT INTO transactions (date, description, category, type, tags, amount, reference_number, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const stmtCheck = db.prepare('SELECT id FROM transactions WHERE reference_number = ?');
  
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  const insertMany = db.transaction((rows: Transaction[]) => {
    for (const t of rows) {
      try {
        // Check if reference number already exists (only if reference_number is provided)
        if (t.reference_number) {
          const existing = stmtCheck.get(t.reference_number);
          if (existing) {
            skipped++;
            continue;
          }
        }
        
        // Encrypt sensitive fields
        const encryptedDescription = encryptString(t.description);
        const encryptedReference = encryptString(t.reference_number || null);
        
        stmt.run(
          t.date,
          encryptedDescription,
          t.category,
          t.type,
          JSON.stringify(t.tags),
          t.amount,
          encryptedReference,
          userId || null
        );
        inserted++;
      } catch (err) {
        const errorMsg = `Error inserting transaction ${t.date} ${t.description}: ${(err as Error).message}`;
        errors.push(errorMsg);
      }
    }
  });
  
  insertMany(transactions);
  return { inserted, skipped, errors };
}

