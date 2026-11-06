import type { Response, NextFunction, RequestHandler } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import type { IUserRepository } from '../db/user-repository.interface.js';
import { checkPin } from '../services/pin-service.js';

export const PIN_HEADER = 'x-transaction-pin';

/**
 * Guards a route that changes something: the request must carry the user's
 * PIN in the X-Transaction-Pin header. Without it the client gets 428
 * PIN_REQUIRED, asks the user for the PIN and sends the request again.
 * Runs after authenticate.
 */
export function createRequirePin(repo: IUserRepository): RequestHandler {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const pin = req.get(PIN_HEADER);
    if (!pin) {
      return res.status(428).json({ code: 'PIN_REQUIRED', error: 'Enter your PIN to continue' });
    }
    try {
      const result = await checkPin(repo, req.user.id, pin);
      if (!result.ok) {
        return res.status(result.status).json({ code: result.code, error: result.error });
      }
      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
