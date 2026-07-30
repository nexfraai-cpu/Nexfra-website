import { z } from 'zod';

export const storageKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1).max(200),
  }),
});

export const storageSetSchema = z.object({
  params: z.object({
    key: z.string().min(1).max(200),
  }),
  body: z.object({
    value: z.any(),
  }),
});

export const storageClearSchema = z.object({
  body: z.object({
    prefix: z.string().optional(),
  }).optional(),
});
