import { Request, Response } from 'express';
import { WorkordersService } from './workorders.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class WorkordersController {
  constructor(private workordersService: WorkordersService) {}

  list = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.workordersService.list({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      urgent: req.query.urgent === 'true' ? true : req.query.urgent === 'false' ? false : undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!.id);
    res.status(200).json(result);
  });

  getById = asyncWrap(async (req: Request, res: Response) => {
    const wo = await this.workordersService.getById(req.params.id, req.user!.id);
    res.status(200).json({ data: wo });
  });

  create = asyncWrap(async (req: Request, res: Response) => {
    const wo = await this.workordersService.create(req.body, req.user!.id);
    res.status(201).json({ data: wo });
  });

  update = asyncWrap(async (req: Request, res: Response) => {
    const wo = await this.workordersService.update(req.params.id, req.body, req.user!.id);
    res.status(200).json({ data: wo });
  });

  delete = asyncWrap(async (req: Request, res: Response) => {
    await this.workordersService.softDelete(req.params.id, req.user!.id);
    res.status(200).json({ data: { message: 'Work order deleted successfully' } });
  });

  setDueDate = asyncWrap(async (req: Request, res: Response) => {
    const wo = await this.workordersService.setDueDate(req.params.id, req.body.dueDate, req.user!.id);
    res.status(200).json({ data: wo });
  });

  toggleUrgent = asyncWrap(async (req: Request, res: Response) => {
    const wo = await this.workordersService.toggleUrgent(req.params.id, req.user!.id);
    res.status(200).json({ data: wo });
  });
}
