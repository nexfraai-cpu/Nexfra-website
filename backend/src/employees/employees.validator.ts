import { z } from 'zod';

const validRoles = ['admin', 'sales', 'finance', 'manager'] as const;

export const createEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number').optional(),
    employeeCode: z.string().max(20).optional(),
    role: z.enum(validRoles, { message: 'Role must be admin, sales, finance, or manager' }),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number').optional().nullable(),
    employeeCode: z.string().max(20).optional(),
    role: z.enum(validRoles, { message: 'Role must be admin, sales, finance, or manager' }).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
});

export const employeeIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
});

export const employeeListSchema = z.object({
  query: z.object({
    role: z.enum(validRoles).optional(),
    status: z.enum(['Active', 'Disabled']).optional(),
    search: z.string().max(100).optional(),
    includeDisabled: z.string().optional(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>['body'];
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>['body'];
