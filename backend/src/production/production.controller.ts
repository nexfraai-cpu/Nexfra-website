import { Request, Response } from 'express';
import { ProductionService } from './production.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class ProductionController {
  constructor(private productionService: ProductionService) {}

  list = asyncWrap(async (req: Request, res: Response) => {
    const result = await this.productionService.list({
      stage: req.query.stage as string | undefined,
      workOrderId: req.query.workOrderId as string | undefined,
      search: req.query.search as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      page: Number(req.query.page) || 1,
      perPage: Number(req.query.perPage) || 20,
    }, req.user!);
    res.status(200).json(result);
  });

  getById = asyncWrap(async (req: Request, res: Response) => {
    const item = await this.productionService.getById(req.params.id, req.user!);
    res.status(200).json({ data: item });
  });

  update = asyncWrap(async (req: Request, res: Response) => {
    const item = await this.productionService.update(req.params.id, req.body, req.user!);
    res.status(200).json({ data: item });
  });

  create = asyncWrap(async (req: Request, res: Response) => {
    const item = await this.productionService.createItem(req.body, req.user!);
    res.status(201).json({ data: item });
  });

  advanceStage = asyncWrap(async (req: Request, res: Response) => {
    const item = await this.productionService.advanceStage(req.params.id, req.body, req.user!);
    res.status(200).json({ data: item });
  });

  getChassisRecords = asyncWrap(async (req: Request, res: Response) => {
    const records = await this.productionService.getChassisRecords(req.params.id, req.user!);
    res.status(200).json({ data: records });
  });

  addChassis = asyncWrap(async (req: Request, res: Response) => {
    const record = await this.productionService.addChassis(req.params.id, req.body, req.user!);
    res.status(201).json({ data: record });
  });

  updateChassis = asyncWrap(async (req: Request, res: Response) => {
    const record = await this.productionService.updateChassis(req.params.id, req.params.chassisId, req.body, req.user!);
    res.status(200).json({ data: record });
  });
}
