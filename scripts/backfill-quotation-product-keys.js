/**
 * One-off backfill: repair quotations that were created before
 * src/services/QuotationService.js mapped templateKey/productKey correctly.
 *
 * Those rows have product_key = NULL and template_key = NULL. This script
 * infers the correct template from the quotation's saved spec values
 * (spec keys are distinctive per product template) and patches the row.
 *
 * Usage:
 *   node scripts/backfill-quotation-product-keys.js
 *
 * Reads SUPABASE_URL / SUPABASE_SERVICE_KEY from backend/.env (set -a).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', 'backend', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in backend/.env');
  process.exit(1);
}

// Spec key sets per template (mirrors WIZARD_PRODUCT_TEMPLATES in erp.js).
const TEMPLATES = {
  flatbed: ['beam', 'floor', 'cylinder', 'axles', 'landing_leg', 'suspension', 'brake', 'disc', 'hook', 'tyre', 'painting', 'colour', 'marker_lamps', 'supd_rupd'],
  sidewall: ['beam', 'floor', 'side_panel', 'cylinder', 'axles', 'landing_leg', 'suspension', 'brake', 'tyre', 'painting', 'colour', 'marker_lamps', 'supd_rupd'],
  tiptrailer: ['beam', 'floor', 'side_sheet', 'cylinder', 'axles', 'landing_leg', 'painting', 'colour', 'marker_lamps', 'supd_rupd'],
  boxbody: ['floor', 'side_sheet', 'headboard', 'taildoor', 'cylinder', 'pto', 'pump', 'lock_system', 'landing_leg', 'painting', 'colour', 'marker_lamps', 'supd_rupd', 'subframe'],
  rockbody: ['floor', 'side_sheet', 'cylinder', 'landing_leg', 'painting', 'colour', 'marker_lamps', 'supd_rupd', 'subframe'],
  rigid28: ['floor', 'side_board', 'headboard', 'taildoor', 'cylinder', 'runner', 'landing_leg', 'painting', 'marker_lamps', 'supd_rupd', 'subframe'],
  rigid30: ['floor', 'side_board', 'headboard', 'taildoor', 'cylinder', 'runner', 'landing_leg', 'painting', 'marker_lamps', 'supd_rupd', 'subframe'],
};

const SUBTYPE_PRODUCT = {
  flatbed: 'trailer',
  sidewall: 'trailer',
  tiptrailer: 'trailer',
  boxbody: 'tipper',
  rockbody: 'tipper',
  rigid28: 'rigid',
  rigid30: 'rigid',
  rigid: 'rigid',
};

async function request(pathname, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${pathname}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${pathname} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function predictTemplate(keys) {
  const set = new Set(keys);
  const ranked = Object.entries(TEMPLATES)
    .map(([t, tkeys]) => [t, tkeys.filter((k) => set.has(k)).length])
    .sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  const [runner, runnerScore] = ranked[1];
  if (bestScore === 0 || bestScore === runnerScore) return null;
  return best;
}

const affected = await request(
  '/quotations?select=id,quotation_number,customer_name&template_key=is.null&deleted_at=is.null&order=quotation_number.asc',
);

let updated = 0;
let skipped = 0;
for (const q of affected) {
  const svs = await request(
    `/quotation_spec_values?select=spec_key&quotation_id=eq.${q.id}&limit=100`,
  );
  const keys = [...new Set(svs.map((r) => r.spec_key))];
  const template = predictTemplate(keys);
  if (!template) {
    console.log(`SKIP  ${q.quotation_number.padEnd(15)} ${q.customer_name} (no reliable template match)`);
    skipped += 1;
    continue;
  }
  await request(`/quotations?id=eq.${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      product_key: SUBTYPE_PRODUCT[template],
      template_key: template,
    }),
  });
  updated += 1;
  console.log(`FIXED ${q.quotation_number.padEnd(15)} ${q.customer_name.padEnd(10)} -> ${template} / ${SUBTYPE_PRODUCT[template]}`);
}

console.log(`\nDone. Updated ${updated} row(s), skipped ${skipped}.`);
