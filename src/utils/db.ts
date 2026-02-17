import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(process.cwd(), 'myledger.db'));

// Create transactions table
const createTransactions = `
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  description TEXT,
  category TEXT,
  amount REAL NOT NULL
);
`;

// Create budgets table
const createBudgets = `
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);
`;

db.exec(createTransactions);
db.exec(createBudgets);

export default db;
