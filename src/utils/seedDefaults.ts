// utils/seedDefaults.ts
// Inserts default category and tag rules for a newly registered user.

import db from './db';

interface CategoryDefault {
  category: string;
  keyword: string;
  match_type: string;
  priority: number;
  color: string;
}

interface TagDefault {
  tag_name: string;
  pattern: string;
  match_type: string;
  priority: number;
}

const DEFAULT_CATEGORY_RULES: CategoryDefault[] = [
  // Investments
  { category: 'Investments', keyword: 'groww',   match_type: 'contains', priority: 10, color: '#DAA520' },
  { category: 'Investments', keyword: 'stocks',  match_type: 'contains', priority: 10, color: '#DAA520' },
  { category: 'Investments', keyword: 'mutual',  match_type: 'contains', priority: 10, color: '#DAA520' },
  { category: 'Investments', keyword: 'share',   match_type: 'contains', priority: 10, color: '#DAA520' },
  { category: 'Investments', keyword: 'mf',      match_type: 'contains', priority: 10, color: '#DAA520' },
  // Coffee
  { category: 'Coffee',      keyword: 'coffee',  match_type: 'contains', priority: 10, color: '#8B4513' },
  { category: 'Coffee',      keyword: 'cothas',  match_type: 'contains', priority: 10, color: '#8B4513' },
  // Food
  { category: 'Food',        keyword: 'food',             match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'cafe',             match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'restaurant',       match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'bakery',           match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'snacks',           match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'apollo pharmacy',  match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'pharmacy',         match_type: 'contains', priority: 10, color: '#FF6347' },
  { category: 'Food',        keyword: 'grocery',          match_type: 'contains', priority: 10, color: '#FF6347' },
  // Shopping
  { category: 'Shopping',    keyword: 'shopping', match_type: 'contains', priority: 10, color: '#FF69B4' },
  { category: 'Shopping',    keyword: 'malai',    match_type: 'contains', priority: 10, color: '#FF69B4' },
  { category: 'Shopping',    keyword: 'sports',   match_type: 'contains', priority: 10, color: '#FF69B4' },
  { category: 'Shopping',    keyword: 'shuttle',  match_type: 'contains', priority: 10, color: '#FF69B4' },
  { category: 'Shopping',    keyword: 'gyftr',    match_type: 'contains', priority: 10, color: '#FF69B4' },
  // Utilities
  { category: 'Utilities',   keyword: 'billpay',     match_type: 'contains', priority: 10, color: '#DC143C' },
  { category: 'Utilities',   keyword: 'bill',        match_type: 'contains', priority: 10, color: '#DC143C' },
  { category: 'Utilities',   keyword: 'electricity', match_type: 'contains', priority: 10, color: '#DC143C' },
  { category: 'Utilities',   keyword: 'water',       match_type: 'contains', priority: 10, color: '#DC143C' },
  // Salary
  { category: 'Salary',      keyword: 'salary',  match_type: 'contains', priority: 10, color: '#228B22' },
  { category: 'Salary',      keyword: 'neft cr', match_type: 'contains', priority: 10, color: '#228B22' },
  { category: 'Salary',      keyword: 'rently',  match_type: 'contains', priority: 10, color: '#228B22' },
  // Transfers
  { category: 'Transfers',   keyword: 'upi',  match_type: 'contains', priority: 10, color: '#4169E1' },
  { category: 'Transfers',   keyword: 'neft', match_type: 'contains', priority: 10, color: '#4169E1' },
  { category: 'Transfers',   keyword: 'imps', match_type: 'contains', priority: 10, color: '#4169E1' },
  { category: 'Transfers',   keyword: 'ft-',  match_type: 'contains', priority: 10, color: '#4169E1' },
  // Entertainment
  { category: 'Entertainment', keyword: 'games', match_type: 'contains', priority: 10, color: '#FF1493' },
  { category: 'Entertainment', keyword: 'movie', match_type: 'contains', priority: 10, color: '#FF1493' },
  { category: 'Entertainment', keyword: 'show',  match_type: 'contains', priority: 10, color: '#FF1493' },
  // Personal
  { category: 'Personal',    keyword: 'loan', match_type: 'contains', priority: 10, color: '#696969' },
  { category: 'Personal',    keyword: 'emi',  match_type: 'contains', priority: 10, color: '#696969' },
];

const DEFAULT_TAG_RULES: TagDefault[] = [
  { tag_name: 'GROWW',    pattern: 'groww',    match_type: 'contains', priority: 10 },
  { tag_name: 'AUTOPAY',  pattern: 'autopay',  match_type: 'contains', priority: 10 },
  { tag_name: 'BILLPAY',  pattern: 'billpay',  match_type: 'contains', priority: 10 },
  { tag_name: 'SALARY',   pattern: 'salary',   match_type: 'contains', priority: 10 },
  { tag_name: 'SALARY',   pattern: 'rently',   match_type: 'contains', priority: 10 },
  { tag_name: 'NEFT',     pattern: 'neft cr',  match_type: 'contains', priority: 10 },
  { tag_name: 'NEFT',     pattern: 'neft',     match_type: 'contains', priority: 10 },
  { tag_name: 'COTHAS',   pattern: 'cothas',   match_type: 'contains', priority: 10 },
  { tag_name: 'APOLLO',   pattern: 'apollo',   match_type: 'contains', priority: 10 },
  { tag_name: 'SHOPPING', pattern: 'shopping', match_type: 'contains', priority: 10 },
  { tag_name: 'SPORTS',   pattern: 'shuttle',  match_type: 'contains', priority: 10 },
  { tag_name: 'GYFTR',    pattern: 'gyftr',    match_type: 'contains', priority: 10 },
  { tag_name: 'JEWELRY',  pattern: 'gold',     match_type: 'contains', priority: 10 },
];

export function seedDefaultsForUser(userId: string): void {
  const now = new Date().toISOString();

  // Check if user already has rules (idempotent)
  const existing = db
    .prepare('SELECT COUNT(*) as count FROM category_rules WHERE user_id = ?')
    .get(userId) as { count: number };
  if (existing.count > 0) return;

  const insertCategory = db.prepare(
    `INSERT INTO category_rules (user_id, category, keyword, match_type, priority, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertTag = db.prepare(
    `INSERT INTO tag_rules (user_id, tag_name, pattern, match_type, priority, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const seedAll = db.transaction(() => {
    for (const r of DEFAULT_CATEGORY_RULES) {
      insertCategory.run(userId, r.category, r.keyword, r.match_type, r.priority, r.color, now);
    }
    for (const r of DEFAULT_TAG_RULES) {
      insertTag.run(userId, r.tag_name, r.pattern, r.match_type, r.priority, now);
    }
  });

  seedAll();
}

export { DEFAULT_CATEGORY_RULES, DEFAULT_TAG_RULES };
