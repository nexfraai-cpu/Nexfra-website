import { z } from 'zod';

export const createChassisSchema = z.object({
  body: z.object({
    workOrderId: z.string().uuid('Invalid work order ID format').nullable().optional(),
    field: z.string().max(100).nullable().optional(),
    brand: z.string().max(100).nullable().optional(),
    model: z.string().max(100).nullable().optional(),
    chassisNumber: z.string().max(100).nullable().optional(),
    arrivalDate: z.string().nullable().optional(),
    outDate: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
});

export const updateChassisSchema = z.object({
  body: z.object({
    workOrderId: z.string().uuid('Invalid work order ID format').nullable().optional(),
    field: z.string().max(100).nullable().optional(),
    brand: z.string().max(100).nullable().optional(),
    model: z.string().max(100).nullable().optional(),
    chassisNumber: z.string().max(100).nullable().optional(),
    arrivalDate: z.string().nullable().optional(),
    outDate: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid chassis record ID format'),
  }),
});

export const chassisIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid chassis record ID format'),
  }),
});

export const chassisListSchema = z.object({
  query: z.object({
    workOrderId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
  }),
});

export type CreateChassisRequestBody = z.infer<typeof createChassisSchema>['body'];
export type UpdateChassisRequestBody = z.infer<typeof updateChassisSchema>['body'];
export type ChassisListQuery = z.infer<typeof chassisListSchema>['query'];