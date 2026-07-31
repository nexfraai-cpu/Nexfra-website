import { Request, Response } from 'express';
import { PublicLeadsService } from './public-leads.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class PublicLeadsController {
  constructor(private publicLeadsService: PublicLeadsService) {}

  create = asyncWrap(async (req: Request, res: Response) => {
    const customer = await this.publicLeadsService.create(req.body);
    res.status(201).json({
      data: { id: customer.id, customerNumber: customer.customer_number },
    });
  });
}
