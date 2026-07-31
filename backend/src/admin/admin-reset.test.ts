import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AuthenticatedUser } from '../middleware/auth.js';

jest.mock('../database/client', () => {
  const deletedTables: string[] = [];
  return {
    supabase: {
      from: jest.fn((table: string) => ({
        delete: jest.fn(() => ({
          neq: jest.fn(async () => {
            deletedTables.push(table);
            return { error: null };
          }),
        })),
      })),
      rpc: jest.fn(async () => ({ error: null })),
    },
    __getDeletedTables: () => deletedTables,
  };
});

describe('Admin Development Reset Test Data Feature', () => {
  let adminService: AdminService;
  let adminController: AdminController;

  const adminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    authId: 'admin-auth-1',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Admin User',
    employeeNumber: 'EMP-001',
  };

  beforeEach(() => {
    adminService = new AdminService();
    adminController = new AdminController();
    process.env.NODE_ENV = 'development';
  });

  it('1. Blocks execution when NODE_ENV=production with HTTP 403', async () => {
    process.env.NODE_ENV = 'production';

    const req: any = { user: adminUser };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await adminController.resetDevData(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining('production environment'),
        }),
      }),
    );
  });

  it('2. Service throws error if called in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(adminService.resetDevData(adminUser)).rejects.toThrow('production environment');
  });

  it('3. Deletes transactional data in correct dependency order in development', async () => {
    const result = await adminService.resetDevData(adminUser);

    expect(result.message).toContain('reset successfully');

    const { __getDeletedTables } = require('../database/client');
    const deleted = __getDeletedTables();

    // Verify transactional tables were deleted
    expect(deleted).toContain('production_stage_records');
    expect(deleted).toContain('chassis_records');
    expect(deleted).toContain('production_items');
    expect(deleted).toContain('work_orders');
    expect(deleted).toContain('payments');
    expect(deleted).toContain('sales');
    expect(deleted).toContain('quotation_spec_values');
    expect(deleted).toContain('quotation_custom_items');
    expect(deleted).toContain('quotations');
    expect(deleted).toContain('customers');
    expect(deleted).toContain('quotation_yearly_sequences');

    // Verify non-transactional system tables were NOT deleted
    expect(deleted).not.toContain('employees');
    expect(deleted).not.toContain('products');
    expect(deleted).not.toContain('product_templates');
    expect(deleted).not.toContain('app_settings');
  });
});
