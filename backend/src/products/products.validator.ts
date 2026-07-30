import { z } from 'zod';

const validSpecTypes = ['dropdown', 'text', 'number', 'checkbox', 'radio'] as const;

const optionSchema = z.object({
  optionName: z.string().min(1).max(100),
  priceDiff: z.coerce.number().optional().default(0),
  isDefault: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const createProductSchema = z.object({
  body: z.object({
    key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    sortOrder: z.coerce.number().int().optional().default(0),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().optional(),
  }),
  params: z.object({
    key: z.string().min(1),
  }),
});

export const productKeySchema = z.object({
  params: z.object({
    key: z.string().min(1),
  }),
});

export const templateKeySchema = z.object({
  params: z.object({
    key: z.string().min(1),
    templateKey: z.string().min(1),
  }),
});

export const createTemplateSchema = z.object({
  body: z.object({
    key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
    name: z.string().min(1).max(100),
    basePrice: z.coerce.number().min(0, 'Base price must be non-negative'),
    dimensions: z.record(z.unknown()).optional().default({}),
    sortOrder: z.coerce.number().int().optional().default(0),
  }),
  params: z.object({
    key: z.string().min(1),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    basePrice: z.coerce.number().min(0).optional(),
    dimensions: z.record(z.unknown()).optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    key: z.string().min(1),
    templateKey: z.string().min(1),
  }),
});

export const createSpecSchema = z.object({
  body: z.object({
    specKey: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
    name: z.string().min(1).max(100),
    section: z.string().min(1).max(100),
    specType: z.enum(validSpecTypes, { message: 'Must be dropdown, text, number, checkbox, or radio' }),
    defaultValue: z.string().max(200).optional(),
    sortOrder: z.coerce.number().int().optional().default(0),
    options: z.array(optionSchema).optional().default([]),
  }),
  params: z.object({
    id: z.string().uuid('Invalid template ID format'),
  }),
});

export const updateSpecSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    section: z.string().min(1).max(100).optional(),
    specType: z.enum(validSpecTypes).optional(),
    defaultValue: z.string().max(200).optional().nullable(),
    sortOrder: z.coerce.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
    specKey: z.string().min(1),
  }),
});

export const specKeySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    specKey: z.string().min(1),
  }),
});

export const createOptionSchema = z.object({
  body: z.object({
    optionName: z.string().min(1).max(100),
    priceDiff: z.coerce.number().optional().default(0),
    isDefault: z.boolean().optional().default(false),
    sortOrder: z.coerce.number().int().optional().default(0),
  }),
  params: z.object({
    specId: z.string().uuid(),
  }),
});

export const updateOptionSchema = z.object({
  body: z.object({
    optionName: z.string().min(1).max(100).optional(),
    priceDiff: z.coerce.number().optional(),
    isDefault: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  }),
  params: z.object({
    specId: z.string().uuid(),
    optionId: z.string().uuid(),
  }),
});

export const optionIdSchema = z.object({
  params: z.object({
    specId: z.string().uuid(),
    optionId: z.string().uuid(),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>['body'];
export type CreateSpecInput = z.infer<typeof createSpecSchema>['body'];
export type UpdateSpecInput = z.infer<typeof updateSpecSchema>['body'];
export type CreateOptionInput = z.infer<typeof createOptionSchema>['body'];
export type UpdateOptionInput = z.infer<typeof updateOptionSchema>['body'];
