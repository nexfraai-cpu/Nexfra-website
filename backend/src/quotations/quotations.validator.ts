import { z } from 'zod';

const specValueSchema = z.object({
  specKey: z.string().min(1),
  specName: z.string().optional(),
  section: z.string().optional(),
  selectedValue: z.string().nullable().optional(),
  customDescription: z.string().max(500).nullable().optional(),
  customPrice: z.coerce.number().nullable().optional(),
  isNotRequired: z.boolean().optional().default(false),
  effectivePriceDiff: z.coerce.number().optional().default(0),
});

const customItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  quantity: z.coerce.number().int().min(1).optional().default(1),
  price: z.coerce.number().min(0).optional().default(0),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const createQuotationSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().nullable().optional(),
    customerName: z.string().min(1, 'Customer name is required').max(200),
    customerDetails: z.record(z.unknown()).optional().default({}),
    productKey: z.string().nullable().optional(),
    templateKey: z.string().nullable().optional(),
    capacity: z.string().max(100).nullable().optional(),
    dimensions: z.record(z.unknown()).optional().default({}),
    manualTotal: z.coerce.number().min(0).nullable().optional(),
    gstRate: z.coerce.number().min(0).max(100).optional().default(18),
    orderQty: z.coerce.number().int().min(1).optional().default(1),
    terms: z.array(z.unknown()).optional().default([]),
    scopeOfWork: z.string().max(2000).nullable().optional(),
    bankDetails: z.record(z.unknown()).optional().default({}),
    notes: z.string().max(2000).nullable().optional(),
    specValues: z.array(specValueSchema).optional().default([]),
    customItems: z.array(customItemSchema).optional().default([]),
  }),
});

export const updateQuotationSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().nullable().optional(),
    customerName: z.string().min(1).max(200).optional(),
    customerDetails: z.record(z.unknown()).optional(),
    productKey: z.string().nullable().optional(),
    templateKey: z.string().nullable().optional(),
    capacity: z.string().max(100).nullable().optional(),
    dimensions: z.record(z.unknown()).optional(),
    manualTotal: z.coerce.number().min(0).nullable().optional(),
    gstRate: z.coerce.number().min(0).max(100).optional(),
    orderQty: z.coerce.number().int().min(1).optional(),
    terms: z.array(z.unknown()).optional(),
    scopeOfWork: z.string().max(2000).nullable().optional(),
    bankDetails: z.record(z.unknown()).optional(),
    notes: z.string().max(2000).nullable().optional(),
    specValues: z.array(specValueSchema).optional(),
    customItems: z.array(customItemSchema).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid quotation ID format'),
  }),
});

export const quotationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid quotation ID format'),
  }),
});

const validSortBy = ['created_at', 'updated_at', 'customer_name', 'total', 'status', 'quotation_number'] as const;
const validSortOrder = ['asc', 'desc'] as const;

export const quotationListSchema = z.object({
  query: z.object({
    status: z.enum(['Draft', 'Pending', 'Approved', 'Denied']).optional(),
    search: z.string().max(100).optional(),
    customerName: z.string().max(200).optional(),
    sortBy: z.enum(validSortBy).optional().default('created_at'),
    sortOrder: z.enum(validSortOrder).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const approveQuotationSchema = z.object({
  body: z.object({
    comment: z.string().max(500).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid quotation ID format'),
  }),
});

export const denyQuotationSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Reason is required when denying').max(500),
  }),
  params: z.object({
    id: z.string().uuid('Invalid quotation ID format'),
  }),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>['body'];
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>['body'];
export type QuotationListQuery = z.infer<typeof quotationListSchema>['query'];
