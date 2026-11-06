import { Router, type RequestHandler } from 'express';
import { adminController as a } from '../controllers/admin-controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handle } from '../utils/db-errors.js';

// Every POST is an action and needs the admin's PIN (requirePin).
export function createAdminRoutes(requirePin: RequestHandler): Router {
  const router = Router();
  router.use(authenticate, requireRole('admin'));

  router.get('/overview', handle(a.overview));

  router.get('/branches', handle(a.branches));

  router.get('/applications', handle(a.applications));
  router.post('/applications/:id/approve', requirePin, handle(a.approveAccount));
  router.post('/applications/:id/reject', requirePin, handle(a.rejectAccount));

  router.get('/customers', handle(a.customers));
  router.post('/accounts/:id/status', requirePin, handle(a.setAccountStatus));
  router.post('/customers/:userId/reset-pin', requirePin, handle(a.resetCustomerPin));

  router.get('/transactions', handle(a.transactions));
  router.post('/transactions/:id/approve', requirePin, handle(a.approveWithdrawal));
  router.post('/transactions/:id/reject', requirePin, handle(a.rejectWithdrawal));
  router.post('/transactions/:id/reverse', requirePin, handle(a.reverseTransaction));

  router.get('/loans', handle(a.loans));
  router.post('/loans/:id/sanction', requirePin, handle(a.sanctionLoan));
  router.post('/loans/:id/reject', requirePin, handle(a.rejectLoan));
  router.post('/monthly-cycle', requirePin, handle(a.runMonthlyCycle));

  router.get('/notices', handle(a.notices));
  router.post('/notices', requirePin, handle(a.sendNotice));

  return router;
}
