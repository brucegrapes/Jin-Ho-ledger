#!/usr/bin/env node

/**
 * BankStatementProcessor
 * 
 * This script processes bank statement files (Excel/CSV) from the uploads folder,
 * converts them to CSV format, parses them, and stores parsed data in the parsed_files folder.
 * 
 * Usage:
 *   node scripts/processUploads.js [--clean]
 * 
 * Options:
 *   --clean  Delete original files after processing (optional)
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
 * Process a single file
 */
function processFile(filePath, fileName) {
  console.log(`\n📄 Processing: ${fileName}`);
  
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
    const transactions = extractTransactions(parsedData);
    
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
      const result = processFile(filePath, fileName);
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
