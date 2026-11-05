import { describe, it, expect } from 'vitest';
import { mapDbError } from '../utils/db-errors.js';

describe('mapDbError', () => {
  it('passes RAISE EXCEPTION messages through as 400', () => {
    expect(mapDbError({ code: 'P0001', message: 'Your account is frozen.' })).toEqual({
      status: 400,
      message: 'Your account is frozen.',
    });
  });

  it('maps no_data_found to 404 and insufficient_privilege to 403', () => {
    expect(mapDbError({ code: 'P0002', message: 'Loan not found' }).status).toBe(404);
    expect(mapDbError({ code: '42501', message: 'Only bank administrators' }).status).toBe(403);
  });

  it('names known constraints instead of leaking SQL', () => {
    expect(
      mapDbError({ code: '23514', constraint: 'accounts_balance_non_negative', message: 'raw' })
    ).toEqual({ status: 400, message: 'Insufficient balance' });
    expect(
      mapDbError({ code: '23505', constraint: 'loans_one_open_per_user', message: 'raw' })
    ).toEqual({ status: 409, message: 'You already have a pending or active loan' });
  });

  it('hides unexpected errors behind a 500', () => {
    expect(mapDbError(new Error('connection refused'))).toEqual({
      status: 500,
      message: 'Internal server error',
    });
  });
});
