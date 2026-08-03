-- ============================================================================
-- Nexfra ERP — Supabase Migration 005: Restore Rigid Load Body Templates
-- Date: 2026-08-03
-- ============================================================================
--
-- The original seed (20260731000002_seed.sql) created product templates for the
-- trailer (flatbed, sidewall, tiptrailer) and tipper (boxbody, rockbody) products
-- but omitted the rigid load body variants (rigid28, rigid30).
--
-- Existing quotations still reference template_key = 'rigid30' (and the wizard in
-- erp.js ships rigid28/rigid30), so editing those quotations fails with
-- "Template 'rigid30' not found for pricing calculation" because the pricing
-- lookup (findTemplateBasePrice) returns null. This migration restores the missing
-- templates using the base prices from the frontend wizard, keeping existing
-- quotation totals stable. No pricing logic or PDF generation is changed.
-- ============================================================================

BEGIN;

-- 28 Feet Rigid Load Body
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rigid28', '28 Feet Rigid Load Body', 380000,
  '{"length": "28 Feet", "height": "4.0 Feet", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'rigid'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'rigid28');

-- 30 Feet Rigid Load Body
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rigid30', '30 Feet Rigid Load Body', 420000,
  '{"length": "30 Feet", "height": "4.0 Feet", "width": "98 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'rigid'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'rigid30');

COMMIT;
