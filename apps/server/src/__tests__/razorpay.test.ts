import crypto from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { isValidPaymentSignature, razorpayKeys, toPaise } from '../services/razorpay.js';

describe('razorpay', () => {
  const secret = 'test_secret';
  const sign = (orderId: string, paymentId: string) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it('accepts the signature Checkout returns for the order and payment', () => {
    expect(isValidPaymentSignature(secret, 'order_A', 'pay_B', sign('order_A', 'pay_B'))).toBe(true);
  });

  it('rejects a signature for another payment, a tampered one or a short one', () => {
    expect(isValidPaymentSignature(secret, 'order_A', 'pay_C', sign('order_A', 'pay_B'))).toBe(false);
    expect(isValidPaymentSignature('other', 'order_A', 'pay_B', sign('order_A', 'pay_B'))).toBe(false);
    expect(isValidPaymentSignature(secret, 'order_A', 'pay_B', 'abcd')).toBe(false);
  });

  it('converts rupees to paise without float error', () => {
    expect(toPaise('1500')).toBe(150000);
    expect(toPaise('1500.5')).toBe(150050);
    expect(toPaise('0.29')).toBe(29);
    expect(toPaise('100000.00')).toBe(10000000);
  });

  it('only enables test-mode keys', () => {
    expect(razorpayKeys()).toBeNull();
    process.env.RAZORPAY_KEY_ID = 'rzp_live_abc';
    process.env.RAZORPAY_KEY_SECRET = 's';
    expect(razorpayKeys()).toBeNull();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_abc';
    expect(razorpayKeys()).toEqual({ keyId: 'rzp_test_abc', keySecret: 's' });
  });
});
