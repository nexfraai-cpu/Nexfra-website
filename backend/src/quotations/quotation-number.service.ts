/**
 * Helper to compute initials from customer name according to business rules:
 * 1. Remove punctuation & symbols (keep alphanumeric characters and whitespace).
 * 2. Trim whitespace and split into words.
 * 3. If >= 2 words: First letter of 1st word + First letter of 2nd word.
 * 4. If 1 word: First letter of word + 'X'.
 * 5. If 0 words: 'XX'.
 * Converts to UPPERCASE.
 */
export function getCustomerInitials(customerName: string): string {
  if (!customerName) return 'XX';
  const clean = customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const first = words[0][0];
    const second = words[1][0];
    return (first + second).toUpperCase();
  } else if (words.length === 1 && words[0].length > 0) {
    const first = words[0][0];
    return (first + 'X').toUpperCase();
  }
  return 'XX';
}

/**
 * Formats full quotation number: <INITIALS>/<YEAR>/<SEQUENCE>
 * Example: formatQuotationNumber('John Pork', 2026, 1) -> 'JP/2026/000001'
 */
export function formatQuotationNumber(customerName: string, year: number, sequenceNumber: number): string {
  const initials = getCustomerInitials(customerName);
  const paddedSeq = String(sequenceNumber).padStart(6, '0');
  return `${initials}/${year}/${paddedSeq}`;
}
