import { z } from 'zod';

export const legacyOptionSchema = z.object({
  name: z.string(),
  priceDiff: z.number().optional(),
});

export const legacySpecSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(''),
  default: z.string().optional(),
  defaultValue: z.string().optional(),
  section: z.string().optional(),
  type: z.string().optional(),
  options: z.array(legacyOptionSchema).optional(),
  priceDiffs: z.record(z.string(), z.number()).optional(),
});

export const legacyProductSchema = z.object({
  name: z.string().optional().default(''),
  basePrice: z.number().optional().default(0),
  templates: z.array(z.string()).optional(),
  specs: z.array(legacySpecSchema).optional(),
});

export const legacyCustomerSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(''),
  company: z.string().optional().default(''),
  gst: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicles: z.array(z.string()).optional(),
  outstanding: z.number().optional().default(0),
});

export const legacyQuotationSchema = z.object({
  id: z.string(),
  subtype: z.string().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().optional().default(''),
  model: z.string().optional(),
  productName: z.string().optional(),
  date: z.string().optional(),
  createdAt: z.string().optional(),
  total: z.number().optional().default(0),
  status: z.string().optional().default('Pending Approval'),
  specs: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  notRequired: z.record(z.string(), z.boolean()).optional(),
  capacity: z.string().optional(),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  scopeOfWork: z.string().optional(),
  terms: z.array(z.unknown()).optional(),
  orderQty: z.number().optional().default(1),
  bankDetails: z.record(z.string(), z.unknown()).optional(),
});

export const legacyWorkOrderSchema = z.object({
  id: z.string(),
  quoteId: z.string().nullable().optional(),
  customerName: z.string().optional().default(''),
  product: z.string().optional().default(''),
  date: z.string().optional(),
  stage: z.string().optional().default('Pending'),
  progress: z.number().optional(),
  specs: z.array(z.string()).optional(),
  notes: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  urgent: z.boolean().optional(),
});

export const legacyProductionItemSchema = z.object({
  id: z.string(),
  quoteId: z.string().nullable().optional(),
  customerName: z.string().optional().default(''),
  product: z.string().optional().default(''),
  date: z.string().optional(),
  columnStatus: z.string().optional().default('Not Started'),
  progressPct: z.number().optional(),
  progressionMap: z.record(z.string(), z.unknown()).optional(),
  remarks: z.record(z.string(), z.unknown()).optional(),
  dueDate: z.string().nullable().optional(),
  urgent: z.boolean().optional(),
});

export const legacySaleSchema = z.object({
  invoiceId: z.string(),
  customerName: z.string().optional().default(''),
  product: z.string().optional().default(''),
  amount: z.number().optional().default(0),
  date: z.string().optional(),
  status: z.string().optional().default('Pending'),
});

export const legacyPaymentSchema = z.object({
  id: z.string(),
  quoteId: z.string().nullable().optional(),
  invoiceId: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  amount: z.number().optional().default(0),
  mode: z.string().optional().default('Cash'),
  ref: z.string().nullable().optional(),
});

export const legacyEmployeeSchema = z.object({
  id: z.string(),
  fullName: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  role: z.string().optional().default('sales'),
  status: z.string().optional().default('Active'),
  password: z.string().optional(),
  isDeleted: z.boolean().optional(),
  createdDate: z.string().optional(),
  lastLogin: z.string().nullable().optional(),
});

export const legacyLogSchema = z.object({
  time: z.string().optional(),
  message: z.string().optional().default(''),
});

export const legacyCustomItemDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  fields: z.array(z.unknown()).optional(),
});

export const legacySpecOverrideGroupSchema = z.object({
  specs: z.array(legacySpecSchema).optional(),
});

export const legacyChassisRecordSchema = z.object({
  id: z.string(),
  field: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  brandModel: z.string().optional(),
  workOrderId: z.string().nullable().optional(),
  chassisNumber: z.string().optional(),
  arrivalDate: z.string().nullable().optional(),
  outDate: z.string().nullable().optional(),
});

export const legacyStateSchema = z.object({
  activeRole: z.string().optional(),
  customers: z.array(legacyCustomerSchema).optional().default([]),
  products: z.record(z.string(), legacyProductSchema).optional().default({}),
  quotations: z.array(legacyQuotationSchema).optional().default([]),
  quotationCounter: z.number().optional().default(0),
  workOrders: z.array(legacyWorkOrderSchema).optional().default([]),
  productionItems: z.array(legacyProductionItemSchema).optional().default([]),
  sales: z.array(legacySaleSchema).optional().default([]),
  payments: z.array(legacyPaymentSchema).optional().default([]),
  employees: z.array(legacyEmployeeSchema).optional().default([]),
  employeeCounter: z.number().optional().default(0),
  logs: z.array(legacyLogSchema).optional().default([]),
  adminPricing: z.record(z.string(), z.number()).optional(),
  customItemDefinitions: z.array(legacyCustomItemDefinitionSchema).optional().default([]),
  productSpecOverrides: z.record(z.string(), legacySpecOverrideGroupSchema).optional().default({}),
  chassisRecords: z.array(legacyChassisRecordSchema).optional().default([]),
  metalPricePerKg: z.number().optional(),
});
