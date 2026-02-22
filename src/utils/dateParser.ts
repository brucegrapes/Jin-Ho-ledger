/**
 * Utility functions for date parsing and formatting
 */

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse date string in DD/MM/YY format to Date object
 * Example: "31/01/26" -> Date(2026-01-31)
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date(0);
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  let year = parseInt(parts[2], 10);
  
  // Handle 2-digit year: assume 2000s (26 = 2026)
  if (year < 100) {
    year += 2000;
  }
  
  return new Date(year, month, day);
}

/**
 * Parse date string in "DD Mon YYYY" format (Indian Bank format)
 * Example: "03 Mar 2025" -> Date(2025-03-03)
 */
export function parseDateLong(dateStr: string): Date {
  if (!dateStr) return new Date(0);

  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 3) return new Date(0);

  const day = parseInt(parts[0], 10);
  const month = MONTH_MAP[parts[1].toLowerCase()];
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || month === undefined || isNaN(year)) return new Date(0);

  return new Date(year, month, day);
}

/**
 * Parse date string in "DD-MMM-YY" format (IOB format)
 * Example: "18-Feb-26" -> Date(2026-02-18)
 */
export function parseDateIOB(dateStr: string): Date {
  if (!dateStr) return new Date(0);

  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return new Date(0);

  const day = parseInt(parts[0], 10);
  const month = MONTH_MAP[parts[1].toLowerCase()];
  let year = parseInt(parts[2], 10);

  // Handle 2-digit year: assume 2000s (26 = 2026)
  if (year < 100) {
    year += 2000;
  }

  if (isNaN(day) || month === undefined || isNaN(year)) return new Date(0);

  return new Date(year, month, day);
}

/**
 * Convert DD/MM/YY format to ISO format (YYYY-MM-DD)
 * Example: "31/01/26" -> "2026-01-31"
 */
export function toISODate(dateStr: string): string {
  const date = parseDate(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert "DD Mon YYYY" format to ISO format (YYYY-MM-DD)
 * Example: "03 Mar 2025" -> "2025-03-03"
 */
export function toISODateLong(dateStr: string): string {
  const date = parseDateLong(dateStr);
  if (date.getTime() === 0) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert "DD-MMM-YY" format to ISO format (YYYY-MM-DD)
 * Example: "18-Feb-26" -> "2026-02-18"
 */
export function toISODateIOB(dateStr: string): string {
  const date = parseDateIOB(dateStr);
  if (date.getTime() === 0) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compare two transaction dates for sorting
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareDates(dateA: string, dateB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  return a.getTime() - b.getTime();
}

/**
 * Format date string from DD/MM/YY to more readable format
 * Example: "31/01/26" -> "31 Jan 2026"
 */
export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('en-IN', options);
}
