#!/usr/bin/env tsx
/**
 * Nexfra ERP — Development Auth Seed
 *
 * Provisions real Supabase auth users + employee records for development and
 * testing. The backend enforces ownership via the authenticated user, so every
 * dev login needs a real JWT. This script creates the four role accounts that
 * the frontend quick-login buttons use (see src/services/AuthenticationService.js
 * loginByRole) with known dev passwords.
 *
 * The `handle_new_user` DB trigger creates the `employees` row automatically
 * from `user_metadata.full_name` and `user_metadata.role`.
 *
 * Usage:
 *   npm run seed            # create missing dev accounts (idempotent)
 *   npm run seed -- --force # even when NODE_ENV=production
 */
import { supabase } from '../src/database/client.js';
import { config } from '../src/config/index.js';

const DEV_PASSWORD = 'Nexfra@Dev123';

const ACCOUNTS = [
  { email: 'admin@nexfra.dev', fullName: 'Admin', role: 'admin' },
  { email: 'sales@nexfra.dev', fullName: 'Sales', role: 'sales' },
  { email: 'finance@nexfra.dev', fullName: 'Finance', role: 'finance' },
  { email: 'manager@nexfra.dev', fullName: 'Manager', role: 'manager' },
] as const;

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  if (config.isProd() && !force) {
    console.error('Refusing to seed auth users in production. Pass --force to override.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const account of ACCOUNTS) {
    const { data: existing, error: lookupError } = await supabase
      .from('employees')
      .select('id, email')
      .eq('email', account.email)
      .is('deleted_at', null)
      .maybeSingle();

    if (lookupError) {
      console.error(`Lookup failed for ${account.email}:`, lookupError.message);
      process.exit(1);
    }

    if (existing) {
      console.log(`SKIP  ${account.email} (employee already exists)`);
      skipped += 1;
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, role: account.role },
    });

    if (error) {
      if (error.message?.includes('already registered')) {
        console.log(`SKIP  ${account.email} (auth user already registered)`);
        skipped += 1;
        continue;
      }
      console.error(`FAIL  ${account.email}:`, error.message);
      process.exit(1);
    }

    const authId = data.user?.id;
    if (authId) {
      await supabase.from('employees').update({ phone: null }).eq('auth_id', authId);
    }

    console.log(`OK    ${account.email} -> role=${account.role}`);
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  console.log(`Dev password for all accounts: ${DEV_PASSWORD}`);
}

main().catch((e) => {
  console.error('Seed failed:', (e as Error).message);
  process.exit(3);
});
