import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200),
    company: z.string().min(1, 'Company name is required').max(200),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number').optional(),
    email: z.string().email('Invalid email format').optional(),
    message: z.string().max(2000).optional(),
  }),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];
