// utils/transactionExtractor.ts
// Mirrors the logic from scripts/processUploads.js

import { toISODate, toISODateLong, toISODateIOB } from './dateParser';

export interface Transaction {
  date: string;
  description: string;
  category: string;
  type: string;
  tags: string[];
  amount: number;
  reference_number?: string | null;
}

/** A row from the category_rules table (subset of columns needed here). */
export interface DBCategoryRule {
  category: string;
  keyword: string;
  match_type: string;
  priority: number;
}

/** A row from the tag_rules table (subset of columns needed here). */
export interface DBTagRule {
  tag_name: string;
  pattern: string;
  match_type: string;
  priority: number;
}

/** Optional DB-backed rules to override hardcoded defaults. */
export interface ExtractionRules {
  categoryRules?: DBCategoryRule[];
  tagRules?: DBTagRule[];
}

// ─── Hardcoded fallback rules ─────────────────────────────────────────────────

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

// ─── Matcher helper ───────────────────────────────────────────────────────────

function matchesPattern(text: string, pattern: string, matchType: string): boolean {
  const t = text.toLowerCase();
  const p = pattern.toLowerCase();
  switch (matchType) {
    case 'startsWith': return t.startsWith(p);
    case 'endsWith':   return t.endsWith(p);
    case 'exact':      return t === p;
    case 'regex': {
      try { return new RegExp(p, 'i').test(t); } catch { return false; }
    }
    case 'contains':
    default:           return t.includes(p);
  }
}

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
 * Auto-categorize transaction based on description.
 * Uses DB rules when provided (sorted by priority desc), falls back to hardcoded.
 */
function autoCategorize(description: string, dbRules?: DBCategoryRule[]): string {
  if (dbRules && dbRules.length > 0) {
    // Sort highest priority first (already done at query time, but be safe)
    const sorted = [...dbRules].sort((a, b) => b.priority - a.priority);
    for (const rule of sorted) {
      if (matchesPattern(description, rule.keyword, rule.match_type)) {
        return rule.category;
      }
    }
    return 'Uncategorized';
  }

  // Hardcoded fallback
  const descLower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      return category;
    }
  }
  return 'Uncategorized';
}

/**
 * Extract tags from transaction description.
 * Uses DB rules when provided, falls back to hardcoded patterns.
 */
function extractTags(description: string, dbRules?: DBTagRule[]): string[] {
  if (dbRules && dbRules.length > 0) {
    const sorted = [...dbRules].sort((a, b) => b.priority - a.priority);
    const tags: string[] = [];
    for (const rule of sorted) {
      if (matchesPattern(description, rule.pattern, rule.match_type)) {
        tags.push(rule.tag_name.toUpperCase());
      }
    }
    return Array.from(new Set(tags));
  }

  // Hardcoded fallback
  const tags: string[] = [];
  const descUpper = description.toUpperCase();
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

  return Array.from(new Set(tags));
}

/**
 * Extract transactions from parsed bank statement records
 * Supports HDFC bank format with Withdrawal Amt. and Deposit Amt. columns
 */
export function extractTransactions(records: Record<string, string>[], rules?: ExtractionRules): Transaction[] {
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
        category: autoCategorize(description, rules?.categoryRules),
        type: extractTransactionType(description),
        tags: extractTags(description, rules?.tagRules),
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
export function extractTransactionsFallback(records: Record<string, string>[], rules?: ExtractionRules): Transaction[] {
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
        category: autoCategorize(description, rules?.categoryRules),
        type: extractTransactionType(description),
        tags: extractTags(description, rules?.tagRules),
        amount: parseFloat(amount.toFixed(2)),
        reference_number: refKey && row[refKey] ? row[refKey].trim() : null,
      };
    })
    .filter(t => t.date && t.amount !== 0);
}

/**
 * Parse INR amount string from Indian Bank statements
 * Examples: "INR 600.00" -> 600, "INR 50,000.00" -> 50000, " - " -> 0
 */
function parseINRAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const trimmed = value.trim();
  if (trimmed === '-' || trimmed === '- ' || trimmed === ' - ' || trimmed === '') return 0;
  // Remove "INR " prefix, commas, and any whitespace
  const cleaned = trimmed.replace(/INR\s*/i, '').replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse and extract reference number from IOB transaction description
 * IOB format: "S45656391 Transfer MOB UPI/118687461554/DR/Cothas Coffee"
 * Reference number can be:
 * - S-number at the start (e.g., "S45656391")
 * - UPI reference (e.g., "118687461554" from "/UPI/118687461554/")
 * - IMPS/NEFT reference
 */
function extractIOBReference(description: string): string | null {
  // Try S-number first (IOB reference)
  const sMatch = description.match(/^S(\d{8,})/);
  if (sMatch) return sMatch[1];

  // Try UPI reference
  const upiMatch = description.match(/\/UPI\/(\d{10,})\//);
  if (upiMatch) return upiMatch[1];

  // Try IMPS reference
  const impsMatch = description.match(/IMPS\/(\d+)\//);
  if (impsMatch) return impsMatch[1];

  // Try NEFT reference
  const neftMatch = description.match(/NEFT[^\/]*\/(\w+)/);
  if (neftMatch) return neftMatch[1];

  return null;
}

/**
 * Extract transactions from IOB CSV format
 * Format: Date,Transaction Details,Debits,Credits,Balance
 * Example: "18-Feb-26","S45656391 Transfer UPI/118687461554/DR/Cothas Coffee","4.14","-","0.00"
 */
function extractIOBTransactions(csvContent: string, rules?: ExtractionRules): Transaction[] {
  const lines = csvContent.split('\n');
  const transactions: Transaction[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line with quoted fields
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);

    if (cols.length < 5) continue;

    const dateStr = cols[0].trim();
    const description = cols[1].trim();
    const debitStr = cols[2].trim();
    const creditStr = cols[3].trim();

    // Parse amounts (handle "-" as 0)
    const debit = (debitStr === '-' || debitStr === '') ? 0 : parseFloat(debitStr.replace(/,/g, ''));
    const credit = (creditStr === '-' || creditStr === '') ? 0 : parseFloat(creditStr.replace(/,/g, ''));

    let amount = 0;
    if (debit > 0) {
      amount = -debit; // Debit is negative (money going out)
    } else if (credit > 0) {
      amount = credit;  // Credit is positive (money coming in)
    }

    if (amount === 0 || !dateStr || !description) continue;

    const refNumber = extractIOBReference(description);

    transactions.push({
      date: toISODateIOB(dateStr),
      description,
      category: autoCategorize(description, rules?.categoryRules),
      type: extractTransactionType(description),
      tags: extractTags(description, rules?.tagRules),
      amount: parseFloat(amount.toFixed(2)),
      reference_number: refNumber,
    });
  }

  return transactions;
}

/**
 * Extract transactions from Indian Bank CSV lines (raw line-based parsing).
 * Supports two formats:
 * 1. Indian Bank Excel format:
 *   - Repeating header rows: ,Date,Transaction Details,,,,,,Debits,,Credits,,,Balance,,,
 *   - Data rows: ,DD Mon YYYY,Description,,,,,,Debits_val,,Credits_val,,,Balance_val,,,
 *   - Continuation rows: ,,continued description text,,,,,,,,,,,,,,
 *   - Amounts prefixed with "INR" and may contain commas
 * 2. IOB CSV format:
 *   - Header: Date,Transaction Details,Debits,Credits,Balance
 *   - Data rows: "DD-MMM-YY","S12345 Transfer UPI/...","amount","-","balance"
 *   - Clean CSV with quoted fields, no multi-line descriptions
 */
export function extractIndianBankTransactions(csvContent: string, rules?: ExtractionRules): Transaction[] {
  const lines = csvContent.split('\n');
  const transactions: Transaction[] = [];

  // Detect format: IOB has header "Date,Transaction Details,Debits,Credits,Balance"
  const firstLine = lines[0] || '';
  const isIOBFormat = firstLine.includes('Date,Transaction Details,Debits,Credits,Balance');

  if (isIOBFormat) {
    // Parse IOB CSV format (clean CSV with quoted fields)
    return extractIOBTransactions(csvContent, rules);
  }

  // Temporary storage for building multi-line transactions
  let currentDate = '';
  let currentDesc = '';
  let currentDebit = 0;
  let currentCredit = 0;

  function flushTransaction() {
    if (!currentDate || !currentDesc) return;
    const description = currentDesc.trim();
    let amount = 0;
    if (currentDebit > 0) {
      amount = -currentDebit; // Debit is negative (money going out)
    } else if (currentCredit > 0) {
      amount = currentCredit;  // Credit is positive (money coming in)
    }
    if (amount === 0) return;

    // Try to extract a reference number from the description
    // Indian Bank UPI refs look like: /UPI/529838990789/
    let refNumber: string | null = null;
    const upiMatch = description.match(/\/UPI\/(\d{10,})\//);
    const impsMatch = description.match(/\/IMPS\/P2A\/(\d+)\//);
    const neftMatch = description.match(/NEFT\/\w+\/(\w+)\//);
    if (upiMatch) refNumber = upiMatch[1];
    else if (impsMatch) refNumber = impsMatch[1];
    else if (neftMatch) refNumber = neftMatch[1];

    transactions.push({
      date: toISODateLong(currentDate),
      description,
      category: autoCategorize(description, rules?.categoryRules),
      type: extractTransactionType(description),
      tags: extractTags(description, rules?.tagRules),
      amount: parseFloat(amount.toFixed(2)),
      reference_number: refNumber,
    });
  }

  for (const line of lines) {
    // Skip empty lines and header lines
    const trimmed = line.trim();
    if (!trimmed || trimmed === ','.repeat(trimmed.length)) continue;
    if (trimmed.includes(',Date,Transaction Details,')) continue;

    // Split by comma but respect quoted fields (for amounts like "INR 50,000.00")
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);

    // Indian Bank column layout (0-indexed):
    // 0: empty, 1: Date, 2: Transaction Details, 3-7: empty,
    // 8: Debits, 9: empty, 10: Credits, 11-12: empty, 13: Balance, 14-15: empty
    const dateVal = (cols[1] || '').trim();
    const descVal = (cols[2] || '').trim();
    const debitVal = (cols[8] || '').trim();
    const creditVal = (cols[10] || '').trim();

    // Check if this is a data row with a date
    const isDateRow = /^\d{2}\s+\w{3}\s+\d{4}$/.test(dateVal);

    if (isDateRow) {
      // Flush previous transaction
      flushTransaction();
      currentDate = dateVal;
      currentDesc = descVal;
      currentDebit = parseINRAmount(debitVal);
      currentCredit = parseINRAmount(creditVal);
    } else if (!dateVal && descVal) {
      // Continuation row - append description to current transaction
      currentDesc += ' ' + descVal;
    }
    // else: skip non-data rows (account details, summaries, etc.)
  }

  // Flush the last transaction
  flushTransaction();

  return transactions;
}

/**
 * Re-apply category and tag rules to a plain description string.
 * Used by the retag endpoint to update existing transactions.
 */
export function applyRulesToDescription(
  description: string,
  rules: ExtractionRules
): { category: string; tags: string[] } {
  return {
    category: autoCategorize(description, rules.categoryRules),
    tags: extractTags(description, rules.tagRules),
  };
}
