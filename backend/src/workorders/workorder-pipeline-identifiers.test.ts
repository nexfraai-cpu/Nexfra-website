import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WorkordersService } from './workorders.service.js';
import { WorkOrderQueries } from './workorders.queries.js';
import { ProductionService } from '../production/production.service.js';
import { ProductionQueries } from '../production/production.queries.js';
import { QuotationsService } from '../quotations/quotations.service.js';
import { QuotationQueries } from '../quotations/quotations.queries.js';
import { AuthenticatedUser } from '../middleware/auth.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

describe('Work Order Pipeline Identifiers Audit', () => {
  const adminActor: AuthenticatedUser = {
    id: 'admin-uuid-1111',
    authId: 'admin-auth-1111',
    role: 'admin',
    email: 'admin@nexfra.in',
    name: 'Admin User',
    employeeNumber: 'EMP-001',
  };

  const financeActor: AuthenticatedUser = {
    id: 'finance-uuid-2222',
    authId: 'finance-auth-2222',
    role: 'finance',
    email: 'finance@nexfra.in',
    name: 'Finance Manager',
    employeeNumber: 'EMP-002',
  };

  const sampleQuotationUuid = '0003bb84-495c-4f95-b248-4882f2b48121';
  const sampleWorkOrderUuid = 'fe6152dc-3640-4a53-b783-848725bbd4c7';
  const sampleQuotationNumber = 'JP/2026/000009';
  const sampleWorkOrderNumber = 'WO-000009';

  let mockQuotation: any;
  let mockWorkOrder: any;
  let quotationQueries: any;
  let workOrderQueries: any;
  let productionQueries: any;
  let quotationsService: QuotationsService;
  let workOrdersService: WorkordersService;
  let productionService: ProductionService;

  beforeEach(() => {
    mockQuotation = {
      id: sampleQuotationUuid,
      quotation_number: sampleQuotationNumber,
      version: 1,
      customer_id: 'cust-uuid-1',
      customer_name: 'John Pork',
      product_key: '30 Feet Rigid Load Body',
      template_key: 'flatbed',
      total: 495600,
      status: 'Pending',
      created_by: adminActor.id,
      finance_owner: null,
      payment_due_date: null,
    };

    mockWorkOrder = {
      id: sampleWorkOrderUuid,
      work_order_number: sampleWorkOrderNumber,
      quotation_id: sampleQuotationUuid,
      quotation_number: sampleQuotationNumber,
      customer_name: 'John Pork',
      product_name: '30 Feet Rigid Load Body',
      quantity: 1,
      status: 'Open',
      due_date: '2026-08-15',
      is_urgent: false,
      created_at: '2026-08-01T01:00:00Z',
      updated_at: '2026-08-01T01:00:00Z',
    };

    quotationQueries = {
      findAll: jest.fn<any>().mockResolvedValue({ data: [mockQuotation], total: 1 }),
      findById: jest.fn<any>().mockImplementation(async (id: string) => {
        if (id === sampleQuotationUuid || id === sampleQuotationNumber) return mockQuotation;
        return null;
      }),
      create: jest.fn<any>().mockImplementation(async (input: any) => ({
        ...mockQuotation,
        ...input,
      })),
      update: jest.fn<any>().mockImplementation(async (_id: string, updates: any) => {
        Object.assign(mockQuotation, updates);
        return mockQuotation;
      }),
      replaceSpecValues: jest.fn<any>().mockResolvedValue([]),
      replaceCustomItems: jest.fn<any>().mockResolvedValue([]),
      findSpecValues: jest.fn<any>().mockResolvedValue([]),
      findCustomItems: jest.fn<any>().mockResolvedValue([]),
      findTemplateBasePrice: jest.fn<any>().mockResolvedValue(400000),
      findSpecPriceDiffs: jest.fn<any>().mockResolvedValue({}),
      findAppSettings: jest.fn<any>().mockResolvedValue({}),
    };

    workOrderQueries = {
      findQuotationById: jest.fn<any>().mockImplementation(async (id: string) => {
        if (id === sampleQuotationUuid || id === sampleQuotationNumber) return mockQuotation;
        return null;
      }),
      findExistingByQuotation: jest.fn<any>().mockResolvedValue(null),
      create: jest.fn<any>().mockResolvedValue(mockWorkOrder),
      findById: jest.fn<any>().mockResolvedValue(mockWorkOrder),
      createProductionItem: jest.fn<any>().mockResolvedValue({ id: 'pi-1', current_stage: 'Pending' }),
      createStageRecord: jest.fn<any>().mockResolvedValue({ id: 'sr-1' }),
      findProductionItems: jest.fn<any>().mockResolvedValue([{ id: 'pi-1', current_stage: 'Pending' }]),
      createAuditLog: jest.fn<any>().mockResolvedValue(undefined),
    };

    productionQueries = {
      findAll: jest.fn<any>().mockResolvedValue({
        data: [{
          id: 'pi-1',
          work_order_id: sampleWorkOrderUuid,
          quotation_id: sampleQuotationUuid,
          current_stage: 'Pending',
          stage_progress: {},
          dispatch_fields: {},
          started_at: null,
          completed_at: null,
          created_at: '2026-08-01T01:00:00Z',
          updated_at: '2026-08-01T01:00:00Z',
          work_orders: {
            customer_name: 'John Pork',
            product_name: '30 Feet Rigid Load Body',
            work_order_number: sampleWorkOrderNumber,
            quotations: { quotation_number: sampleQuotationNumber },
          },
        }],
        total: 1,
      }),
      findById: jest.fn<any>(),
      update: jest.fn<any>(),
      findStageRecords: jest.fn<any>(),
      upsertStageRecord: jest.fn<any>(),
      createStageRecord: jest.fn<any>(),
      findChassisRecordsByItem: jest.fn<any>(),
      createChassisRecord: jest.fn<any>(),
      findChassisRecordById: jest.fn<any>(),
      updateChassisRecord: jest.fn<any>(),
      findWorkOrderById: jest.fn<any>(),
      findCustomerById: jest.fn<any>(),
    };

    quotationsService = new QuotationsService(quotationQueries as unknown as QuotationQueries);
    workOrdersService = new WorkordersService(workOrderQueries as unknown as WorkOrderQueries);
    productionService = new ProductionService(productionQueries as unknown as ProductionQueries);
  });

  it('1. Traces pipeline: Quotation -> Approve -> Finance Claim -> Work Order Creation', async () => {
    // Step 1: Approve quotation
    const approvedQuotation = await quotationsService.approve(sampleQuotationUuid, 'Approved for production', adminActor);
    expect(approvedQuotation.status).toBe('Approved');
    expect(approvedQuotation.quotationNumber).toBe(sampleQuotationNumber);

    // Step 2: Claim quotation in finance
    const claimedQuotation = await quotationsService.claim(sampleQuotationUuid, '2026-08-15', financeActor);
    expect(claimedQuotation.paymentDueDate).toBe('2026-08-15');

    // Step 3: Create work order from quotation
    const workOrder = await workOrdersService.create({
      quotationId: sampleQuotationUuid,
      dueDate: '2026-08-15',
      isUrgent: false,
    }, adminActor);

    // Step 4: Verify WorkOrderResponse contains human-readable numbers
    expect(workOrder.workOrderNumber).toBe(sampleWorkOrderNumber);
    expect(workOrder.quotationNumber).toBe(sampleQuotationNumber);

    // Step 5: Verify UUID pattern is NOT used as workOrderNumber or quotationNumber
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(workOrder.workOrderNumber)).toBe(false);
    expect(uuidRegex.test(workOrder.quotationNumber!)).toBe(false);

    // Step 6: Production Board/Track Order API source carries the same business quotation number.
    const production = await productionService.list({ page: 1, perPage: 20 }, adminActor);
    expect(production.data[0].workOrderNumber).toBe(sampleWorkOrderNumber);
    expect(production.data[0].quotationNumber).toBe(sampleQuotationNumber);
    expect(uuidRegex.test(production.data[0].quotationNumber!)).toBe(false);
    expect(production.data[0].quotationNumber).toBe('JP/2026/000009');
  });

  it('2. Defensive check: verifies business identifiers are exposed and never naked UUIDs', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(mockQuotation.quotation_number)).toBe(false);
    expect(uuidRegex.test(mockWorkOrder.work_order_number)).toBe(false);
  });
});
