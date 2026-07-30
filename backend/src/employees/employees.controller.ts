import { Request, Response } from 'express';
import { EmployeesService } from './employees.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  list = asyncWrap(async (req: Request, res: Response) => {
    const employees = await this.employeesService.list(
      {
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        includeDisabled: req.query.includeDisabled === 'true',
      },
      req.user!.id,
    );
    res.status(200).json({ data: employees });
  });

  getById = asyncWrap(async (req: Request, res: Response) => {
    const employee = await this.employeesService.getById(req.params.id, req.user!.id);
    res.status(200).json({ data: employee });
  });

  create = asyncWrap(async (req: Request, res: Response) => {
    const employee = await this.employeesService.create(req.body, req.user!.id);
    res.status(201).json({ data: employee });
  });

  update = asyncWrap(async (req: Request, res: Response) => {
    const employee = await this.employeesService.update(req.params.id, req.body, req.user!.id);
    res.status(200).json({ data: employee });
  });

  delete = asyncWrap(async (req: Request, res: Response) => {
    await this.employeesService.softDelete(req.params.id, req.user!.id);
    res.status(200).json({ data: { message: 'Employee deleted successfully' } });
  });

  toggleStatus = asyncWrap(async (req: Request, res: Response) => {
    const employee = await this.employeesService.toggleStatus(req.params.id, req.user!.id);
    res.status(200).json({ data: employee });
  });

  resetPassword = asyncWrap(async (req: Request, res: Response) => {
    await this.employeesService.resetPassword(req.params.id, req.body.password, req.user!.id);
    res.status(200).json({ data: { message: 'Password reset successfully' } });
  });
}
