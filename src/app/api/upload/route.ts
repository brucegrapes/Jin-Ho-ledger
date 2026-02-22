import { NextRequest, NextResponse } from 'next/server';
import { importCSV, importExcel, saveTransactions } from '@/utils/importer';
import { DBCategoryRule, DBTagRule } from '@/utils/transactionExtractor';
import db from '@/utils/db';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const bankType = (formData.get('bankType') as string) || 'hdfc';
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/upload' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    // Load user's DB rules (fall back to hardcoded if none exist)
    const categoryRules = db
      .prepare('SELECT category, keyword, match_type, priority FROM category_rules WHERE user_id = ? ORDER BY priority DESC')
      .all(auth.user.id) as DBCategoryRule[];
    const tagRules = db
      .prepare('SELECT tag_name, pattern, match_type, priority FROM tag_rules WHERE user_id = ? ORDER BY priority DESC')
      .all(auth.user.id) as DBTagRule[];
    const rules = categoryRules.length > 0 || tagRules.length > 0
      ? { categoryRules, tagRules }
      : undefined; // fall back to hardcoded defaults if user has no rules yet

    if (ext === 'csv') {
      transactions = importCSV(tempPath, bankType, rules);
    } else if (ext === 'xlsx' || ext === 'xls') {
      transactions = importExcel(tempPath, bankType, rules);
    } else {
      fs.unlinkSync(tempPath);
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (transactions.length === 0) {
      fs.unlinkSync(tempPath);
      return NextResponse.json({ error: 'No valid transactions found in file' }, { status: 400 });
    }

    // Save to database
    const result = saveTransactions(transactions, auth.user.id);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);

    writeAuditLog(auth.user.id, AuditAction.FILE_UPLOAD_SUCCESS, ipAddress, userAgent, {
      fileName: file.name,
      fileSize: buffer.byteLength,
      bankType,
      inserted: result.inserted,
      skipped: result.skipped,
    });
    return NextResponse.json({ 
      success: true, 
      count: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
      fileName: file.name,
    });
  } catch (err) {
    // Clean up on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    writeAuditLog(auth.user.id, AuditAction.FILE_UPLOAD_FAILURE, ipAddress, userAgent, {
      fileName: file.name,
      reason: (err as Error).message,
    });
    return NextResponse.json({ 
      error: `Failed to process file: ${(err as Error).message}` 
    }, { status: 400 });
  }
}

