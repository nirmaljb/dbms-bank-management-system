import crypto from 'node:crypto';

// Razorpay in test mode is the bank's "Add money" payment gateway: the
// customer pays with a test UPI ID or card, no real money moves. Live keys
// are refused so a misconfigured server can never take real payments.

const API = 'https://api.razorpay.com/v1';

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Test-mode keys from the environment, or null when online payments are off. */
export function razorpayKeys(): RazorpayKeys | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret || !keyId.startsWith('rzp_test_')) return null;
  return { keyId, keySecret };
}

/** "1500.5" -> 150050. The amount has already passed fn_assert_amount. */
export function toPaise(amount: string): number {
  const [whole = '0', fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

export async function createOrder(
  keys: RazorpayKeys,
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>
): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<RazorpayOrder> & {
    error?: { description?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(`Razorpay order failed (${res.status}): ${json.error?.description ?? 'no details'}`);
  }
  return { id: json.id, amount: json.amount ?? amountPaise, currency: json.currency ?? 'INR' };
}

/**
 * Checkout returns razorpay_signature = HMAC-SHA256(order_id + "|" + payment_id)
 * keyed with the key secret. Only the server knows the secret, so a valid
 * signature proves Razorpay accepted this payment for this order.
 */
export function isValidPaymentSignature(
  keySecret: string,
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
