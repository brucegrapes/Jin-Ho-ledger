/**
 * Utility functions for date parsing and formatting
 */

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
