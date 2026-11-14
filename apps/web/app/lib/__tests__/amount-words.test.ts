import { describe, it, expect } from 'vitest';
import { amountInWords } from '../amount-words';

describe('amountInWords', () => {
  it('writes rupees in the Indian system', () => {
    expect(amountInWords('5000')).toBe('Rupees Five Thousand Only');
    expect(amountInWords('125000')).toBe('Rupees One Lakh Twenty Five Thousand Only');
    expect(amountInWords('10000000')).toBe('Rupees One Crore Only');
    expect(amountInWords('999')).toBe('Rupees Nine Hundred Ninety Nine Only');
  });

  it('adds paise', () => {
    expect(amountInWords('1500.5')).toBe('Rupees One Thousand Five Hundred and Fifty Paise Only');
    expect(amountInWords('0.05')).toBe('Five Paise Only');
  });

  it('is empty for blank, zero or malformed input', () => {
    expect(amountInWords('')).toBe('');
    expect(amountInWords('0')).toBe('');
    expect(amountInWords('1.234')).toBe('');
  });
});
