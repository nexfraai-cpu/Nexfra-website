import { z } from 'zod';

export const productionItemIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const advanceStageSchema = z.object({
  body: z.object({
    stageKey: z.string().min(1).optional(),
    remark: z.string().max(500).nullable().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const createProductionItemSchema = z.object({
  body: z.object({
    workOrderId: z.string().uuid('Invalid work order ID format'),
  }),
});

export const updateProductionItemSchema = z.object({
  body: z.object({
    dispatchFields: z.record(z.unknown()).optional(),
    productionStages: z.array(z.object({
      stageKey: z.string().min(1).max(200),
      stageName: z.string().max(200).optional(),
      isCompleted: z.boolean(),
      remark: z.string().max(500).nullable().optional(),
    })).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const createChassisSchema = z.object({
  body: z.object({
    field: z.string().max(100).nullable().optional(),
    brand: z.string().max(100).nullable().optional(),
    model: z.string().max(100).nullable().optional(),
    chassisNumber: z.string().max(100).nullable().optional(),
    arrivalDate: z.string().nullable().optional(),
    customerName: z.string().max(200).nullable().optional(),
    productName: z.string().max(200).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const updateChassisSchema = z.object({
  body: z.object({
    field: z.string().max(100).nullable().optional(),
    brand: z.string().max(100).nullable().optional(),
    model: z.string().max(100).nullable().optional(),
    chassisNumber: z.string().max(100).nullable().optional(),
    arrivalDate: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
    chassisId: z.string().uuid(),
  }),
});

export const chassisIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    chassisId: z.string().uuid(),
  }),
});

export const productionListSchema = z.object({
  query: z.object({
    stage: z.string().max(50).optional(),
    workOrderId: z.string().uuid().optional(),
    search: z.string().max(100).optional(),
    sortBy: z.enum(['created_at', 'updated_at', 'current_stage', 'started_at']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type AdvanceStageInput = z.infer<typeof advanceStageSchema>['body'];
export type UpdateProductionItemInput = z.infer<typeof updateProductionItemSchema>['body'];
export type CreateProductionItemInput = z.infer<typeof createProductionItemSchema>['body'];
export type CreateChassisInput = z.infer<typeof createChassisSchema>['body'];
export type UpdateChassisInput = z.infer<typeof updateChassisSchema>['body'];
export type ProductionListQuery = z.infer<typeof productionListSchema>['query'];
