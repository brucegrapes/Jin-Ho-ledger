import { NextRequest, NextResponse } from 'next/server';
import { importCSV, importExcel, saveTransactions, saveParsedJSON } from '@/utils/importer';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Save file to uploads folder
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split('.').pop()?.toLowerCase();
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const tempPath = path.join(uploadsDir, `${Date.now()}_${file.name}`);
  fs.writeFileSync(tempPath, buffer);

  let transactions = [];
  try {
    if (ext === 'csv') {
      transactions = importCSV(tempPath);
    } else if (ext === 'xlsx' || ext === 'xls') {
      transactions = importExcel(tempPath);
    } else {
      fs.unlinkSync(tempPath);
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (transactions.length === 0) {
      fs.unlinkSync(tempPath);
      return NextResponse.json({ error: 'No valid transactions found in file' }, { status: 400 });
    }

    // Save to database
    const result = saveTransactions(transactions);
    
    // Save parsed JSON to parsed_files folder
    const jsonFileName = saveParsedJSON(transactions, file.name);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);

    return NextResponse.json({ 
      success: true, 
      count: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
      fileName: file.name,
      jsonFile: jsonFileName,
    });
  } catch (err) {
    // Clean up on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return NextResponse.json({ 
      error: `Failed to process file: ${(err as Error).message}` 
    }, { status: 400 });
  }
}

