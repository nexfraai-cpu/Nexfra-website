#!/usr/bin/env tsx
/**
 * Nexfra ERP — Legacy localStorage → PostgreSQL Migration CLI
 *
 * Reads a JSON export of the frontend localStorage state (the `NEXFRA_ERP_STATE`
 * blob, or a wrapper object containing it) and imports it into PostgreSQL via the
 * Supabase client.
 *
 * Usage:
 *   tsx scripts/migrate.ts <input.json> [--dry-run]
 *   tsx scripts/migrate.ts <input.json> [--inspect]
 *
 *   --dry-run   Map + validate only. Print counts. No DB writes.
 *   --inspect   Print the full mapped bundle (idMap + inserts) as JSON.
 */
import { readFileSync } from 'node:fs';
import { MigrationService } from '../src/migration/migration.service.js';

interface CliOptions {
  inputPath?: string;
  dryRun: boolean;
  inspect: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, inspect: false };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--inspect') opts.inspect = true;
    else if (!arg.startsWith('--')) opts.inputPath = arg;
  }
  return opts;
}

function renderReport(result: Awaited<ReturnType<MigrationService['run']>>): void {
  const rows = result.verifications.map((v) => {
    const status = result.dryRun ? 'DRY-RUN' : v.ok ? 'OK' : 'MISMATCH';
    return [v.entity, String(v.table), String(v.expected), String(v.inserted), String(v.verified), status];
  });

  const widths = [0, 0, 0, 0, 0, 0];
  rows.forEach((r) => r.forEach((cell, i) => (widths[i] = Math.max(widths[i], cell.length))));
  const header = ['Entity', 'Table', 'Expected', 'Inserted', 'Verified', 'Status'];

  const printLine = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i] + 2)).join('');

  console.log('\n===== MIGRATION REPORT =====');
  console.log(printLine(header));
  console.log('-'.repeat(widths.reduce((a, b) => a + b + 2, 0)));
  rows.forEach((r) => console.log(printLine(r)));

  if (result.errors.length) {
    console.log('\n----- ERRORS -----');
    result.errors.forEach((e) => console.log(`[${e.table}] ${e.message}`));
  }

  const totalExpected = result.verifications.reduce((s, v) => s + v.expected, 0);
  const failed = result.verifications.filter((v) => !v.ok && !result.dryRun).length;
  console.log('\nEntities verified: ' + result.verifications.length);
  console.log('Total rows expected: ' + totalExpected);
  if (!result.dryRun) {
    console.log('Failed verifications: ' + failed);
  }
  console.log('==========================\n');
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.inputPath) {
    console.error('Usage: tsx scripts/migrate.ts <input.json> [--dry-run] [--inspect]');
    process.exit(1);
  }

  let raw: string;
  try {
    raw = readFileSync(opts.inputPath, 'utf8');
  } catch (e) {
    console.error(`Cannot read input file: ${opts.inputPath}`);
    console.error((e as Error).message);
    process.exit(1);
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    console.error('Input file is not valid JSON.');
    console.error((e as Error).message);
    process.exit(1);
  }

  const service = new MigrationService();
  try {
    const result = await service.run(input, opts.dryRun);
    if (opts.inspect) {
      console.log(JSON.stringify({ idMap: [...result.bundle.idMap.employees.entries()], inserts: result.bundle.inserts }, null, 2));
    }
    renderReport(result);
    if (!result.dryRun && (result.errors.length || result.verifications.some((v) => !v.ok))) {
      process.exit(2);
    }
  } catch (e) {
    console.error('Migration failed:');
    console.error((e as Error).message);
    process.exit(3);
  }
}

main();
