import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface HttpError {
  status: number;
  message: string;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  accounts_balance_non_negative: 'Insufficient balance',
  loans_one_open_per_user: 'You already have a pending or active loan',
  users_email_key: 'Email already registered',
};

/**
 * Turns a Postgres error raised by our procedures, triggers or constraints
 * into an HTTP status and a message that is safe to show the user.
 */
export function mapDbError(err: unknown): HttpError {
  const e = err as { code?: string; message?: string; constraint?: string };
  const known = e.constraint ? CONSTRAINT_MESSAGES[e.constraint] : undefined;

  switch (e.code) {
    case 'P0001': // RAISE EXCEPTION in a procedure or trigger
      return { status: 400, message: e.message || 'Request rejected' };
    case 'P0002': // no_data_found
      return { status: 404, message: e.message || 'Not found' };
    case '42501': // insufficient_privilege
      return { status: 403, message: e.message || 'Forbidden' };
    case '23514': // check_violation
      return { status: 400, message: known || 'Request violates a database rule' };
    case '23505': // unique_violation
      return { status: 409, message: known || 'Duplicate record' };
    case '22P02': // invalid_text_representation (bad uuid / number)
      return { status: 400, message: 'Invalid input' };
    case '22003': // numeric_value_out_of_range
      return { status: 400, message: 'Amount is too large' };
    default:
      return { status: 500, message: 'Internal server error' };
  }
}

/** Wraps an async handler so database errors become JSON error responses. */
export function handle(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, _next: NextFunction) => {
    fn(req, res).catch((err) => {
      const { status, message } = mapDbError(err);
      if (status === 500) {
        console.error(err);
      }
      if (!res.headersSent) {
        res.status(status).json({ error: message });
      }
    });
  };
}
