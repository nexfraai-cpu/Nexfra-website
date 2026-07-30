import { Request, Response } from 'express';
import { FinanceService } from './finance.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class FinanceController {
  constructor(private financeService: FinanceService) {}

  /*** Sales ***/
  listSales = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.financeService.listSales({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!.id);
    res.status(200).json(result);
  });

  getSaleById = asyncWrap(async (req: Request, res: Response) => {
    const sale = await this.financeService.getSaleById(req.params.id, req.user!.id);
    res.status(200).json({ data: sale });
  });

  createSale = asyncWrap(async (req: Request, res: Response) => {
    const sale = await this.financeService.createSale(req.body, req.user!.id);
    res.status(201).json({ data: sale });
  });

  updateSale = asyncWrap(async (req: Request, res: Response) => {
    const sale = await this.financeService.updateSale(req.params.id, req.body, req.user!.id);
    res.status(200).json({ data: sale });
  });

  deleteSale = asyncWrap(async (req: Request, res: Response) => {
    await this.financeService.softDeleteSale(req.params.id, req.user!.id);
    res.status(200).json({ data: { message: 'Sale deleted successfully' } });
  });

  /*** Payments ***/
  listPayments = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.financeService.listPayments({
      saleId: req.query.saleId as string | undefined,
      mode: req.query.mode as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!.id);
    res.status(200).json(result);
  });

  getPaymentById = asyncWrap(async (req: Request, res: Response) => {
    const payment = await this.financeService.getPaymentById(req.params.id, req.user!.id);
    res.status(200).json({ data: payment });
  });

  createPayment = asyncWrap(async (req: Request, res: Response) => {
    const payment = await this.financeService.createPayment(req.body, req.user!.id);
    res.status(201).json({ data: payment });
  });

  updatePayment = asyncWrap(async (req: Request, res: Response) => {
    const payment = await this.financeService.updatePayment(req.params.id, req.body, req.user!.id);
    res.status(200).json({ data: payment });
  });

  deletePayment = asyncWrap(async (req: Request, res: Response) => {
    await this.financeService.softDeletePayment(req.params.id, req.user!.id);
    res.status(200).json({ data: { message: 'Payment deleted successfully' } });
  });

  /*** Ledger & Transactions ***/
  getLedger = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.financeService.getLedger({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      customerName: req.query.customerName as string | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!.id);
    res.status(200).json(result);
  });

  getTransactions = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.financeService.getTransactions({
      type: req.query.type as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      customerName: req.query.customerName as string | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!.id);
    res.status(200).json(result);
  });

  /*** Audit Logs ***/
  getAuditLogs = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.financeService.getAuditLogs({
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      action: req.query.action as string | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!.id);
    res.status(200).json(result);
  });

  /*** Stats ***/
  getMonthlyStats = asyncWrap(async (_req: Request, res: Response) => {
    const stats = await this.financeService.getMonthlyStats(_req.user!.id);
    res.status(200).json({ data: stats });
  });

  getOutstandingBalances = asyncWrap(async (_req: Request, res: Response) => {
    const balances = await this.financeService.getOutstandingBalances(_req.user!.id);
    res.status(200).json({ data: balances });
  });
}
