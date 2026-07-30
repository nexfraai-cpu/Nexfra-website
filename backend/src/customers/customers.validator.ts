import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200),
    company: z.string().min(1, 'Company name is required').max(200),
    gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format').optional(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number').optional(),
    email: z.string().email('Invalid email format').optional(),
    address: z.string().max(500).optional(),
    vehicles: z.array(z.object({
      registration: z.string().optional(),
      type: z.string().optional(),
    })).optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    company: z.string().min(1).max(200).optional(),
    gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format').optional().nullable(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number').optional().nullable(),
    email: z.string().email('Invalid email format').optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    vehicles: z.array(z.object({
      registration: z.string().optional(),
      type: z.string().optional(),
    })).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
});

export const customerIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
});

const validSortBy = ['name', 'company', 'created_at', 'outstanding'] as const;
const validSortOrder = ['asc', 'desc'] as const;

export const customerListSchema = z.object({
  query: z.object({
    search: z.string().max(100).optional(),
    company: z.string().max(200).optional(),
    sortBy: z.enum(validSortBy).optional().default('created_at'),
    sortOrder: z.enum(validSortOrder).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type CustomerListQuery = z.infer<typeof customerListSchema>['query'];
