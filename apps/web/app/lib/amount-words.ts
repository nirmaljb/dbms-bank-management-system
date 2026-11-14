// Amount in words, Indian numbering (lakh, crore), as written on a cheque:
// 125000.5 -> "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only".

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n]!;
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ');
}

function wholeNumber(n: number): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor(n / 100_000) % 100;
  const thousand = Math.floor(n / 1000) % 100;
  const hundred = Math.floor(n / 100) % 10;
  const rest = n % 100;
  if (crore) parts.push(`${wholeNumber(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(belowHundred(rest));
  return parts.join(' ');
}

/** Empty string for a blank, zero or malformed amount. */
export function amountInWords(amount: string): string {
  if (!/^\d+(\.\d{0,2})?$/.test(amount)) return '';
  const [whole = '0', fraction = ''] = amount.split('.');
  const rupees = wholeNumber(Number(whole));
  const paise = belowHundred(Number(fraction.padEnd(2, '0')));
  if (!rupees && !paise) return '';
  if (!rupees) return `${paise} Paise Only`;
  return `Rupees ${rupees}${paise ? ` and ${paise} Paise` : ''} Only`;
}
