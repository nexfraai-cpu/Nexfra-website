import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';
import { FinanceQueries } from './finance.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createSaleSchema, updateSaleSchema, saleIdSchema, saleListSchema,
  createPaymentSchema, updatePaymentSchema, paymentIdSchema, paymentListSchema,
  ledgerListSchema, transactionListSchema, auditLogListSchema,
} from './finance.validator.js';

const queries = new FinanceQueries();
const service = new FinanceService(queries);
const controller = new FinanceController(service);

export const financeRouter = Router();

financeRouter.use(auth);

// Sales (Invoices)
financeRouter.get('/sales', authorize('admin', 'finance', 'manager'), validate(saleListSchema), controller.listSales);

financeRouter.get('/sales/:id', authorize('admin', 'finance', 'manager'), validate(saleIdSchema), controller.getSaleById);

financeRouter.post('/sales', authorize('admin', 'finance'), validate(createSaleSchema), controller.createSale);

financeRouter.put('/sales/:id', authorize('admin', 'finance'), validate(updateSaleSchema), controller.updateSale);

financeRouter.delete('/sales/:id', authorize('admin'), validate(saleIdSchema), controller.deleteSale);

// Payments
financeRouter.get('/payments', authorize('admin', 'finance', 'manager'), validate(paymentListSchema), controller.listPayments);

financeRouter.get('/payments/:id', authorize('admin', 'finance', 'manager'), validate(paymentIdSchema), controller.getPaymentById);

financeRouter.post('/payments', authorize('admin', 'finance'), validate(createPaymentSchema), controller.createPayment);

financeRouter.put('/payments/:id', authorize('admin', 'finance'), validate(updatePaymentSchema), controller.updatePayment);

financeRouter.delete('/payments/:id', authorize('admin'), validate(paymentIdSchema), controller.deletePayment);

// Ledger
financeRouter.get('/ledger', authorize('admin', 'finance', 'manager'), validate(ledgerListSchema), controller.getLedger);

// Transactions
financeRouter.get('/transactions', authorize('admin', 'finance', 'manager'), validate(transactionListSchema), controller.getTransactions);

// Audit Logs
financeRouter.get('/audit-logs', authorize('admin', 'finance'), validate(auditLogListSchema), controller.getAuditLogs);

// Stats & Outstanding
financeRouter.get('/stats/monthly', authorize('admin', 'finance', 'manager'), controller.getMonthlyStats);

financeRouter.get('/stats/outstanding', authorize('admin', 'finance', 'manager'), controller.getOutstandingBalances);
