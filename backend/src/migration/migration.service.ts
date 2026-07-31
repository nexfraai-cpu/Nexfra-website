import { supabase } from '../database/client.js';
import { logger } from '../config/logger.js';
import { mapLegacyState } from './migration.mapper.js';
import { legacyStateSchema } from './migration.validator.js';
import {
  LegacyState,
  MigrationBundle,
  MigrationResult,
  EntityVerification,
  TableInsert,
} from './migration.types.js';

/**
 * Verification plan — the exact PostgreSQL tables that must be verified after
 * a migration, in insertion order. Mirrors the required entity list:
 * Employees, Customers, Products, Quotations, Work Orders, Finance, Audit Logs.
 */
const VERIFICATION_PLAN: { entity: string; table: string }[] = [
  { entity: 'Employees', table: 'employees' },
  { entity: 'Customers', table: 'customers' },
  { entity: 'Products', table: 'products' },
  { entity: 'Product Templates', table: 'product_templates' },
  { entity: 'Product Specs', table: 'product_template_specs' },
  { entity: 'Product Options', table: 'product_spec_options' },
  { entity: 'Quotations', table: 'quotations' },
  { entity: 'Quotation Spec Values', table: 'quotation_spec_values' },
  { entity: 'Work Orders', table: 'work_orders' },
  { entity: 'Production Items', table: 'production_items' },
  { entity: 'Sales', table: 'sales' },
  { entity: 'Payments', table: 'payments' },
  { entity: 'Audit Logs', table: 'audit_logs' },
];

export class MigrationService {
  async parseInput(input: unknown): Promise<LegacyState> {
    // Accept either the raw legacy state blob (the NEXFRA_ERP_STATE value) or the
    // browser-export wrapper: { storage: { NEXFRA_ERP_STATE: {...}, ... } }.
    let candidate = input;
    if (
      input &&
      typeof input === 'object' &&
      !Array.isArray(input) &&
      'storage' in (input as Record<string, unknown>)
    ) {
      const wrapper = input as { storage?: Record<string, unknown> };
      candidate = wrapper.storage?.NEXFRA_ERP_STATE ?? wrapper.storage;
    }
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('Invalid legacy state: expected an object');
    }

    const parsed = legacyStateSchema.safeParse(candidate);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 20)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      throw new Error(`Invalid legacy state: ${issues}`);
    }
    return parsed.data;
  }

  async map(state: LegacyState): Promise<MigrationBundle> {
    return mapLegacyState(state);
  }

  /** Execute inserts sequentially in dependency order. Returns per-table errors. */
  private async executeInserts(inserts: TableInsert[]): Promise<{ table: string; message: string }[]> {
    const errors: { table: string; message: string }[] = [];
    for (const { table, rows } of inserts) {
      const { error } = await supabase.from(table).insert(rows);
      if (error) {
        logger.error({ error, table, rowCount: rows.length }, 'Migration insert failed');
        errors.push({ table, message: error.message });
      } else {
        logger.info({ table, rowCount: rows.length }, 'Migration insert succeeded');
      }
    }
    return errors;
  }

  /** Count rows per verified table and compare against the expected source count. */
  private async verify(bundle: MigrationBundle): Promise<EntityVerification[]> {
    const expectedByTable = new Map<string, number>();
    for (const { table, rows } of bundle.inserts) {
      expectedByTable.set(table, rows.length);
    }

    const verifications: EntityVerification[] = [];
    for (const { entity, table } of VERIFICATION_PLAN) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        verifications.push({ entity, table, expected: expectedByTable.get(table) ?? 0, inserted: 0, verified: 0, ok: false });
        continue;
      }

      const verified = count ?? 0;
      verifications.push({
        entity,
        table,
        expected: expectedByTable.get(table) ?? 0,
        inserted: expectedByTable.get(table) ?? 0,
        verified,
        ok: verified >= (expectedByTable.get(table) ?? 0),
      });
    }
    return verifications;
  }

  async run(input: unknown, dryRun = false): Promise<MigrationResult> {
    const state = await this.parseInput(input);
    const bundle = await this.map(state);

    let errors: { table: string; message: string }[] = [];
    let verifications: EntityVerification[] = [];

    if (dryRun) {
      logger.info({ insertCount: bundle.inserts.length }, 'Dry run — no DB writes performed');
      verifications = bundle.inserts.map(({ table, rows }) => ({
        entity: table,
        table,
        expected: rows.length,
        inserted: 0,
        verified: 0,
        ok: true,
      }));
    } else {
      errors = await this.executeInserts(bundle.inserts);
      verifications = await this.verify(bundle);
    }

    const result: MigrationResult = { dryRun, bundle, verifications, errors };
    return result;
  }
}

/** Shared export — Zod schema used by tests and CLI. */
export { legacyStateSchema };

export type { MigrationResult, EntityVerification };
