// utils/transactionExtractor.ts
// Mirrors the logic from scripts/processUploads.js

export interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Coffee': ['coffee', 'cothas'],
  'Food': ['food', 'cafe', 'restaurant', 'bakery', 'snacks', 'apollo pharmacy', 'pharmacy', 'grocery'],
  'Shopping': ['shopping', 'malai', 'sports', 'shuttle', 'gyftr'],
  'Utilities': ['billpay', 'bill', 'electricity', 'water'],
  'Transfers': ['upi', 'neft', 'imps', 'ft-'],
  'Investments': ['groww', 'stocks', 'mutual', 'share', 'mf'],
  'Salary': ['salary', 'neft cr', 'rently'],
  'Entertainment': ['games', 'movie', 'show'],
  'Personal': ['loan', 'emi'],
};

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
        date,
        description,
        category: autoCategorize(description),
        amount: parseFloat(amount.toFixed(2)),
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

      return {
        date,
        description,
        category: autoCategorize(description),
        amount: parseFloat(amount.toFixed(2)),
      };
    })
    .filter(t => t.date && t.amount !== 0);
}
