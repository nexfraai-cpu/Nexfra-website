import { Request, Response } from 'express';
import { ChassisService } from './chassis.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class ChassisController {
  constructor(private chassisService: ChassisService) {}

  list = asyncWrap(async (req: Request, res: Response) => {
    const records = await this.chassisService.list(req.user!, req.query.workOrderId as string | undefined, req.query.customerId as string | undefined);
    res.status(200).json({ data: records });
  });

  create = asyncWrap(async (req: Request, res: Response) => {
    const input = this.chassisService.createInput(req.body);
    const record = await this.chassisService.create(input, req.user!);
    res.status(201).json({ data: record });
  });

  update = asyncWrap(async (req: Request, res: Response) => {
    const input = this.chassisService.updateInput(req.body);
    const record = await this.chassisService.update(req.params.id, input, req.user!);
    res.status(200).json({ data: record });
  });

  remove = asyncWrap(async (req: Request, res: Response) => {
    await this.chassisService.remove(req.params.id, req.user!);
    res.status(200).json({ data: { ok: true } });
  });
}