// utils/transactionExtractor.ts
// Mirrors the logic from scripts/processUploads.js

import { toISODate } from './dateParser';

export interface Transaction {
  date: string;
  description: string;
  category: string;
  type: string;
  tags: string[];
  amount: number;
  reference_number?: string | null;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Investments': ['groww', 'stocks', 'mutual', 'share', 'mf'],
  'Coffee': ['coffee', 'cothas'],
  'Food': ['food', 'cafe', 'restaurant', 'bakery', 'snacks', 'apollo pharmacy', 'pharmacy', 'grocery'],
  'Shopping': ['shopping', 'malai', 'sports', 'shuttle', 'gyftr'],
  'Utilities': ['billpay', 'bill', 'electricity', 'water'],
  'Salary': ['salary', 'neft cr', 'rently'],
  'Transfers': ['upi', 'neft', 'imps', 'ft-'],
  'Entertainment': ['games', 'movie', 'show'],
  'Personal': ['loan', 'emi'],
};

const TRANSACTION_TYPE_PATTERNS: Record<string, string[]> = {
  'UPI': ['upi-'],
  'Bill Payment': ['billpay', 'ib billpay'],
  'Transfer': ['neft', 'imps', 'ft-'],
  'POS': ['pos '],
  'Check': ['chq'],
};

/**
 * Extract transaction type based on description
 */
function extractTransactionType(description: string): string {
  const descLower = description.toLowerCase();
  for (const [type, patterns] of Object.entries(TRANSACTION_TYPE_PATTERNS)) {
    if (patterns.some(pattern => descLower.includes(pattern))) {
      return type;
    }
  }
  return 'Other';
}

/**
 * Auto-categorize transaction based on description
 */
function autoCategorize(description: string): string {
  const descLower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      return category;
    }
  }
  return 'Uncategorized';
}

/**
 * Extract tags from transaction description
 * Tags are identifiers like GROWW, AUTOPAY, SALARY, etc.
 */
function extractTags(description: string): string[] {
  const tags: string[] = [];
  const descUpper = description.toUpperCase();
  
  // Pattern-based tags
  if (descUpper.includes('GROWW')) tags.push('GROWW');
  if (descUpper.includes('AUTOPAY')) tags.push('AUTOPAY');
  if (descUpper.includes('BILLPAY')) tags.push('BILLPAY');
  if (descUpper.includes('SALARY') || descUpper.includes('RENTLY')) tags.push('SALARY');
  if (descUpper.includes('NEFT CR') || descUpper.includes('NEFT')) tags.push('NEFT');
  if (descUpper.includes('COTHAS')) tags.push('COTHAS');
  if (descUpper.includes('APOLLO')) tags.push('APOLLO');
  if (descUpper.includes('SHOPPING')) tags.push('SHOPPING');
  if (descUpper.includes('SHUTTLE')) tags.push('SPORTS');
  if (descUpper.includes('GYFTR')) tags.push('GYFTR');
  if (descUpper.includes('GOLD')) tags.push('JEWELRY');
  
  return Array.from(new Set(tags)); // Remove duplicates
}

/**
 * Extract transactions from parsed bank statement records
 * Supports HDFC bank format with Withdrawal Amt. and Deposit Amt. columns
 */
export function extractTransactions(records: Record<string, string>[]): Transaction[] {
  return records
    .filter(row => {
      if (!row.Date || !row.Date.trim() || row.Date.includes('****')) return false;
      // Skip summary rows (opening balance, closing balance, etc.)
      const dateStr = row.Date.toLowerCase();
      if (dateStr.includes('opening') || dateStr.includes('closing') || dateStr.includes('summary')) {
        return false;
      }
      // Skip rows without narration (data integrity check)
      if (!row.Narration || !row.Narration.trim()) return false;
      return true;
    })
    .map((row) => {
      // Parse date
      const date = row.Date ? row.Date.trim() : '';
      
      // Get narration/description
      const description = row.Narration ? row.Narration.trim() : '';
      
      // Determine amount (withdrawal or deposit)
      let amount = 0;
      const withdrawal = row['Withdrawal Amt.'] ? parseFloat(row['Withdrawal Amt.']) : 0;
      const deposit = row['Deposit Amt.'] ? parseFloat(row['Deposit Amt.']) : 0;
      
      if (withdrawal > 0) {
        amount = -withdrawal; // Withdrawal is negative
      } else if (deposit > 0) {
        amount = deposit; // Deposit is positive
      }

      return {
        date: toISODate(date),
        description,
        category: autoCategorize(description),
        type: extractTransactionType(description),
        tags: extractTags(description),
        amount: parseFloat(amount.toFixed(2)),
        reference_number: row['Chq./Ref.No.'] ? row['Chq./Ref.No.'].trim() : null,
      };
    })
    .filter(t => t.date && t.amount !== 0); // Filter out empty rows and zero amounts
}

/**
 * Extract transactions from generic CSV/Excel records
 * Falls back when standard columns are not found
 */
export function extractTransactionsFallback(records: Record<string, string>[]): Transaction[] {
  return records
    .filter(row => {
      const hasDate = Object.keys(row).some(k => 
        k.toLowerCase().includes('date') && row[k] && row[k].trim()
      );
      return hasDate;
    })
    .map((row) => {
      // Find date column
      const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date')) || 'Date';
      const date = row[dateKey] ? row[dateKey].trim() : '';
      
      // Find description column
      const descKey = Object.keys(row).find(k => 
        k.toLowerCase().includes('description') || 
        k.toLowerCase().includes('narration') ||
        k.toLowerCase().includes('memo')
      ) || 'Description';
      const description = row[descKey] ? row[descKey].trim() : '';
      
      // Find amount column
      const amountKey = Object.keys(row).find(k => k.toLowerCase().includes('amount')) || 'Amount';
      let amount = 0;
      if (row[amountKey]) {
        const val = parseFloat(row[amountKey]);
        amount = isNaN(val) ? 0 : val;
      }

      // Find reference number column
      const refKey = Object.keys(row).find(k => 
        k.toLowerCase().includes('chq') || 
        k.toLowerCase().includes('ref') ||
        k.toLowerCase().includes('reference')
      );

      return {
        date: toISODate(date),
        description,
        category: autoCategorize(description),
        type: extractTransactionType(description),
        tags: extractTags(description),
        amount: parseFloat(amount.toFixed(2)),
        reference_number: refKey && row[refKey] ? row[refKey].trim() : null,
      };
    })
    .filter(t => t.date && t.amount !== 0);
}
