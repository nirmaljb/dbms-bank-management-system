import { Router, type RequestHandler } from 'express';
import { customerController as c } from '../controllers/customer-controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handle } from '../utils/db-errors.js';

// Every action that changes something needs the PIN (requirePin). Reading
// pages and marking a notice as read do not.
export function createCustomerRoutes(requirePin: RequestHandler): Router {
  const router = Router();
  router.use(authenticate, requireRole('customer'));

  router.get('/overview', handle(c.overview));
  router.post('/deposit', requirePin, handle(c.deposit));
  router.post('/withdraw', requirePin, handle(c.withdraw));
  router.get('/payee', handle(c.lookupPayee));
  router.post('/transfer', requirePin, handle(c.transfer));
  router.get('/statement', handle(c.statement));

  router.get('/loans', handle(c.loans));
  router.post('/loans', requirePin, handle(c.requestLoan));
  router.get('/loans/:id/dues', handle(c.loanDues));
  router.post('/loans/:id/pay-interest', requirePin, handle(c.payInterest));
  router.post('/loans/:id/repay', requirePin, handle(c.repayPrincipal));

  router.get('/credit-score', handle(c.creditScore));

  router.get('/notices', handle(c.notices));
  router.post('/notices/:id/read', handle(c.markNoticeRead));

  return router;
}
