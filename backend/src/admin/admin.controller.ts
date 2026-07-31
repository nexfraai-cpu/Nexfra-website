import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';

const adminService = new AdminService();

export class AdminController {
  async resetDevData(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Reset test data feature is strictly disabled in production environment.',
        },
      });
      return;
    }

    try {
      const user = (req as any).user;
      const result = await adminService.resetDevData(user);
      res.status(200).json({ data: result });
    } catch (err: any) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to reset test data.',
        },
      });
    }
  }
}
