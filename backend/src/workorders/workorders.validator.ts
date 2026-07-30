import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  body: z.object({
    quotationId: z.string().uuid('Invalid quotation ID format'),
    factoryNotes: z.string().max(2000).nullable().optional(),
    dueDate: z.string().nullable().optional(),
    isUrgent: z.boolean().optional().default(false),
  }),
});

export const updateWorkOrderSchema = z.object({
  body: z.object({
    factoryNotes: z.string().max(2000).nullable().optional(),
    dueDate: z.string().nullable().optional(),
    isUrgent: z.boolean().optional(),
    status: z.string().max(50).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid work order ID format'),
  }),
});

export const workOrderIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid work order ID format'),
  }),
});

export const setDueDateSchema = z.object({
  body: z.object({
    dueDate: z.string().nullable(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const toggleUrgentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const validSortBy = ['created_at', 'updated_at', 'due_date', 'customer_name', 'product_name', 'status'] as const;

export const workOrderListSchema = z.object({
  query: z.object({
    status: z.string().max(50).optional(),
    search: z.string().max(100).optional(),
    urgent: z.coerce.boolean().optional(),
    sortBy: z.enum(validSortBy).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>['body'];
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>['body'];
export type WorkOrderListQuery = z.infer<typeof workOrderListSchema>['query'];
