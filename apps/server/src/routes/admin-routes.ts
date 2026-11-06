import { Router } from 'express';
import { adminController as a } from '../controllers/admin-controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handle } from '../utils/db-errors.js';

export function createAdminRoutes(): Router {
  const router = Router();
  router.use(authenticate, requireRole('admin'));

  router.get('/overview', handle(a.overview));

  router.get('/branches', handle(a.branches));

  router.get('/applications', handle(a.applications));
  router.post('/applications/:id/approve', handle(a.approveAccount));
  router.post('/applications/:id/reject', handle(a.rejectAccount));

  router.get('/customers', handle(a.customers));
  router.post('/accounts/:id/status', handle(a.setAccountStatus));

  router.get('/transactions', handle(a.transactions));
  router.post('/transactions/:id/approve', handle(a.approveWithdrawal));
  router.post('/transactions/:id/reject', handle(a.rejectWithdrawal));
  router.post('/transactions/:id/reverse', handle(a.reverseTransaction));

  router.get('/loans', handle(a.loans));
  router.post('/loans/:id/sanction', handle(a.sanctionLoan));
  router.post('/loans/:id/reject', handle(a.rejectLoan));
  router.post('/monthly-cycle', handle(a.runMonthlyCycle));

  router.get('/notices', handle(a.notices));
  router.post('/notices', handle(a.sendNotice));

  return router;
}
