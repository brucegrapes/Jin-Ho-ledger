# Bank Statement Processing Scripts

## `processUploads.js`

A Node.js script that processes bank statement files (Excel/CSV) from the uploads folder, converts them to CSV format, parses them, and stores the parsed data in JSON format.

### Features

- ✅ Converts Excel files (.xlsx, .xls) to CSV
- ✅ Parses CSV files and extracts transaction data
- ✅ Saves both CSV and JSON files for each processed bank statement
- ✅ Extracts key transaction fields: Date, Description, Category, Amount
- ✅ Optional cleanup of original files after processing

### Usage

#### Basic Processing
```bash
npm run process-uploads
```
Processes all files in the `uploads` folder and saves results to `parsed_files` folder.

#### Processing with Cleanup
```bash
npm run process-uploads:clean
```
Same as above, but also deletes the original files from the `uploads` folder after successful processing.

#### Direct Node Command
```bash
node scripts/processUploads.js
node scripts/processUploads.js --clean
```

### Input Files

Place your bank statement files in the `uploads` folder:
- Excel files: `.xlsx`, `.xls`
- CSV files: `.csv`

Example:
```
uploads/
├── bank_statement_jan.xlsx
├── bank_statement_feb.csv
└── account_summary.xls
```

### Output Files

Processed files are saved to the `parsed_files` folder with this naming convention:

For each input file `filename.ext`, you get:
- `filename_converted.csv` - CSV version of the data
- `filename_parsed.json` - Parsed transaction data in JSON format

Example output:
```
parsed_files/
├── bank_statement_jan_converted.csv
├── bank_statement_jan_parsed.json
├── bank_statement_feb_converted.csv
├── bank_statement_feb_parsed.json
├── account_summary_converted.csv
└── account_summary_parsed.json
```

### Parsed JSON Format

The `*_parsed.json` files contain an array of transactions with the following structure:

```json
[
  {
    "date": "2026-01-15",
    "description": "Amazon Purchase",
    "category": "Shopping",
    "amount": 49.99
  },
  {
    "date": "2026-01-16",
    "description": "Salary Deposit",
    "category": "Income",
    "amount": 5000.00
  }
]
```

### Field Mapping

The script looks for the following column names in your bank statements:
- **Date**: `Date`, `date`
- **Description**: `Description`, `description`, `Memo`, `memo`
- **Category**: `Category`, `category` (defaults to "Uncategorized" if missing)
- **Amount**: `Amount`, `amount`

Adjust your Excel/CSV column headers to match these names for best results.

### Example Bank Statement Format

Your Excel or CSV file should have columns like:

| Date | Description | Category | Amount |
|------|-------------|----------|--------|
| 2026-01-15 | Amazon Purchase | Shopping | 49.99 |
| 2026-01-16 | Salary Deposit | Income | 5000.00 |
| 2026-01-17 | Coffee Shop | Food | 5.50 |

### Error Handling

The script handles:
- Missing or corrupted files
- Unsupported file formats
- CSV parsing errors
- Excel conversion errors

Errors are logged to the console with a detailed message, allowing you to identify and fix problematic files.

### Script Output Example

```
🏦 Bank Statement Processor

Reading files from: /home/user/myledger/uploads
Saving parsed files to: /home/user/myledger/parsed_files

📄 Processing: bank_statement.xlsx
   Converting Excel to CSV...
   ✅ CSV saved: bank_statement_converted.csv
   ✅ Parsed JSON saved: bank_statement_parsed.json
   📊 Found 127 transactions

==================================================
✅ Processing complete!
📊 Summary: 1 succeeded, 0 failed
==================================================

✨ Done!
```

### Automation

You can create a cron job or scheduled task to run this script periodically:

```bash
# Linux/Mac crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/myledger && npm run process-uploads:clean

# Windows Task Scheduler
# Run: node C:\path\to\myledger\scripts\processUploads.js --clean
```

### Troubleshooting

**Problem**: "Cannot access file" error
- **Solution**: Ensure the uploads folder exists and you have read/write permissions

**Problem**: "Cannot find module" error
- **Solution**: Make sure you've run `npm install` to install all dependencies

**Problem**: Files not processed
- **Solution**: Check that your Excel/CSV files have the correct column headers (Date, Description, Category, Amount)

**Problem**: Empty or incorrect parsed data
- **Solution**: Verify your bank statement file format matches the expected column names
