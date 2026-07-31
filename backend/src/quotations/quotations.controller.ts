import { Request, Response } from 'express';
import { QuotationsService } from './quotations.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class QuotationsController {
  constructor(private quotationsService: QuotationsService) {}

  list = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.quotationsService.list(
      {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        customerName: req.query.customerName as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        page: Number(req.query.page) || 1,
        perPage: Number(req.query.perPage) || 20,
      },
      req.user!,
    );
    res.status(200).json(result);
  });

  getById = asyncWrap(async (req: Request, res: Response) => {
    const quotation = await this.quotationsService.getById(req.params.id, req.user!);
    res.status(200).json({ data: quotation });
  });

  create = asyncWrap(async (req: Request, res: Response) => {
    const quotation = await this.quotationsService.create(req.body, req.user!);
    res.status(201).json({ data: quotation });
  });

  update = asyncWrap(async (req: Request, res: Response) => {
    const quotation = await this.quotationsService.update(req.params.id, req.body, req.user!);
    res.status(200).json({ data: quotation });
  });

  delete = asyncWrap(async (req: Request, res: Response) => {
    await this.quotationsService.softDelete(req.params.id, req.user!);
    res.status(200).json({ data: { message: 'Quotation deleted successfully' } });
  });

  submit = asyncWrap(async (req: Request, res: Response) => {
    const quotation = await this.quotationsService.submit(req.params.id, req.user!);
    res.status(200).json({ data: quotation });
  });

  approve = asyncWrap(async (req: Request, res: Response) => {
    const quotation = await this.quotationsService.approve(req.params.id, req.body.comment, req.user!);
    res.status(200).json({ data: quotation });
  });

  deny = asyncWrap(async (req: Request, res: Response) => {
    const quotation = await this.quotationsService.deny(req.params.id, req.body.reason, req.user!);
    res.status(200).json({ data: quotation });
  });
}
