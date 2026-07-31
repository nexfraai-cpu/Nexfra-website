import { Request, Response } from 'express';
import { CustomersService } from './customers.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class CustomersController {
  constructor(private customersService: CustomersService) {}

  list = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.customersService.list(
      {
        search: req.query.search as string | undefined,
        company: req.query.company as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as string | undefined,
        page: Number(req.query.page) || 1,
        perPage: Number(req.query.perPage) || 20,
      },
      req.user!,
    );
    res.status(200).json(result);
  });

  getById = asyncWrap(async (req: Request, res: Response) => {
    const customer = await this.customersService.getById(req.params.id, req.user!);
    res.status(200).json({ data: customer });
  });

  create = asyncWrap(async (req: Request, res: Response) => {
    const customer = await this.customersService.create(req.body, req.user!);
    res.status(201).json({ data: customer });
  });

  update = asyncWrap(async (req: Request, res: Response) => {
    const customer = await this.customersService.update(req.params.id, req.body, req.user!);
    res.status(200).json({ data: customer });
  });

  delete = asyncWrap(async (req: Request, res: Response) => {
    await this.customersService.softDelete(req.params.id, req.user!);
    res.status(200).json({ data: { message: 'Customer deleted successfully' } });
  });
}
