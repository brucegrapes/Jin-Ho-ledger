#!/usr/bin/env node

/**
 * BankStatementProcessor
 * 
 * This script processes bank statement files (Excel/CSV) from the uploads folder,
 * converts them to CSV format, parses them, and stores parsed data in the parsed_files folder.
 * 
 * Usage:
 *   node scripts/processUploads.js [--clean] [--bank=hdfc|indian_bank|iob]
 * 
 * Options:
 *   --clean  Delete original files after processing (optional)
 *   --bank   Bank type: hdfc (default), indian_bank, or iob
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const xlsx = require('xlsx');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PARSED_FILES_DIR = path.join(__dirname, '..', 'parsed_files');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PARSED_FILES_DIR)) {
  fs.mkdirSync(PARSED_FILES_DIR, { recursive: true });
}

/**
 * Convert DD/MM/YY format to ISO format (YYYY-MM-DD)
 * Example: "31/01/26" -> "2026-01-31"
 */
function toISODate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  // Handle 2-digit year
  if (year < 100) {
    year += 2000;
  }
  
  day = String(day).padStart(2, '0');
  month = String(month).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convert Excel file to CSV
 */
function convertExcelToCSV(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet);
    const csv = xlsx.utils.sheet_to_csv(sheet);
    return { csv, json };
  } catch (err) {
    throw new Error(`Failed to convert Excel file: ${(err).message}`);
  }
}

/**
 * Parse CSV content
 */
function parseCSV(csvContent) {
  try {
    // Split by lines and find where the actual transaction data starts
    const lines = csvContent.split('\n');
    let headerIndex = -1;
    
    // Look for the header row (contains "Date" column)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Date') && lines[i].includes('Narration')) {
        headerIndex = i;
        break;
      }
    }
    
    let csvToProcess = csvContent;
    
    // If we found a header row, reconstruct CSV from that point
    if (headerIndex > 0) {
      csvToProcess = lines.slice(headerIndex).join('\n');
    }
    
    const records = parse(csvToProcess, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      trim: true,
    });
    return records;
  } catch (err) {
    throw new Error(`Failed to parse CSV: ${(err).message}`);
  }
}

/**
 * Extract transaction data from parsed records
 */
function extractTransactions(records) {
  const categoryKeywords = {
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

  const transactionTypePatterns = {
    'UPI': ['upi-'],
    'Bill Payment': ['billpay', 'ib billpay'],
    'Transfer': ['neft', 'imps', 'ft-'],
    'POS': ['pos '],
    'Check': ['chq'],
  };

  /**
   * Extract tags from transaction description
   */
  function extractTags(description) {
    const tags = [];
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
    
    return [...new Set(tags)]; // Remove duplicates
  }

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

      // Auto-categorize based on narration
      let category = 'Uncategorized';
      const descLower = description.toLowerCase();
      
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => descLower.includes(keyword))) {
          category = cat;
          break;
        }
      }

      // Extract transaction type
      let type = 'Other';
      for (const [typeKey, patterns] of Object.entries(transactionTypePatterns)) {
        if (patterns.some(pattern => descLower.includes(pattern))) {
          type = typeKey;
          break;
        }
      }

      return {
        date: toISODate(date),
        description,
        category,
        type,
        tags: extractTags(description),
        amount: parseFloat(amount.toFixed(2)),
        reference_number: row['Chq./Ref.No.'] ? row['Chq./Ref.No.'].trim() : null,
      };
    })
    .filter(t => t.date && t.amount !== 0); // Filter out empty rows and zero amounts
}

/**
 * Convert "DD Mon YYYY" format to ISO date (YYYY-MM-DD)
 * Example: "03 Mar 2025" -> "2025-03-03"
 */
function toISODateLong(dateStr) {
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 3) return dateStr;
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1].toLowerCase()];
  const year = parts[2];
  if (!month) return dateStr;
  return `${year}-${month}-${day}`;
}

/**
 * Convert "DD-MMM-YY" format to ISO date (YYYY-MM-DD)
 * Example: "18-Feb-26" -> "2026-02-18"
 */
function toISODateIOB(dateStr) {
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return dateStr;
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1].toLowerCase()];
  let year = parseInt(parts[2], 10);
  // Handle 2-digit year: assume 2000s
  if (year < 100) year += 2000;
  if (!month) return dateStr;
  return `${year}-${month}-${day}`;
}

/**
 * Parse INR amount string from Indian Bank statements
 * Examples: "INR 600.00" -> 600, "INR 50,000.00" -> 50000, " - " -> 0
 */
function parseINRAmount(value) {
  if (!value) return 0;
  const trimmed = value.trim();
  if (trimmed === '-' || trimmed === '- ' || trimmed === ' - ' || trimmed === '') return 0;
  const cleaned = trimmed.replace(/INR\s*/i, '').replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract reference number from IOB transaction description
 * IOB format: "S45656391 Transfer MOB UPI/118687461554/DR/Cothas Coffee"
 */
function extractIOBReference(description) {
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
 * Extract transactions from IOB CSV format.
 * Format: Date,Transaction Details,Debits,Credits,Balance
 * Example: "18-Feb-26","S45656391 Transfer UPI/118687461554/DR/Cothas Coffee","4.14","-","0.00"
 */
function extractIOBTransactions(csvContent) {
  const lines = csvContent.split('\n');
  const transactions = [];

  const categoryKeywords = {
    'Investments': ['groww', 'stocks', 'mutual', 'share', 'mf', 'indmoney'],
    'Coffee': ['coffee', 'cothas'],
    'Food': ['food', 'cafe', 'restaurant', 'bakery', 'snacks', 'apollo pharmacy', 'pharmacy', 'grocery', 'eggs', 'coconut'],
    'Shopping': ['shopping', 'malai', 'sports', 'shuttle', 'gyftr'],
    'Utilities': ['billpay', 'bill', 'electricity', 'water', 'recharge'],
    'Salary': ['salary', 'neft cr', 'rently'],
    'Transfers': ['upi', 'neft', 'imps', 'ft-', 'transfer'],
    'Entertainment': ['games', 'movie', 'show'],
    'Personal': ['loan', 'emi'],
  };

  const transactionTypePatterns = {
    'UPI': ['upi'],
    'Bill Payment': ['billpay'],
    'Transfer': ['neft', 'imps', 'transfer'],
    'POS': ['pos '],
    'Check': ['chq'],
  };

  function extractTags(description) {
    const tags = [];
    const descUpper = description.toUpperCase();
    if (descUpper.includes('GROWW')) tags.push('GROWW');
    if (descUpper.includes('AUTOPAY')) tags.push('AUTOPAY');
    if (descUpper.includes('BILLPAY')) tags.push('BILLPAY');
    if (descUpper.includes('SALARY') || descUpper.includes('RENTLY')) tags.push('SALARY');
    if (descUpper.includes('NEFT')) tags.push('NEFT');
    if (descUpper.includes('IMPS')) tags.push('IMPS');
    return [...new Set(tags)];
  }

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line with quoted fields
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);

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

    // Auto-categorize
    let category = 'Uncategorized';
    const descLower = description.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => descLower.includes(keyword))) {
        category = cat;
        break;
      }
    }

    // Extract transaction type
    let type = 'Other';
    for (const [typeKey, patterns] of Object.entries(transactionTypePatterns)) {
      if (patterns.some(pattern => descLower.includes(pattern))) {
        type = typeKey;
        break;
      }
    }

    const refNumber = extractIOBReference(description);

    transactions.push({
      date: toISODateIOB(dateStr),
      description,
      category,
      type,
      tags: extractTags(description),
      amount: parseFloat(amount.toFixed(2)),
      reference_number: refNumber,
    });
  }

  return transactions;
}

/**
 * Extract transactions from Indian Bank CSV content (raw line-based parsing).
 * Supports two formats:
 * 1. Indian Bank Excel: Repeating headers, multi-line descriptions, INR-prefixed amounts.
 * 2. IOB CSV: Clean CSV with Date,Transaction Details,Debits,Credits,Balance header.
 */
function extractIndianBankTransactions(csvContent) {
  const lines = csvContent.split('\n');
  
  // Detect format: IOB has header "Date,Transaction Details,Debits,Credits,Balance"
  const firstLine = lines[0] || '';
  const isIOBFormat = firstLine.includes('Date,Transaction Details,Debits,Credits,Balance');
  
  if (isIOBFormat) {
    return extractIOBTransactions(csvContent);
  }
  
  const transactions = [];

  let currentDate = '';
  let currentDesc = '';
  let currentDebit = 0;
  let currentCredit = 0;

  const categoryKeywords = {
    'Investments': ['groww', 'stocks', 'mutual', 'share', 'mf', 'indmoney'],
    'Coffee': ['coffee', 'cothas'],
    'Food': ['food', 'cafe', 'restaurant', 'bakery', 'snacks', 'apollo pharmacy', 'pharmacy', 'grocery', 'eggs', 'coconut'],
    'Shopping': ['shopping', 'malai', 'sports', 'shuttle', 'gyftr'],
    'Utilities': ['billpay', 'bill', 'electricity', 'water', 'recharge'],
    'Salary': ['salary', 'neft cr', 'rently'],
    'Transfers': ['upi', 'neft', 'imps', 'ft-', 'transfer from', 'transfer to'],
    'Entertainment': ['games', 'movie', 'show'],
    'Personal': ['loan', 'emi', 'loandisburs'],
    'ATM': ['atm wdl', 'self-'],
    'Bank Charges': ['chg for', 'chrg', 'amc charge'],
  };

  const transactionTypePatterns = {
    'UPI': ['upi/', '/upi'],
    'Bill Payment': ['billpay', 'ib billpay'],
    'Transfer': ['neft', 'imps', 'transfer from', 'transfer to'],
    'ATM': ['atm wdl', 'self-'],
    'POS': ['pos '],
    'Check': ['chq'],
  };

  function extractTags(description) {
    const tags = [];
    const descUpper = description.toUpperCase();
    if (descUpper.includes('GROWW')) tags.push('GROWW');
    if (descUpper.includes('INDMONEY')) tags.push('INDMONEY');
    if (descUpper.includes('AUTOPAY')) tags.push('AUTOPAY');
    if (descUpper.includes('BILLPAY')) tags.push('BILLPAY');
    if (descUpper.includes('SALARY') || descUpper.includes('RENTLY')) tags.push('SALARY');
    if (descUpper.includes('NEFT')) tags.push('NEFT');
    if (descUpper.includes('IMPS')) tags.push('IMPS');
    if (descUpper.includes('ATM WDL') || descUpper.includes('SELF-')) tags.push('ATM');
    if (descUpper.includes('PHONEP')) tags.push('PHONEPE');
    if (descUpper.includes('PAYTM')) tags.push('PAYTM');
    if (descUpper.includes('GOOGLE')) tags.push('GOOGLE');
    return [...new Set(tags)];
  }

  function flushTransaction() {
    if (!currentDate || !currentDesc) return;
    const description = currentDesc.trim();
    let amount = 0;
    if (currentDebit > 0) {
      amount = -currentDebit;
    } else if (currentCredit > 0) {
      amount = currentCredit;
    }
    if (amount === 0) return;

    // Auto-categorize
    let category = 'Uncategorized';
    const descLower = description.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => descLower.includes(keyword))) {
        category = cat;
        break;
      }
    }

    // Extract transaction type
    let type = 'Other';
    for (const [typeKey, patterns] of Object.entries(transactionTypePatterns)) {
      if (patterns.some(pattern => descLower.includes(pattern))) {
        type = typeKey;
        break;
      }
    }

    // Extract reference number
    let refNumber = null;
    const upiMatch = description.match(/\/UPI\/(\d{10,})\//);
    const impsMatch = description.match(/\/IMPS\/P2A\/(\d+)\//);
    const neftMatch = description.match(/NEFT\/\w+\/(\w+)\//);
    if (upiMatch) refNumber = upiMatch[1];
    else if (impsMatch) refNumber = impsMatch[1];
    else if (neftMatch) refNumber = neftMatch[1];

    transactions.push({
      date: toISODateLong(currentDate),
      description,
      category,
      type,
      tags: extractTags(description),
      amount: parseFloat(amount.toFixed(2)),
      reference_number: refNumber,
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.replace(/,/g, '') === '') continue;
    if (trimmed.includes(',Date,Transaction Details,')) continue;

    // Split by comma respecting quoted fields
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);

    const dateVal = (cols[1] || '').trim();
    const descVal = (cols[2] || '').trim();
    const debitVal = (cols[8] || '').trim();
    const creditVal = (cols[10] || '').trim();

    const isDateRow = /^\d{2}\s+\w{3}\s+\d{4}$/.test(dateVal);

    if (isDateRow) {
      flushTransaction();
      currentDate = dateVal;
      currentDesc = descVal;
      currentDebit = parseINRAmount(debitVal);
      currentCredit = parseINRAmount(creditVal);
    } else if (!dateVal && descVal) {
      currentDesc += ' ' + descVal;
    }
  }

  flushTransaction();
  return transactions;
}

/**
 * Process a single file
 */
function processFile(filePath, fileName, bankType) {
  console.log(`\n📄 Processing: ${fileName} (bank: ${bankType})`);
  
  const ext = path.extname(fileName).toLowerCase();
  let csvContent, parsedData;

  try {
    if (ext === '.xlsx' || ext === '.xls') {
      console.log('   Converting Excel to CSV...');
      const { csv } = convertExcelToCSV(filePath);
      csvContent = csv;
      parsedData = parseCSV(csv);
    } else if (ext === '.csv') {
      console.log('   Parsing CSV...');
      csvContent = fs.readFileSync(filePath, 'utf-8');
      parsedData = parseCSV(csvContent);
    } else {
      console.log(`   ⚠️  Unsupported file type: ${ext}`);
      return null;
    }

    // Extract transactions
    let transactions;
    if (bankType === 'indian_bank' || bankType === 'iob') {
      transactions = extractIndianBankTransactions(csvContent);
    } else {
      transactions = extractTransactions(parsedData);
    }
    
    // Create output file names
    const baseName = path.basename(fileName, ext);
    const csvFileName = `${baseName}_converted.csv`;
    const jsonFileName = `${baseName}_parsed.json`;

    // Save CSV file
    const csvPath = path.join(PARSED_FILES_DIR, csvFileName);
    fs.writeFileSync(csvPath, csvContent);
    console.log(`   ✅ CSV saved: ${csvFileName}`);

    // Save parsed JSON file
    const jsonPath = path.join(PARSED_FILES_DIR, jsonFileName);
    fs.writeFileSync(jsonPath, JSON.stringify(transactions, null, 2));
    console.log(`   ✅ Parsed JSON saved: ${jsonFileName}`);
    console.log(`   📊 Found ${transactions.length} transactions`);

    return { csvFileName, jsonFileName, transactionCount: transactions.length };
  } catch (err) {
    console.error(`   ❌ Error: ${(err).message}`);
    return null;
  }
}

/**
 * Main processing function
 */
function main() {
  console.log('\n🏦 Bank Statement Processor\n');
  console.log(`Reading files from: ${UPLOADS_DIR}`);
  console.log(`Saving parsed files to: ${PARSED_FILES_DIR}\n`);

  // Get command line arguments
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean');
  const bankArg = args.find(a => a.startsWith('--bank='));
  const bankType = bankArg ? bankArg.split('=')[1] : 'hdfc';

  // Read all files from uploads directory
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('⚠️  No uploads directory found!');
    process.exit(1);
  }

  const files = fs.readdirSync(UPLOADS_DIR);
  
  if (files.length === 0) {
    console.log('⚠️  No files found in uploads folder!');
    process.exit(0);
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  files.forEach((fileName) => {
    const filePath = path.join(UPLOADS_DIR, fileName);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const result = processFile(filePath, fileName, bankType);
      if (result) {
        results.push(result);
        successCount++;
      } else {
        failCount++;
      }
    }
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Processing complete!`);
  console.log(`📊 Summary: ${successCount} succeeded, ${failCount} failed`);
  console.log('='.repeat(50) + '\n');

  // Clean up original files if requested
  if (shouldClean && successCount > 0) {
    console.log('🧹 Cleaning up original files...');
    files.forEach((fileName) => {
      const filePath = path.join(UPLOADS_DIR, fileName);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        fs.unlinkSync(filePath);
        console.log(`   Deleted: ${fileName}`);
      }
    });
  }

  console.log('\n✨ Done!\n');
}

// Run the script
main();
