import { z } from 'zod';

/**
 * Request shape accepted by PUT /api/catalog/component-definitions.
 *
 * Mirrors the WIZARD_PRODUCT_TEMPLATES structure consumed by erp.js but adds
 * the identity + flag fields the modal now captures:
 *   - spec.id       -> stable spec_key when the row came from the DB catalog
 *                      (or a synthetic key for brand-new specs)
 *   - spec.required -> required vs optional
 *   - spec.enabled  -> whether the spec is shown in the builder
 *   - section.id / section.enabled -> section identity + visibility
 *   - option.enabled / option.isDefault
 *
 * Historical quotations store their own spec-value snapshots and are never
 * touched by these writes.
 */

const PriceDiffMap = z.record(z.string(), z.number());

const SectionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  enabled: z.boolean().optional().default(true),
});

const OptionSchema = z.object({
  name: z.string().trim().min(1),
  priceDifference: z.number(),
  isDefault: z.boolean().optional().default(false),
  enabled: z.boolean().optional().default(true),
});

const SpecSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  section: z.string().trim().min(1),
  type: z.enum(['dropdown', 'radio', 'checkbox', 'text', 'number']),
  required: z.boolean().optional().default(true),
  enabled: z.boolean().optional().default(true),
  defaultValue: z.string().optional().default(''),
  priceDiffs: PriceDiffMap.optional().default({}),
  options: z.array(OptionSchema).optional().default([]),
});

const TemplateSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  basePrice: z.number().nonnegative(),
  dimensions: z.record(z.string(), z.unknown()).optional().default({}),
  sections: z.array(SectionSchema).optional().default([]),
  specs: z.array(SpecSchema).optional().default([]),
});

export const SaveComponentDefinitionsSchema = z.object({
  body: z.object({
    templates: z.array(TemplateSchema).min(1),
  }),
});

export type SaveComponentDefinitionsInput = z.infer<typeof SaveComponentDefinitionsSchema>['body'];
export type SaveTemplateInput = z.infer<typeof TemplateSchema>;
export type SaveSpecInput = z.infer<typeof SpecSchema>;
export type SaveOptionInput = z.infer<typeof OptionSchema>;
export type SaveSectionInput = z.infer<typeof SectionSchema>;