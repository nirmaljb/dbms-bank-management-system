import { Router } from 'express';
import { customerController as c } from '../controllers/customer-controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handle } from '../utils/db-errors.js';

export function createCustomerRoutes(): Router {
  const router = Router();
  router.use(authenticate, requireRole('customer'));

  router.get('/overview', handle(c.overview));
  router.post('/deposit', handle(c.deposit));
  router.post('/withdraw', handle(c.withdraw));
  router.get('/statement', handle(c.statement));

  router.get('/loans', handle(c.loans));
  router.post('/loans', handle(c.requestLoan));
  router.get('/loans/:id/dues', handle(c.loanDues));
  router.post('/loans/:id/pay-interest', handle(c.payInterest));
  router.post('/loans/:id/repay', handle(c.repayPrincipal));

  router.get('/credit-score', handle(c.creditScore));

  router.get('/notices', handle(c.notices));
  router.post('/notices/:id/read', handle(c.markNoticeRead));

  return router;
}
