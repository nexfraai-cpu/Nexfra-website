/**
 * Legacy data types — mirror the frontend localStorage `NEXFRA_ERP_STATE` blob
 * (see `src/dev-data.js` and `src/services/*` for the original shapes).
 */

export interface LegacyState {
  activeRole?: string;
  customers?: LegacyCustomer[];
  products?: Record<string, LegacyProduct>;
  quotations?: LegacyQuotation[];
  quotationCounter?: number;
  workOrders?: LegacyWorkOrder[];
  productionItems?: LegacyProductionItem[];
  sales?: LegacySale[];
  payments?: LegacyPayment[];
  employees?: LegacyEmployee[];
  employeeCounter?: number;
  logs?: LegacyLog[];
  adminPricing?: Record<string, number>;
  customItemDefinitions?: LegacyCustomItemDefinition[];
  productSpecOverrides?: Record<string, LegacySpecOverrideGroup>;
  chassisRecords?: LegacyChassisRecord[];
  metalPricePerKg?: number;
}

export interface LegacyCustomer {
  id: string;
  name: string;
  company: string;
  gst?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  vehicles?: string[];
  outstanding?: number;
}

export interface LegacyProduct {
  name: string;
  basePrice: number;
  templates?: string[];
  specs?: LegacySpec[];
}

export interface LegacySpec {
  id: string;
  name: string;
  default?: string;
  defaultValue?: string;
  section?: string;
  type?: string;
  options?: LegacyOption[];
  priceDiffs?: Record<string, number>;
}

export interface LegacyOption {
  name: string;
  priceDiff?: number;
}

export interface LegacyQuotation {
  id: string;
  subtype?: string;
  customerId?: string | null;
  customerName?: string;
  model?: string;
  productName?: string;
  date?: string;
  createdAt?: string;
  total?: number;
  status?: string;
  specs?: Record<string, string | number | undefined>;
  notRequired?: Record<string, boolean>;
  capacity?: string;
  dimensions?: Record<string, unknown>;
  scopeOfWork?: string;
  terms?: unknown[];
  orderQty?: number;
  bankDetails?: Record<string, unknown>;
}

export interface LegacyWorkOrder {
  id: string;
  quoteId?: string | null;
  customerName?: string;
  product?: string;
  date?: string;
  stage?: string;
  progress?: number;
  specs?: string[];
  notes?: string;
  dueDate?: string | null;
  urgent?: boolean;
}

export interface LegacyProductionItem {
  id: string;
  quoteId?: string | null;
  customerName?: string;
  product?: string;
  date?: string;
  columnStatus?: string;
  progressPct?: number;
  progressionMap?: Record<string, unknown>;
  remarks?: Record<string, unknown>;
  dueDate?: string | null;
  urgent?: boolean;
}

export interface LegacySale {
  invoiceId: string;
  customerName?: string;
  product?: string;
  amount?: number;
  date?: string;
  status?: string;
}

export interface LegacyPayment {
  id: string;
  quoteId?: string | null;
  invoiceId?: string;
  date?: string;
  time?: string;
  amount?: number;
  mode?: string;
  ref?: string | null;
}

export interface LegacyEmployee {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  role?: string;
  status?: string;
  password?: string;
  isDeleted?: boolean;
  createdDate?: string;
  lastLogin?: string | null;
}

export interface LegacyLog {
  time?: string;
  message?: string;
}

export interface LegacyCustomItemDefinition {
  id?: string;
  name: string;
  fields?: unknown[];
}

export interface LegacySpecOverrideGroup {
  specs?: LegacySpec[];
}

export interface LegacyChassisRecord {
  id: string;
  field?: string;
  brand?: string;
  model?: string;
  brandModel?: string;
  workOrderId?: string | null;
  chassisNumber?: string;
  arrivalDate?: string | null;
  outDate?: string | null;
}

/** A single DB row payload — table name + rows, ready for supabase insert. */
export interface TableInsert {
  table: string;
  rows: Record<string, unknown>[];
}

/** Deterministic relationship map from legacy string IDs to generated UUIDs. */
export interface IdMap {
  employees: Map<string, string>;
  customers: Map<string, string>;
  products: Map<string, string>;
  productTemplates: Map<string, string>;
  quotations: Map<string, string>;
  workOrders: Map<string, string>;
  sales: Map<string, string>;
}

/** Fully mapped, ordered bundle ready for database insertion. */
export interface MigrationBundle {
  idMap: IdMap;
  inserts: TableInsert[];
}

/** Per-entity verification result. */
export interface EntityVerification {
  entity: string;
  table: string;
  expected: number;
  inserted: number;
  verified: number;
  ok: boolean;
}

export interface MigrationResult {
  dryRun: boolean;
  bundle: MigrationBundle;
  verifications: EntityVerification[];
  errors: { table: string; message: string }[];
}
