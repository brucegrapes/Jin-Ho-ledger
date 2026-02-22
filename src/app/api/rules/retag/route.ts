import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';
import { decryptString } from '@/utils/serverEncryption';
import { applyRulesToDescription, DBCategoryRule, DBTagRule } from '@/utils/transactionExtractor';

interface TransactionRow {
  id: number;
  description: string | null;
}

/**
 * POST /api/rules/retag
 * Re-applies the user's current category and tag rules to ALL their existing
 * transactions. Runs server-side; can be slow for large datasets but is safe
 * (idempotent — just overwrites category + tags columns).
 */
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = auth.user.id;

  // Load user's DB rules
  const categoryRules = db
    .prepare('SELECT category, keyword, match_type, priority FROM category_rules WHERE user_id = ? ORDER BY priority DESC')
    .all(userId) as DBCategoryRule[];
  const tagRules = db
    .prepare('SELECT tag_name, pattern, match_type, priority FROM tag_rules WHERE user_id = ? ORDER BY priority DESC')
    .all(userId) as DBTagRule[];

  if (categoryRules.length === 0 && tagRules.length === 0) {
    return NextResponse.json({ error: 'No rules configured. Load defaults first.' }, { status: 400 });
  }

  const rules = { categoryRules, tagRules };

  // Fetch all transactions for this user
  const rows = db
    .prepare('SELECT id, description FROM transactions WHERE user_id = ?')
    .all(userId) as TransactionRow[];

  const update = db.prepare(
    'UPDATE transactions SET category = ?, tags = ? WHERE id = ?'
  );

  let updated = 0;
  const updateAll = db.transaction(() => {
    for (const row of rows) {
      const plainDesc = decryptString(row.description) ?? '';
      const { category, tags } = applyRulesToDescription(plainDesc, rules);
      update.run(category, JSON.stringify(tags), row.id);
      updated++;
    }
  });

  updateAll();

  return NextResponse.json({ success: true, updated });
}
