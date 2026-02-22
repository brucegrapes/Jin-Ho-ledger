import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(process.cwd(), 'myledger.db'));

const createUsers = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  encryption_key TEXT NOT NULL
);
`;

const createTransactions = `
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  description TEXT,
  category TEXT,
  type TEXT,
  tags TEXT,
  amount REAL NOT NULL,
  reference_number TEXT UNIQUE,
  user_id TEXT
);
`;

const createBudgets = `
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  user_id TEXT
);
`;

const createSessions = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const createWebauthnCredentials = `
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL,
  device_type TEXT,
  transports TEXT,
  backed_up INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const createWebauthnChallenges = `
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  username TEXT PRIMARY KEY,
  user_id TEXT,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

const createAuditLogs = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
`;

const createCategoryRules = `
CREATE TABLE IF NOT EXISTS category_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains',
  priority INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const createTagRules = `
CREATE TABLE IF NOT EXISTS tag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

db.exec(createUsers);
db.exec(createTransactions);
db.exec(createBudgets);
db.exec(createSessions);
db.exec(createWebauthnCredentials);
db.exec(createWebauthnChallenges);
db.exec(createAuditLogs);
db.exec(createCategoryRules);
db.exec(createTagRules);

function safeAddColumn(statement: string) {
  try {
    db.exec(statement);
  } catch (error) {
    if (error instanceof Error && /duplicate column name/i.test(error.message)) {
      return;
    }
    throw error;
  }
}

safeAddColumn('ALTER TABLE transactions ADD COLUMN user_id TEXT');
safeAddColumn('ALTER TABLE budgets ADD COLUMN user_id TEXT');

export default db;
