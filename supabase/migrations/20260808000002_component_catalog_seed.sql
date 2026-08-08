-- ============================================================================
-- Nexfra ERP — Supabase Migration 009: Component Catalog Seed
-- Date: 2026-08-08
-- ============================================================================
--
-- PHASE 1 — DATABASE FOUNDATION ONLY.
--
-- Inserts an exact copy of today's hardcoded quotation-builder definitions
-- (sections, specs, options) from WIZARD_PRODUCT_TEMPLATES in erp.js into the
-- new catalog tables created by migration 008.
--
-- Guarantees:
--   * Nothing is added, removed, or renamed relative to the JS definitions.
--   * Each product template's specs/options are preserved verbatim (including
--     price differentials, defaults, and display order).
--   * The application continues to use the hardcoded JS after this phase.
--   * ON CONFLICT DO NOTHING makes the seed idempotent.
--
-- Counts (by INSERT block):
--   sections: 6, specs: 82, options: 279 (total 367 rows)
--
-- Resilience (replaces scalar subqueries with SELECT-guarded inserts):
--   * Every spec is inserted ONLY if its product template key exists
--     (FROM product_templates WHERE key = '...'), so a missing or renamed
--     template is a no-op instead of a NULL template_id error.
--   * Every option is inserted ONLY if its spec exists
--     (FROM specs WHERE id = '...'), so options never orphan against a spec
--     that was skipped.
--   * Result at the time of writing (production has 5 templates; rigid28/
--     rigid30 are absent): sections=6, specs=60, options=205.
-- ============================================================================

BEGIN;

-- Sections
INSERT INTO sections (id, key, name, display_order, enabled)
  VALUES ('7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'material', '1. Steel Sheets & Material Grade', 1, TRUE)
  ON CONFLICT (key) DO NOTHING;
INSERT INTO sections (id, key, name, display_order, enabled)
  VALUES ('8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'chassis', '2. Structural Axil & Suspension', 2, TRUE)
  ON CONFLICT (key) DO NOTHING;
INSERT INTO sections (id, key, name, display_order, enabled)
  VALUES ('79aed178-2665-41f4-b211-8e9d0b535792', 'hydraulic', '3. Tipping Hydraulics & Cylinder Kit', 3, TRUE)
  ON CONFLICT (key) DO NOTHING;
INSERT INTO sections (id, key, name, display_order, enabled)
  VALUES ('43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', '4. Primer, Coatings & Finishing Colour', 4, TRUE)
  ON CONFLICT (key) DO NOTHING;
INSERT INTO sections (id, key, name, display_order, enabled)
  VALUES ('71615908-e45b-474c-b1a1-77ea512d6a3e', 'accessories', '5. Fitted Accessories & Safety Marker Lights', 5, TRUE)
  ON CONFLICT (key) DO NOTHING;
INSERT INTO sections (id, key, name, display_order, enabled)
  VALUES ('d2635195-3e9f-4421-b8af-bd62e4d21ea8', 'subframe', '7. Subframe', 6, TRUE)
  ON CONFLICT (key) DO NOTHING;

-- Specs
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '3a79ad6a-2527-4fff-9283-ec7c32e94027', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'beam', 'Main Beam Steel Grade', 'dropdown', 'ST52', 1, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'de2a7150-5943-40d5-986f-4b26333d5947', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor Sheet Type', 'dropdown', '3mm Chequered', 2, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '777b79dc-c7df-4113-af04-61e04d2f2e75', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 3, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '849a71da-a965-446b-aede-498c0d5af043', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'axles', 'Axle Brand & Loading', 'radio', 'York 3x13T', 4, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'b1ab6f12-3450-405f-82e8-6bd60876145a', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 5, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'f634aa12-8fb6-4bbe-9c2c-bdca3dcefe29', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'suspension', 'Suspension System', 'dropdown', 'Mechanical Leaf Spring', 6, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'fe7ccb7a-7a09-46c7-bb19-2616cf34cc53', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'brake', 'Brake System Pneumatic', 'dropdown', 'WABCO ABS', 7, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'ea59c007-34cf-4750-9e9a-8e5485529694', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'disc', 'Wheel Disc Style', 'dropdown', 'Steel 10-hole', 8, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'b82ca69c-a234-47c7-844c-efdcebe58c5d', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'hook', 'King Pin/Hook Size', 'dropdown', 'Standard 2-inch JOST', 9, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'd71c877b-985a-4085-b2ab-5b0060d8a94b', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'tyre', 'Tyres Fitted', 'dropdown', 'Apollo 10.00R20', 10, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'fee0b620-5e27-498e-8b17-1fb27b8b0ca9', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Surface Treatment', 'dropdown', 'Epoxy Primer + PU Paint', 11, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '046d0c61-a492-4b37-81a6-0a426dee4e0c', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'colour', 'Finish Colour', 'text', 'Golden Green', 12, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '93bfd11c-ceb0-4b02-af17-f557fe1709b5', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 13, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '453b4c14-c4fb-4beb-a49b-d4b4af5ac6f4', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 14, TRUE
  FROM product_templates WHERE key = 'flatbed'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '123b1b57-30f6-4d30-8fb2-251177278cb4', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'beam', 'Main Beam Steel Grade', 'dropdown', 'ST52', 1, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'bc99bb16-757a-4c23-acf1-780206369779', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor Sheet Type', 'dropdown', '3mm Chequered', 2, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '955d7e64-f00b-4849-b952-6cef427db96b', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'side_panel', 'Side Panel Height/Style', 'radio', '1.5mm Corrugated', 3, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '9a15898d-5b18-4b93-bbe7-076024c4592d', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 4, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '06af9692-5f1b-4a3b-9f28-9adafbf85c70', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'axles', 'Axle Brand & Loading', 'radio', 'York 3x13T', 5, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '18128a18-b221-4ae7-bf9b-dc5e61bcff7c', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 6, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'be42f3a2-a498-4253-8e0e-e3824388d4b5', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'suspension', 'Suspension System', 'dropdown', 'Mechanical Leaf Spring', 7, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '3b91df4e-b8c3-4c78-8351-7d605543f77d', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'brake', 'Brake System Pneumatic', 'dropdown', 'WABCO ABS', 8, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '6709c039-43d2-4dd2-bd5c-a8d171335483', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'tyre', 'Tyres Fitted', 'dropdown', 'Apollo 10.00R20', 9, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'b821853e-2dab-4184-9e74-d7dcf453d63c', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Surface Treatment', 'dropdown', 'Epoxy Primer + PU Paint', 10, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '8eaaff28-3e45-4314-9136-847896a2ba71', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'colour', 'Finish Colour', 'text', 'Golden Green', 11, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '3a7a4af7-222b-4484-8bc4-843431e05ae0', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 12, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '4cadd4a4-5223-4727-8302-cbd6bc5630e0', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 13, TRUE
  FROM product_templates WHERE key = 'sidewall'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'f1f043b1-9ab6-453f-8a2b-eef4ecbfe2e3', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'beam', 'Main Beam Steel Grade', 'dropdown', 'ST52', 1, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '506e896d-86e2-4a8a-b4e1-3e7761f95489', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor Sheet thickness', 'dropdown', '8mm ST-52', 2, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'b741b768-822b-4b6d-a5de-21dbee2ecc55', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'side_sheet', 'Side Sheet thickness', 'dropdown', '6mm ST-52', 3, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '940b4036-3898-4fe5-becb-72a6d5167693', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 4, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '03f4264a-4bc7-4fe6-bbf5-62e4574a73c0', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'axles', 'Axles Fitted', 'radio', 'York 3x13T', 5, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '2cb57bc4-3e87-4040-8ddc-620dbc679cc2', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 6, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '014377fd-d466-4c5a-9b49-858cd3926b1a', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Surface Treatment', 'dropdown', 'Epoxy Primer + PU Paint', 7, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '0cffaae7-d51c-419b-9679-91f23fe739f2', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'colour', 'Finish Colour', 'text', 'Royal Blue', 8, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '77688b00-b1f9-4ae7-80c2-2250ec62d32e', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 9, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'b44843f4-5290-44a6-bf33-f328aa654b15', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 10, TRUE
  FROM product_templates WHERE key = 'tiptrailer'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '72465f9d-023a-4aa1-99cc-40ceba17606a', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor Sheet thickness', 'dropdown', '8mm ST-52', 1, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '1cc7ea72-8b98-44e7-b4fc-e24aed52d9b8', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'side_sheet', 'Side Sheet thickness', 'dropdown', '6mm ST-52', 2, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '43241f5f-4245-46b4-accd-c8be16d8b227', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'headboard', 'Headboard Sheet thickness', 'dropdown', '6mm ST-52', 3, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '68931bf0-1eef-4a76-bf60-4ae7959e6544', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'taildoor', 'Tail Door thickness', 'dropdown', '6mm ST-52', 4, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '63fb4913-fd1f-4875-adf9-a2ed0525799f', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 5, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '5a63debc-b250-4149-bcbb-bd9ae823275d', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'pto', 'Power Take-Off (PTO)', 'checkbox', 'Yes', 6, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '25f6de90-478c-4614-96f3-f500cc2d150a', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'pump', 'Hydraulic Pump Type', 'dropdown', 'Included Gear Pump', 7, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '6b7f3775-dc83-4f05-bc58-2e5e49139b6b', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'lock_system', 'Tail Door Lock System', 'radio', 'Horizontal Lock System', 8, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'e11a181a-1091-43ed-aa1e-78a7b8649840', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 9, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '79532a7e-a15f-4b65-a963-a1df64b0e897', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Surface Treatment', 'dropdown', 'Epoxy Primer + PU Paint', 10, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '3627943e-7241-4d5a-b035-2848a5aad6f5', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'colour', 'Finish Colour', 'text', 'Golden Green', 11, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '74af2e8a-de71-4948-816c-6841637029df', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 12, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '0da30756-5c4b-45bf-ac87-4fc286e27603', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 13, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'f82cd621-7ecc-49d2-88d8-4815b5f66d47', id, 'd2635195-3e9f-4421-b8af-bd62e4d21ea8', 'subframe', 'Subframe', 'dropdown', '6mm', 14, TRUE
  FROM product_templates WHERE key = 'boxbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'e2527a84-8190-4e3a-b32c-f617ec9fffd3', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor Sheet thickness', 'dropdown', '10mm ST-52', 1, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'd6af5142-363f-45c5-b775-17cd3f55cf46', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'side_sheet', 'Side Sheet thickness', 'dropdown', '8mm ST-52', 2, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'c0f128dc-36f5-47f8-9233-07c0a62c413f', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 3, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'f81c8dbb-c71c-4964-bac9-6cf18e9d8b94', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 4, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'fb4f4aaa-a009-4e66-b99f-f02fca72fe7c', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Surface Treatment', 'dropdown', 'Epoxy Primer + PU Paint', 5, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '3b0a3112-b48e-4c40-8e48-27cbf9fc0bd7', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'colour', 'Finish Colour', 'text', 'Crimson Red', 6, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'e20ed685-45ff-481c-9ccd-006cf8df36d1', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 7, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '3f72eb40-d9e4-4ff0-9456-9583fcfbee4e', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 8, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '2c2f51ae-ad62-40d8-a5cf-e30a9ed3cf82', id, 'd2635195-3e9f-4421-b8af-bd62e4d21ea8', 'subframe', 'Subframe', 'dropdown', '6mm', 9, TRUE
  FROM product_templates WHERE key = 'rockbody'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '95497838-fbfa-4fc6-ba39-6329adff5cdc', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor sheet', 'dropdown', '5mm (St52)', 1, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '8168e70e-e68c-4847-97e5-071fd06f227c', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'side_board', 'Side board sheet', 'dropdown', '3mm (St52)', 2, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '4d641f10-940c-4d71-8c7b-040e712b9bfc', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'headboard', 'Head board sheet', 'dropdown', '3mm (St52)', 3, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '73da5e33-258d-4e38-9a74-436f729bfb8d', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'taildoor', 'Tail door sheet', 'dropdown', '3mm (St52)', 4, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '09dc36ae-6b65-45f1-84ce-d63ef0b99658', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 5, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '70360bf2-7970-4514-b93b-9da0da915150', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'runner', 'Runner', 'dropdown', 'ISMC 200 SAIL make', 6, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'aa745a28-9e6d-4481-ae9a-52f10a9ea09d', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 7, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '15636bc4-fb0e-4214-9165-84ad6c8f7b31', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Painting', 'dropdown', 'Epoxy primer and PU top coat Nippon paint', 8, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'c0c7b60f-e8e2-4b48-b31c-35ac0072fb08', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 9, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '4dbf02dc-f1f4-454b-9de6-228810a92517', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 10, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT 'd6feff81-fd16-4120-b593-9a1abeda2b31', id, 'd2635195-3e9f-4421-b8af-bd62e4d21ea8', 'subframe', 'Subframe', 'dropdown', '6mm', 11, TRUE
  FROM product_templates WHERE key = 'rigid28'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '92cab9b5-e06c-4c74-8749-ea5ce41ba81d', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'floor', 'Floor sheet', 'dropdown', '5mm (St52)', 1, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '45f1da1b-1d88-4a71-9dae-7449b0661d0c', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'side_board', 'Side board sheet', 'dropdown', '3mm (St52)', 2, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '2304b307-b764-40ae-b1d6-9d5fbfa1ef7f', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'headboard', 'Head board sheet', 'dropdown', '3mm (St52)', 3, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '8b6e8bff-1783-4056-a71a-1c058396ffa1', id, '7b76d635-dc61-4111-bb01-fb8b9cafb86b', 'taildoor', 'Tail door sheet', 'dropdown', '3mm (St52)', 4, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '1b8c7a51-3389-4a4a-b60d-931c782d75fa', id, '79aed178-2665-41f4-b211-8e9d0b535792', 'cylinder', 'Tipping Cylinder Model', 'dropdown', 'Hyva 175', 5, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '48c8f001-ceeb-48c6-9e7e-acd47678d998', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'runner', 'Runner', 'dropdown', 'ISMC 200 SAIL make', 6, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '41d864ed-af6c-4156-87cd-208c2dcd5500', id, '8921279c-05ed-46c5-a5d1-cffe4d72bcb7', 'landing_leg', 'Landing Leg', 'dropdown', 'York', 7, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '0177e65f-3a7a-41c5-b23e-6317b799e834', id, '43fc5639-d52c-42ba-a270-4fafdc15b18d', 'painting', 'Painting', 'dropdown', 'Epoxy primer and PU top coat Nippon paint', 8, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '74095cd1-d1d4-4988-8571-93ed51a09793', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'marker_lamps', 'Side Lamp', 'dropdown', 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 9, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '4075528a-aa0a-4212-860f-9b3388da0c0b', id, '71615908-e45b-474c-b1a1-77ea512d6a3e', 'supd_rupd', 'SUPD / RUPD Protection', 'dropdown', 'Standard Heavy Duty RTO', 10, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;
INSERT INTO specs (id, template_id, section_id, spec_key, name, control_type, default_value, display_order, enabled)
  SELECT '10b18299-3eb5-4253-8369-561c071d5d2e', id, 'd2635195-3e9f-4421-b8af-bd62e4d21ea8', 'subframe', 'Subframe', 'dropdown', '6mm', 11, TRUE
  FROM product_templates WHERE key = 'rigid30'
  ON CONFLICT (template_id, spec_key) DO NOTHING;

-- Options
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ea251338-0167-46b5-a4fd-d3a52884441e', id, 'ST52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '3a79ad6a-2527-4fff-9283-ec7c32e94027'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b6dccdd2-b6cb-4848-8c55-eb66aa4ca78c', id, 'Hardox 450', 150000, FALSE, 2, TRUE
  FROM specs WHERE id = '3a79ad6a-2527-4fff-9283-ec7c32e94027'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '19fcb093-337c-4121-85bd-099871c6553f', id, 'BSK46', 40000, FALSE, 3, TRUE
  FROM specs WHERE id = '3a79ad6a-2527-4fff-9283-ec7c32e94027'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '80ed92ab-7f84-4ba8-8b78-cdb7a6cce62a', id, 'E450', 60000, FALSE, 4, TRUE
  FROM specs WHERE id = '3a79ad6a-2527-4fff-9283-ec7c32e94027'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a9a9fab4-4b2b-41f9-8536-f46915bff58c', id, 'Custom', 80000, FALSE, 5, TRUE
  FROM specs WHERE id = '3a79ad6a-2527-4fff-9283-ec7c32e94027'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a40c2c38-fa6d-42c5-9439-317c4dffc625', id, '3mm Chequered', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'de2a7150-5943-40d5-986f-4b26333d5947'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '33ebb070-8b1e-41c3-a23e-afeab1dc2542', id, '4mm Plain', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = 'de2a7150-5943-40d5-986f-4b26333d5947'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '958cc37b-f385-4b44-97e4-9c58303bea54', id, '6mm ST52', 45000, FALSE, 3, TRUE
  FROM specs WHERE id = 'de2a7150-5943-40d5-986f-4b26333d5947'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cd02254f-addf-4ce9-a858-06e3712efdac', id, 'Custom', 60000, FALSE, 4, TRUE
  FROM specs WHERE id = 'de2a7150-5943-40d5-986f-4b26333d5947'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '8a91a0cb-ae70-43a8-b5c0-93a64d53e948', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6f2ff414-7417-4427-b6cd-96f9f63f2852', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd6a7e3bf-1645-45e0-88d7-e1fbd6c68a88', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '42074fe4-ec5d-4e5e-9873-c9f5069af3f9', id, 'Hyva 179-5stage', 15000, FALSE, 4, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'f233a6cd-eef7-4965-bad3-e5899bc07887', id, 'Hyva 150-4stage', -25000, FALSE, 5, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'faa9ee83-ec15-4621-9952-60a58f2c74c0', id, 'Wipro Heavy Duty', -10000, FALSE, 6, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b90aea5c-d596-4e97-bfa4-38f13892d47b', id, 'Custom', 20000, FALSE, 7, TRUE
  FROM specs WHERE id = '777b79dc-c7df-4113-af04-61e04d2f2e75'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '16b5409d-4aec-47a1-b729-d26e6e2de9a7', id, 'York 3x13T', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '849a71da-a965-446b-aede-498c0d5af043'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '968ea37d-2686-4589-9951-9b5405d89836', id, 'Fuwa 3x13T', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '849a71da-a965-446b-aede-498c0d5af043'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0c80603e-e11a-4e0d-9cd7-b292d8f564d4', id, 'York 3x16T', 80000, FALSE, 3, TRUE
  FROM specs WHERE id = '849a71da-a965-446b-aede-498c0d5af043'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '146664b6-c20b-4413-ad2d-9d084eeea543', id, 'York 2x13T', -100000, FALSE, 4, TRUE
  FROM specs WHERE id = '849a71da-a965-446b-aede-498c0d5af043'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0c189fc5-a760-466b-8855-f02f757fdcdd', id, 'Custom', 50000, FALSE, 5, TRUE
  FROM specs WHERE id = '849a71da-a965-446b-aede-498c0d5af043'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '17101cea-9ded-4b16-87c2-2ee5a1c56637', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'b1ab6f12-3450-405f-82e8-6bd60876145a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '534325f0-d662-41ed-91f6-9127c624d67f', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = 'b1ab6f12-3450-405f-82e8-6bd60876145a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9fda026f-3e6a-492b-a867-ca5c81627e0e', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = 'b1ab6f12-3450-405f-82e8-6bd60876145a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cdad4fdf-cef1-4665-a665-75fb49dd1433', id, 'Mechanical Leaf Spring', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'f634aa12-8fb6-4bbe-9c2c-bdca3dcefe29'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '649b59f9-32e7-4029-be47-f418b2b138a6', id, 'Air Suspension', 120000, FALSE, 2, TRUE
  FROM specs WHERE id = 'f634aa12-8fb6-4bbe-9c2c-bdca3dcefe29'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '80ad3cc6-a393-4948-8b10-e7db40a15ba8', id, 'Bogie Suspension', 90000, FALSE, 3, TRUE
  FROM specs WHERE id = 'f634aa12-8fb6-4bbe-9c2c-bdca3dcefe29'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2e8f5980-faa8-40ee-bad8-6a18a44e5abe', id, 'Custom', 80000, FALSE, 4, TRUE
  FROM specs WHERE id = 'f634aa12-8fb6-4bbe-9c2c-bdca3dcefe29'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '71c07f33-e1b6-4f9b-82a5-b2e09729fbfd', id, 'WABCO ABS', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'fe7ccb7a-7a09-46c7-bb19-2616cf34cc53'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7809c4db-091c-46a5-a755-f96faa123c32', id, 'BCS EBS', 60000, FALSE, 2, TRUE
  FROM specs WHERE id = 'fe7ccb7a-7a09-46c7-bb19-2616cf34cc53'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'fa6e264e-6092-460b-97ac-3d867876e66d', id, 'Brake Master', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = 'fe7ccb7a-7a09-46c7-bb19-2616cf34cc53'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '52aa6bb8-12cf-414b-8cce-38aa6f9fdb16', id, 'Custom', 40000, FALSE, 4, TRUE
  FROM specs WHERE id = 'fe7ccb7a-7a09-46c7-bb19-2616cf34cc53'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7070964c-4d8e-425a-ac19-cecb537f6bc6', id, 'Steel 10-hole', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'ea59c007-34cf-4750-9e9a-8e5485529694'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e8647753-b0f1-456d-9cbb-cf8eb1d5a041', id, 'Alloy York', 45000, FALSE, 2, TRUE
  FROM specs WHERE id = 'ea59c007-34cf-4750-9e9a-8e5485529694'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd6a439b0-023c-48a8-aa82-d01714d0dc9a', id, 'Custom', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = 'ea59c007-34cf-4750-9e9a-8e5485529694'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9c5078b3-5b6f-4bce-9343-3d2f9c7ece11', id, 'Standard 2-inch JOST', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'b82ca69c-a234-47c7-844c-efdcebe58c5d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e035a439-db37-47ec-abff-26cd0dace5c3', id, 'Heavy Duty 3.5-inch JOST', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = 'b82ca69c-a234-47c7-844c-efdcebe58c5d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2db38829-be11-4691-897a-d20d6980cb7f', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = 'b82ca69c-a234-47c7-844c-efdcebe58c5d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9d4edde0-5a42-4814-97e2-69d80f6f230c', id, 'Apollo 10.00R20', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'd71c877b-985a-4085-b2ab-5b0060d8a94b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a155272f-4aa6-43e3-b548-ebd7cdb2d402', id, 'MRF Musclerok', 12000, FALSE, 2, TRUE
  FROM specs WHERE id = 'd71c877b-985a-4085-b2ab-5b0060d8a94b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2160f22a-5c99-42ee-bd3a-a7cf8bf23a80', id, 'JK Jetsteel', -8000, FALSE, 3, TRUE
  FROM specs WHERE id = 'd71c877b-985a-4085-b2ab-5b0060d8a94b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5655e4a8-8a98-4520-892d-f041ebeb8e02', id, 'Bridgestone', 24000, FALSE, 4, TRUE
  FROM specs WHERE id = 'd71c877b-985a-4085-b2ab-5b0060d8a94b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7f15e283-6fd9-4ba9-af77-54668e27e389', id, 'Custom', 15000, FALSE, 5, TRUE
  FROM specs WHERE id = 'd71c877b-985a-4085-b2ab-5b0060d8a94b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1920ffb6-d239-430a-b030-b6def6c9df01', id, 'Epoxy Primer + PU Paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'fee0b620-5e27-498e-8b17-1fb27b8b0ca9'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ebd5c992-b670-4854-b2d6-699282dc339e', id, 'Epoxy Primer + Epoxy Paint', -15000, FALSE, 2, TRUE
  FROM specs WHERE id = 'fee0b620-5e27-498e-8b17-1fb27b8b0ca9'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '25d571ec-d94b-4cc9-ac58-91751f24d743', id, 'Customer Choice', 0, FALSE, 3, TRUE
  FROM specs WHERE id = 'fee0b620-5e27-498e-8b17-1fb27b8b0ca9'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '14b8cf11-aa46-4a16-b691-70ab298e27c1', id, 'Custom', 20000, FALSE, 4, TRUE
  FROM specs WHERE id = 'fee0b620-5e27-498e-8b17-1fb27b8b0ca9'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0b9a6114-ca14-45c2-9318-cfa814c26694', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '93bfd11c-ceb0-4b02-af17-f557fe1709b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '336b5261-bf90-421e-908f-20ceeab3f8a4', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = '93bfd11c-ceb0-4b02-af17-f557fe1709b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3b55c97b-bbd1-4011-95b8-2d34e07dbd1d', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = '93bfd11c-ceb0-4b02-af17-f557fe1709b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'bebd45ca-ccf4-4d84-bea5-af9d34087819', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '453b4c14-c4fb-4beb-a49b-d4b4af5ac6f4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4e1936d6-23a9-4430-9067-0c2823ea9e40', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = '453b4c14-c4fb-4beb-a49b-d4b4af5ac6f4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd574a137-b1fb-4496-b38b-5f810225e77e', id, 'ST52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '123b1b57-30f6-4d30-8fb2-251177278cb4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '83e4d2bb-9668-400b-a407-c47c575a7467', id, 'Hardox 450', 150000, FALSE, 2, TRUE
  FROM specs WHERE id = '123b1b57-30f6-4d30-8fb2-251177278cb4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a4e49a91-f482-44a9-b538-4bc3b839fbd0', id, 'BSK46', 40000, FALSE, 3, TRUE
  FROM specs WHERE id = '123b1b57-30f6-4d30-8fb2-251177278cb4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'bbbde2ac-fb1c-4233-880c-99007716a31e', id, 'E450', 60000, FALSE, 4, TRUE
  FROM specs WHERE id = '123b1b57-30f6-4d30-8fb2-251177278cb4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '910f5ec1-fcec-43f3-b6c3-416a9064884e', id, 'Custom', 80000, FALSE, 5, TRUE
  FROM specs WHERE id = '123b1b57-30f6-4d30-8fb2-251177278cb4'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9089583a-b25d-410c-8cfb-20de54dc6778', id, '3mm Chequered', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'bc99bb16-757a-4c23-acf1-780206369779'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'f64e1bf2-1632-45d4-8022-caadb69f54ec', id, '4mm Plain', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = 'bc99bb16-757a-4c23-acf1-780206369779'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7c94ef0e-db8e-46cb-a5f5-d9f62768974a', id, '6mm ST52', 45000, FALSE, 3, TRUE
  FROM specs WHERE id = 'bc99bb16-757a-4c23-acf1-780206369779'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'dd5a35c3-346a-416b-8f9c-2aaca5fd319b', id, 'Custom', 60000, FALSE, 4, TRUE
  FROM specs WHERE id = 'bc99bb16-757a-4c23-acf1-780206369779'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '28ec3f8f-e417-4313-a7c9-f7906cde4116', id, '1.5mm Corrugated', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '955d7e64-f00b-4849-b952-6cef427db96b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cd83ddd5-0a3e-48f5-9b6b-2926e42179be', id, '2mm Corrugated', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = '955d7e64-f00b-4849-b952-6cef427db96b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7e5b13f9-698d-452f-8174-a052dfcb6364', id, 'Custom', 40000, FALSE, 3, TRUE
  FROM specs WHERE id = '955d7e64-f00b-4849-b952-6cef427db96b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '582ba6d3-d189-4bc7-a7dc-e56b91d06bed', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7d2d701c-8f0a-47d5-bcd0-e8b8b4345fad', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '747273a9-28da-4a0e-a370-3415fb190e3c', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'db895e95-8a22-4b9e-a460-03793dc16bf1', id, 'Hyva 179-5stage', 15000, FALSE, 4, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c920a36e-a74a-442c-b5e0-fe75b1ad0e1e', id, 'Hyva 150-4stage', -25000, FALSE, 5, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd7d7957a-b41b-451d-bcd3-41ce4d29a0a7', id, 'Wipro Heavy Duty', -10000, FALSE, 6, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a0bf85df-0e3b-4082-b92f-8f994cff6e18', id, 'Custom', 20000, FALSE, 7, TRUE
  FROM specs WHERE id = '9a15898d-5b18-4b93-bbe7-076024c4592d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3f3bb59c-85d0-4767-835f-2ced692fbfb7', id, 'York 3x13T', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '06af9692-5f1b-4a3b-9f28-9adafbf85c70'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c1b0c6ab-04f1-4a56-8b72-4721e5c1f6e2', id, 'Fuwa 3x13T', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '06af9692-5f1b-4a3b-9f28-9adafbf85c70'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '64c231b4-087a-4122-b549-dccd2a8783e1', id, 'York 3x16T', 80000, FALSE, 3, TRUE
  FROM specs WHERE id = '06af9692-5f1b-4a3b-9f28-9adafbf85c70'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '653d35f2-af4a-452d-9299-bac972feca48', id, 'York 2x13T', -100000, FALSE, 4, TRUE
  FROM specs WHERE id = '06af9692-5f1b-4a3b-9f28-9adafbf85c70'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5997ef29-a230-46e7-88b2-58577b8a3ffd', id, 'Custom', 50000, FALSE, 5, TRUE
  FROM specs WHERE id = '06af9692-5f1b-4a3b-9f28-9adafbf85c70'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2363fd9e-fd3c-4368-9f94-64e08943e703', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '18128a18-b221-4ae7-bf9b-dc5e61bcff7c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'adf56d9f-701b-4380-894b-e5c6f7593068', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '18128a18-b221-4ae7-bf9b-dc5e61bcff7c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '87db02bc-cc8e-4881-8abb-3f61aef55fd4', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '18128a18-b221-4ae7-bf9b-dc5e61bcff7c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '39771cae-6774-465f-bafe-31c59cc59537', id, 'Mechanical Leaf Spring', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'be42f3a2-a498-4253-8e0e-e3824388d4b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a7e0c426-a6fb-4485-a218-44cfb46e0d96', id, 'Air Suspension', 120000, FALSE, 2, TRUE
  FROM specs WHERE id = 'be42f3a2-a498-4253-8e0e-e3824388d4b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '176bd772-1866-479c-b0d1-34c1d2a26471', id, 'Bogie Suspension', 90000, FALSE, 3, TRUE
  FROM specs WHERE id = 'be42f3a2-a498-4253-8e0e-e3824388d4b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e56d1bba-590e-4291-a4f0-66d073200952', id, 'Custom', 80000, FALSE, 4, TRUE
  FROM specs WHERE id = 'be42f3a2-a498-4253-8e0e-e3824388d4b5'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6f6d0301-e3eb-4cf9-98d2-63cc9bebc87e', id, 'WABCO ABS', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '3b91df4e-b8c3-4c78-8351-7d605543f77d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '23cb6519-ee6b-4251-ac71-98c711a8d969', id, 'BCS EBS', 60000, FALSE, 2, TRUE
  FROM specs WHERE id = '3b91df4e-b8c3-4c78-8351-7d605543f77d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ff038b48-eba8-4b88-a8fb-3905a84beb39', id, 'Brake Master', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '3b91df4e-b8c3-4c78-8351-7d605543f77d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd1cd2bc7-a712-4f1f-bd50-8f8b4d84e954', id, 'Custom', 40000, FALSE, 4, TRUE
  FROM specs WHERE id = '3b91df4e-b8c3-4c78-8351-7d605543f77d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1cd86009-4717-4eea-b291-4ad728e0ce2a', id, 'Apollo 10.00R20', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '6709c039-43d2-4dd2-bd5c-a8d171335483'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '8095e220-f765-4a52-b42c-d4c97040db23', id, 'MRF Musclerok', 12000, FALSE, 2, TRUE
  FROM specs WHERE id = '6709c039-43d2-4dd2-bd5c-a8d171335483'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e90a2eba-ae3d-4106-8464-6adcf678b7d3', id, 'JK Jetsteel', -8000, FALSE, 3, TRUE
  FROM specs WHERE id = '6709c039-43d2-4dd2-bd5c-a8d171335483'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7a6a561d-c6ad-4bd9-81de-f40afe0d9ff9', id, 'Bridgestone', 24000, FALSE, 4, TRUE
  FROM specs WHERE id = '6709c039-43d2-4dd2-bd5c-a8d171335483'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cb3a2811-938d-48b7-81e1-bc0aab0e63c0', id, 'Custom', 15000, FALSE, 5, TRUE
  FROM specs WHERE id = '6709c039-43d2-4dd2-bd5c-a8d171335483'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cf32a853-076b-46ff-87ec-361440c2a8f8', id, 'Epoxy Primer + PU Paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'b821853e-2dab-4184-9e74-d7dcf453d63c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a8057438-e3e2-4d1c-b879-e3fc9e5bc94a', id, 'Epoxy Primer + Epoxy Paint', -15000, FALSE, 2, TRUE
  FROM specs WHERE id = 'b821853e-2dab-4184-9e74-d7dcf453d63c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7dfed6d8-4a55-4ad4-86c5-783997c06914', id, 'Customer Choice', 0, FALSE, 3, TRUE
  FROM specs WHERE id = 'b821853e-2dab-4184-9e74-d7dcf453d63c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1dc258c9-444f-45cb-bdd5-cd74233d2525', id, 'Custom', 20000, FALSE, 4, TRUE
  FROM specs WHERE id = 'b821853e-2dab-4184-9e74-d7dcf453d63c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cbcb11be-810a-459b-9805-27970be1e3d9', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '3a7a4af7-222b-4484-8bc4-843431e05ae0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '35e1cc04-3e05-4c5f-813d-50a7213e3539', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = '3a7a4af7-222b-4484-8bc4-843431e05ae0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9a65f885-84d8-4dfb-98e8-2eccf5cee6e7', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = '3a7a4af7-222b-4484-8bc4-843431e05ae0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '44681826-719b-4ac7-8c1d-8a23c70c02ad', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '4cadd4a4-5223-4727-8302-cbd6bc5630e0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c2388754-2e69-4932-b020-b4f597f610e9', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = '4cadd4a4-5223-4727-8302-cbd6bc5630e0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9a2a6dc2-ddab-4151-b946-9a884560cead', id, 'ST52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'f1f043b1-9ab6-453f-8a2b-eef4ecbfe2e3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '51af99fb-4485-4053-a98a-433ccdcccfaa', id, 'Hardox 450', 150000, FALSE, 2, TRUE
  FROM specs WHERE id = 'f1f043b1-9ab6-453f-8a2b-eef4ecbfe2e3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6f97c46f-eb40-4691-8a4f-41bbed27d3a3', id, 'BSK46', 40000, FALSE, 3, TRUE
  FROM specs WHERE id = 'f1f043b1-9ab6-453f-8a2b-eef4ecbfe2e3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5f9fcbb0-505e-4688-9945-000670b40364', id, 'E450', 60000, FALSE, 4, TRUE
  FROM specs WHERE id = 'f1f043b1-9ab6-453f-8a2b-eef4ecbfe2e3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '31886c41-9775-4223-ac86-4c40dcd580f5', id, 'Custom', 80000, FALSE, 5, TRUE
  FROM specs WHERE id = 'f1f043b1-9ab6-453f-8a2b-eef4ecbfe2e3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '8dfb3eb1-e9e6-4f28-b444-a84e0bb39e46', id, '6mm MS', -15000, FALSE, 1, TRUE
  FROM specs WHERE id = '506e896d-86e2-4a8a-b4e1-3e7761f95489'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c9bb5820-9ddf-4979-998a-66589612e0af', id, '8mm ST-52', 0, TRUE, 2, TRUE
  FROM specs WHERE id = '506e896d-86e2-4a8a-b4e1-3e7761f95489'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '40acbbfa-75d9-4f3e-927b-4cb4550d56cd', id, '10mm ST-52', 30000, FALSE, 3, TRUE
  FROM specs WHERE id = '506e896d-86e2-4a8a-b4e1-3e7761f95489'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9d7ffa64-33c6-4dcb-bbc0-a819ee1dcdcb', id, 'Custom', 45000, FALSE, 4, TRUE
  FROM specs WHERE id = '506e896d-86e2-4a8a-b4e1-3e7761f95489'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1c791718-1dd2-41a7-8a72-892c09d62021', id, '4mm MS', -10000, FALSE, 1, TRUE
  FROM specs WHERE id = 'b741b768-822b-4b6d-a5de-21dbee2ecc55'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b9e7f7f6-bace-41c8-98d2-1e33b52f0b06', id, '6mm ST-52', 0, TRUE, 2, TRUE
  FROM specs WHERE id = 'b741b768-822b-4b6d-a5de-21dbee2ecc55'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3d59bbee-d450-4ec7-9626-54ed1f37dc40', id, '8mm ST-52', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = 'b741b768-822b-4b6d-a5de-21dbee2ecc55'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1fa38a98-6eff-4829-bd10-3d0bcb50f987', id, 'Custom', 40000, FALSE, 4, TRUE
  FROM specs WHERE id = 'b741b768-822b-4b6d-a5de-21dbee2ecc55'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd8b230f4-edce-48ef-8029-05cdc807fd25', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd3dd1d22-5341-455e-b92c-342c71600ab9', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'bc148bab-f4ff-4618-8efe-0839a71f0b46', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd1f9e139-c357-4330-9f75-bc64f81f5fba', id, 'Hyva 179-5stage', 15000, FALSE, 4, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ee6257f1-ff8d-4d1f-b49c-d2e86353e444', id, 'Hyva 150-4stage', -25000, FALSE, 5, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '756fac87-f8df-4679-ab74-42a2e47193ee', id, 'Wipro Heavy Duty', -10000, FALSE, 6, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ee12de14-37a8-4ed3-ab8a-e7aa69b9bd47', id, 'Custom', 20000, FALSE, 7, TRUE
  FROM specs WHERE id = '940b4036-3898-4fe5-becb-72a6d5167693'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '94de884d-43d3-4acd-b6e9-a6bbf823701a', id, 'York 3x13T', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '03f4264a-4bc7-4fe6-bbf5-62e4574a73c0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0f4e55ce-a367-4262-b222-9250abd9b869', id, 'York 3x16T', 80000, FALSE, 2, TRUE
  FROM specs WHERE id = '03f4264a-4bc7-4fe6-bbf5-62e4574a73c0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5792091f-ef3e-4c64-98a1-6edd2b496541', id, 'York 2x13T', -100000, FALSE, 3, TRUE
  FROM specs WHERE id = '03f4264a-4bc7-4fe6-bbf5-62e4574a73c0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ce273e02-464e-490a-b20e-99989c5794e7', id, 'Custom', 40000, FALSE, 4, TRUE
  FROM specs WHERE id = '03f4264a-4bc7-4fe6-bbf5-62e4574a73c0'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '634d21a6-0ef8-4573-92bb-ea2f729193e3', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '2cb57bc4-3e87-4040-8ddc-620dbc679cc2'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '392e8e05-eb14-4191-bba1-7fed13bb0c20', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '2cb57bc4-3e87-4040-8ddc-620dbc679cc2'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '784f73a7-04de-45db-b2f1-99e257ec453b', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '2cb57bc4-3e87-4040-8ddc-620dbc679cc2'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'da7dbff8-bdaa-43b4-bd95-285822f4c237', id, 'Epoxy Primer + PU Paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '014377fd-d466-4c5a-9b49-858cd3926b1a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6a170eaf-6ae6-469e-beb5-860c8a94e9b2', id, 'Epoxy Primer + Epoxy Paint', -15000, FALSE, 2, TRUE
  FROM specs WHERE id = '014377fd-d466-4c5a-9b49-858cd3926b1a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'edb6903c-d64e-4378-8916-1d62a805e93e', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '014377fd-d466-4c5a-9b49-858cd3926b1a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9802f80a-d17d-4a93-8c2b-759b3f8ff830', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '77688b00-b1f9-4ae7-80c2-2250ec62d32e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e096d1f8-d8e4-4876-b4da-fe6c7159095e', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = '77688b00-b1f9-4ae7-80c2-2250ec62d32e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'baec6b37-75c8-4898-aa08-af931e41b963', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = '77688b00-b1f9-4ae7-80c2-2250ec62d32e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0b26bce0-7c92-41ba-800d-122c461209ad', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'b44843f4-5290-44a6-bf33-f328aa654b15'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5c960a51-958c-485c-90d6-bb9d35594dcd', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = 'b44843f4-5290-44a6-bf33-f328aa654b15'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c38ad66c-c86b-4d99-9b54-e805bf2a8258', id, '6mm MS', -15000, FALSE, 1, TRUE
  FROM specs WHERE id = '72465f9d-023a-4aa1-99cc-40ceba17606a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e4a171d4-958f-4cfb-a626-8386b4855e57', id, '8mm ST-52', 0, TRUE, 2, TRUE
  FROM specs WHERE id = '72465f9d-023a-4aa1-99cc-40ceba17606a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3484f649-546e-4c2f-81c5-152ff768a6fe', id, '10mm ST-52', 30000, FALSE, 3, TRUE
  FROM specs WHERE id = '72465f9d-023a-4aa1-99cc-40ceba17606a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '36b2ff91-1bd5-4658-a4f2-80dd8435ec8b', id, 'Custom', 45000, FALSE, 4, TRUE
  FROM specs WHERE id = '72465f9d-023a-4aa1-99cc-40ceba17606a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e4b96676-4579-46b1-b251-54736c13187f', id, '4mm MS', -10000, FALSE, 1, TRUE
  FROM specs WHERE id = '1cc7ea72-8b98-44e7-b4fc-e24aed52d9b8'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1c1f2837-3e31-4b32-b4d5-8c798af9e6a0', id, '6mm ST-52', 0, TRUE, 2, TRUE
  FROM specs WHERE id = '1cc7ea72-8b98-44e7-b4fc-e24aed52d9b8'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b71b7e61-4511-4922-89e7-30fade740865', id, '8mm ST-52', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = '1cc7ea72-8b98-44e7-b4fc-e24aed52d9b8'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3e1773e4-239b-4131-b911-70844642423a', id, 'Custom', 40000, FALSE, 4, TRUE
  FROM specs WHERE id = '1cc7ea72-8b98-44e7-b4fc-e24aed52d9b8'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4967e7e3-7322-4f91-9395-7ae10204cbe9', id, '6mm ST-52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '43241f5f-4245-46b4-accd-c8be16d8b227'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1b620156-c5b3-4765-b511-6c02ea567ea2', id, '8mm ST-52', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = '43241f5f-4245-46b4-accd-c8be16d8b227'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6ed31427-573f-4312-b032-c32481d4cace', id, 'Custom', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = '43241f5f-4245-46b4-accd-c8be16d8b227'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cac3b895-bd5c-4830-a6a1-0b69d52862be', id, '6mm ST-52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '68931bf0-1eef-4a76-bf60-4ae7959e6544'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ebcb0a89-fd92-4be3-b05e-7f53fc208c33', id, '8mm ST-52', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = '68931bf0-1eef-4a76-bf60-4ae7959e6544'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd0fb90f4-de62-412f-9269-d39f127d8788', id, 'Custom', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = '68931bf0-1eef-4a76-bf60-4ae7959e6544'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'bf462dfe-1ee6-450f-b745-07fffdf7524f', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3ad9f0bd-ef22-4608-8dea-05dc11ca469b', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'f54b0065-3440-4d6a-9d36-c492c310cd2d', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '31b8fa94-cfc3-4d8b-95a0-d15b1066bedb', id, 'Hyva 150-4stage-4520', 0, FALSE, 4, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2ed72deb-a850-4533-a953-87d3f8007389', id, 'Hyva 179-5stage', 35000, FALSE, 5, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '20ef555b-e285-47cc-8f4f-7e701fe2cda8', id, 'Wipro Heavy Duty', 10000, FALSE, 6, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '8f135be4-252e-47f1-b0db-22946499ec67', id, 'Custom', 20000, FALSE, 7, TRUE
  FROM specs WHERE id = '63fb4913-fd1f-4875-adf9-a2ed0525799f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a4d5f560-ae75-45ce-915c-723bf3243723', id, 'Yes', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '5a63debc-b250-4149-bcbb-bd9ae823275d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'af02275c-b0a2-4b14-a4eb-0c05825ccbbe', id, 'No', -12000, FALSE, 2, TRUE
  FROM specs WHERE id = '5a63debc-b250-4149-bcbb-bd9ae823275d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1f9b76d8-ab12-4574-b80e-942bfc2330b3', id, 'Included Gear Pump', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '25f6de90-478c-4614-96f3-f500cc2d150a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '143ac935-2680-419d-b5f3-5218d947a834', id, 'Included Piston Pump', 28000, FALSE, 2, TRUE
  FROM specs WHERE id = '25f6de90-478c-4614-96f3-f500cc2d150a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '829a6991-ec02-40bd-8e12-f41adad846cd', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '25f6de90-478c-4614-96f3-f500cc2d150a'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c2eef9f7-a71d-4888-892e-94043a0713bb', id, 'Horizontal Lock System', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '6b7f3775-dc83-4f05-bc58-2e5e49139b6b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '57cc2c48-862a-469e-9d1c-0061ce5da3f6', id, 'Manual Lock', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '6b7f3775-dc83-4f05-bc58-2e5e49139b6b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd4b5a8b2-3b00-4553-9660-0f5ef60e5935', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '6b7f3775-dc83-4f05-bc58-2e5e49139b6b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '74826e20-dc87-431d-9f0f-d398bf5a8c9d', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'e11a181a-1091-43ed-aa1e-78a7b8649840'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '45d0e93e-9340-4397-bf9b-530d2ba71b20', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = 'e11a181a-1091-43ed-aa1e-78a7b8649840'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '519c9793-0372-496b-9b69-36923ea2a182', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = 'e11a181a-1091-43ed-aa1e-78a7b8649840'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd8f3f978-988d-4c67-8b45-ea48c5001d94', id, 'Epoxy Primer + PU Paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '79532a7e-a15f-4b65-a963-a1df64b0e897'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cb6c44b9-2673-49ca-b22b-2dcfcdebcb3b', id, 'Epoxy Primer + Epoxy Paint', -15000, FALSE, 2, TRUE
  FROM specs WHERE id = '79532a7e-a15f-4b65-a963-a1df64b0e897'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c2937bcd-a940-4db1-90f6-22885fdf4d82', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '79532a7e-a15f-4b65-a963-a1df64b0e897'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4f54e5ad-8eb5-4b9c-a772-0db41c734718', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '74af2e8a-de71-4948-816c-6841637029df'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4b63d216-42bb-4cb0-8648-d7a71fa30d1c', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = '74af2e8a-de71-4948-816c-6841637029df'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2d8112fa-b111-4b72-b679-099e81b39da3', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = '74af2e8a-de71-4948-816c-6841637029df'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'dc54ea19-d88e-42d0-bc6f-d24e2909259a', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '0da30756-5c4b-45bf-ac87-4fc286e27603'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '14f856c3-f61b-4718-b649-f41d34c67486', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = '0da30756-5c4b-45bf-ac87-4fc286e27603'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '8dccf77e-778c-40ef-9b0e-2d897400b2ef', id, '6mm', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'f82cd621-7ecc-49d2-88d8-4815b5f66d47'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ed5dc5b6-ae7e-49ec-bfe5-f134564d8f84', id, '8mm', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = 'f82cd621-7ecc-49d2-88d8-4815b5f66d47'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5406d70f-ec0a-46bd-a338-79cf94c086bc', id, 'Custom', 30000, FALSE, 3, TRUE
  FROM specs WHERE id = 'f82cd621-7ecc-49d2-88d8-4815b5f66d47'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd7ba63e9-b3cb-449f-a6e8-a391f66eb4ec', id, '10mm ST-52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'e2527a84-8190-4e3a-b32c-f617ec9fffd3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '8372aa78-42c0-48b1-a324-622f1d58fb3e', id, '12mm Hardox 450', 180000, FALSE, 2, TRUE
  FROM specs WHERE id = 'e2527a84-8190-4e3a-b32c-f617ec9fffd3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a9fbfc70-891a-4a0a-9e2c-84fe528be69e', id, 'Custom', 80000, FALSE, 3, TRUE
  FROM specs WHERE id = 'e2527a84-8190-4e3a-b32c-f617ec9fffd3'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd7cd4dc5-7363-44dc-87c8-62b5fa2df54f', id, '8mm ST-52', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'd6af5142-363f-45c5-b775-17cd3f55cf46'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '031c37e1-0b23-4286-adf3-38ded817cfa9', id, '10mm Hardox 450', 120000, FALSE, 2, TRUE
  FROM specs WHERE id = 'd6af5142-363f-45c5-b775-17cd3f55cf46'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'da1c4702-bb01-46e9-a1fc-f9542b672527', id, 'Custom', 60000, FALSE, 3, TRUE
  FROM specs WHERE id = 'd6af5142-363f-45c5-b775-17cd3f55cf46'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'f6bc267f-4e5f-44ba-a691-20c368c6fca7', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'c0f128dc-36f5-47f8-9233-07c0a62c413f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4dc18f0a-5afe-4f4d-9743-b81f7409b073', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = 'c0f128dc-36f5-47f8-9233-07c0a62c413f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1eca1856-0bb3-4bde-af5f-f68562115f0f', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = 'c0f128dc-36f5-47f8-9233-07c0a62c413f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '71904e06-0e31-44a7-b950-955b92c8ced1', id, 'Hyva 179-5stage', 15000, FALSE, 4, TRUE
  FROM specs WHERE id = 'c0f128dc-36f5-47f8-9233-07c0a62c413f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3ccb65ce-7510-46b5-9ad0-64bdc1e06ef5', id, 'Hyva 150-4stage', -25000, FALSE, 5, TRUE
  FROM specs WHERE id = 'c0f128dc-36f5-47f8-9233-07c0a62c413f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'dcf15f63-7fa9-49ad-81fe-0ba368c8d226', id, 'Custom', 20000, FALSE, 6, TRUE
  FROM specs WHERE id = 'c0f128dc-36f5-47f8-9233-07c0a62c413f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c8e1103b-0cf1-4fb5-95a6-f28e165d8034', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'f81c8dbb-c71c-4964-bac9-6cf18e9d8b94'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '225cc2d1-afc1-41f7-900f-3da95bce04ec', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = 'f81c8dbb-c71c-4964-bac9-6cf18e9d8b94'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7d563858-ad55-4b9d-a55f-a109556724e9', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = 'f81c8dbb-c71c-4964-bac9-6cf18e9d8b94'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '462ba87a-7f05-49ab-b0c7-e75bab1de412', id, 'Epoxy Primer + PU Paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'fb4f4aaa-a009-4e66-b99f-f02fca72fe7c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '075ab43e-d659-4131-8b82-d7e1342a6df4', id, 'Epoxy Primer + Epoxy Paint', -15000, FALSE, 2, TRUE
  FROM specs WHERE id = 'fb4f4aaa-a009-4e66-b99f-f02fca72fe7c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '193dfd92-5fa3-435d-81a9-91e5a28ff991', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = 'fb4f4aaa-a009-4e66-b99f-f02fca72fe7c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5ea0f66d-b1d7-446d-baec-6f4a47601c96', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'e20ed685-45ff-481c-9ccd-006cf8df36d1'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'baf3e46a-3398-478d-bc5c-879e11e4b78b', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = 'e20ed685-45ff-481c-9ccd-006cf8df36d1'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1505b638-05f9-4165-af07-caea4a656890', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = 'e20ed685-45ff-481c-9ccd-006cf8df36d1'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2042bd2c-c683-4a32-beec-77d955666db8', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '3f72eb40-d9e4-4ff0-9456-9583fcfbee4e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'bbe25c2f-b490-4066-8644-b1df07923c45', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = '3f72eb40-d9e4-4ff0-9456-9583fcfbee4e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd9b6228d-651a-4403-9227-815933996a0c', id, '6mm', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '2c2f51ae-ad62-40d8-a5cf-e30a9ed3cf82'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '517737fd-73e5-40e1-b07a-fb2c6f4cd7eb', id, '8mm', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = '2c2f51ae-ad62-40d8-a5cf-e30a9ed3cf82'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0bd44a38-4f15-476c-b819-e5ac99e56265', id, 'Custom', 30000, FALSE, 3, TRUE
  FROM specs WHERE id = '2c2f51ae-ad62-40d8-a5cf-e30a9ed3cf82'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cff7a08c-ba77-411b-a2f5-104a3f8e55d1', id, '5mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '95497838-fbfa-4fc6-ba39-6329adff5cdc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'd2595b33-63ba-4928-8007-7923537225b6', id, '6mm (St52)', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = '95497838-fbfa-4fc6-ba39-6329adff5cdc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '06aec99f-aff0-4077-98f6-fd7ee0b4e32c', id, '3mm Chequered', -15000, FALSE, 3, TRUE
  FROM specs WHERE id = '95497838-fbfa-4fc6-ba39-6329adff5cdc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9ae5a3ba-4b3f-45c2-b65e-9af47f20ab46', id, 'Custom', 30000, FALSE, 4, TRUE
  FROM specs WHERE id = '95497838-fbfa-4fc6-ba39-6329adff5cdc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6d7c76b3-3858-475b-b167-32c1edf232f9', id, '3mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '8168e70e-e68c-4847-97e5-071fd06f227c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b8c7e13c-8fc7-448a-ba28-d7e70d30a057', id, '4mm (St52)', 18000, FALSE, 2, TRUE
  FROM specs WHERE id = '8168e70e-e68c-4847-97e5-071fd06f227c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '04d484f5-f51b-4d8f-bf18-27d69260b5ca', id, 'Custom', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = '8168e70e-e68c-4847-97e5-071fd06f227c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '52d0c506-a08f-49f1-b675-47eea4f3d0ba', id, '3mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '4d641f10-940c-4d71-8c7b-040e712b9bfc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'f2bc8d21-2732-4530-8e23-69e79d57f870', id, '4mm (St52)', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = '4d641f10-940c-4d71-8c7b-040e712b9bfc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '985678e2-ae27-4846-9da6-5c4c5f4d2611', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '4d641f10-940c-4d71-8c7b-040e712b9bfc'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '399bb265-f045-4b0b-b4d9-d65b6443920f', id, '3mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '73da5e33-258d-4e38-9a74-436f729bfb8d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '246d809f-8f34-4d9e-be69-6f3180181cce', id, '4mm (St52)', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = '73da5e33-258d-4e38-9a74-436f729bfb8d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'fe45570a-15ef-4db8-b097-03fb41f4575d', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '73da5e33-258d-4e38-9a74-436f729bfb8d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3866c3bc-9bdc-4f75-a01b-ada8b310da70', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a5b1b9b0-2329-41e6-89df-252ee26cdb4c', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'dd0b1848-d2d6-4670-9621-9dda96e81d83', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'abc00ab4-6e4d-499f-a11c-6389762f1395', id, 'Hyva 179-5stage', 15000, FALSE, 4, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '7950a947-5b7b-4622-a7b5-312a8c72b70e', id, 'Hyva 150-4stage', -25000, FALSE, 5, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c221ea83-ab97-45fe-b67a-4922c8e90a25', id, 'Wipro Heavy Duty', -10000, FALSE, 6, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '13e12012-088a-491c-acc4-7fa0110132e1', id, 'Custom', 20000, FALSE, 7, TRUE
  FROM specs WHERE id = '09dc36ae-6b65-45f1-84ce-d63ef0b99658'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4463c0d6-9bfe-4779-82cb-2a9655b06c7d', id, 'ISMC 200 SAIL make', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '70360bf2-7970-4514-b93b-9da0da915150'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b4e7859e-8565-4ce0-abc1-c8642a9a5c2c', id, 'ISMC 175', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '70360bf2-7970-4514-b93b-9da0da915150'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0cff8f14-d9c4-44d9-8c52-43e98f92ee0c', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '70360bf2-7970-4514-b93b-9da0da915150'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'cfe9b5bf-b35c-4cda-9249-88ba505ef140', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'aa745a28-9e6d-4481-ae9a-52f10a9ea09d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2efc3821-8878-45e6-8021-74868aa38a90', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = 'aa745a28-9e6d-4481-ae9a-52f10a9ea09d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '4bc5a2e8-e670-45de-a192-870fd1061851', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = 'aa745a28-9e6d-4481-ae9a-52f10a9ea09d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2df0aa61-06ac-449f-a8dc-c1cdab12745e', id, 'Epoxy primer and PU top coat Nippon paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '15636bc4-fb0e-4214-9165-84ad6c8f7b31'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3100c544-7ebf-48cd-a3fe-2afd99fa67ce', id, 'Epoxy primer and Epoxy paint', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '15636bc4-fb0e-4214-9165-84ad6c8f7b31'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0039d7f5-a0bf-4a88-b355-60482d66c356', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '15636bc4-fb0e-4214-9165-84ad6c8f7b31'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ad43952a-bd9a-4fd9-bb74-78b4a930e89e', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'c0c7b60f-e8e2-4b48-b31c-35ac0072fb08'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '600b07b6-ce2c-4bc2-8a2a-09767816becb', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = 'c0c7b60f-e8e2-4b48-b31c-35ac0072fb08'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3a22ffef-a12d-47f1-b400-a1aaa4dbd519', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = 'c0c7b60f-e8e2-4b48-b31c-35ac0072fb08'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '2c24f51b-08f9-417b-9794-d67d873cd26b', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '4dbf02dc-f1f4-454b-9de6-228810a92517'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '382728ce-3d48-4e3e-81e9-00886cd0af13', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = '4dbf02dc-f1f4-454b-9de6-228810a92517'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1fe3a126-9cdf-4929-a8cf-74132b00c42f', id, '6mm', 0, TRUE, 1, TRUE
  FROM specs WHERE id = 'd6feff81-fd16-4120-b593-9a1abeda2b31'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b8561bc3-58e5-4364-95d5-f757c8194099', id, '8mm', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = 'd6feff81-fd16-4120-b593-9a1abeda2b31'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ee2aa50e-006c-4e03-ad73-480ba86e6c11', id, 'Custom', 30000, FALSE, 3, TRUE
  FROM specs WHERE id = 'd6feff81-fd16-4120-b593-9a1abeda2b31'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c49a7f68-8a35-455d-b39d-3f2496c49179', id, '5mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '92cab9b5-e06c-4c74-8749-ea5ce41ba81d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '234dc7bf-a403-4745-9c3b-6a0908712734', id, '6mm (St52)', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = '92cab9b5-e06c-4c74-8749-ea5ce41ba81d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '78041033-bd88-443c-b6c6-c9bd83475844', id, '3mm Chequered', -15000, FALSE, 3, TRUE
  FROM specs WHERE id = '92cab9b5-e06c-4c74-8749-ea5ce41ba81d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '93c41f11-5bd4-4940-b2a5-93e36b3c21f4', id, 'Custom', 30000, FALSE, 4, TRUE
  FROM specs WHERE id = '92cab9b5-e06c-4c74-8749-ea5ce41ba81d'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'a5b5603e-eea3-4b9c-8efc-476abcc915d6', id, '3mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '45f1da1b-1d88-4a71-9dae-7449b0661d0c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'e7dc8cfa-9b52-4000-b001-55c6d70d9979', id, '4mm (St52)', 18000, FALSE, 2, TRUE
  FROM specs WHERE id = '45f1da1b-1d88-4a71-9dae-7449b0661d0c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0986fd10-e8bf-4201-a73a-38684bbc4f3e', id, 'Custom', 25000, FALSE, 3, TRUE
  FROM specs WHERE id = '45f1da1b-1d88-4a71-9dae-7449b0661d0c'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'bd974762-e19e-4459-a967-e1df95269387', id, '3mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '2304b307-b764-40ae-b1d6-9d5fbfa1ef7f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '454b58d1-655e-486a-86a8-8ea6045d5b1f', id, '4mm (St52)', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = '2304b307-b764-40ae-b1d6-9d5fbfa1ef7f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1b9bf9d4-0342-449b-a749-8787dbf9c6de', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '2304b307-b764-40ae-b1d6-9d5fbfa1ef7f'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c879823c-7590-4542-bb1a-19af3efab955', id, '3mm (St52)', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '8b6e8bff-1783-4056-a71a-1c058396ffa1'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c46098b8-1553-448d-9966-a664ddd92b77', id, '4mm (St52)', 15000, FALSE, 2, TRUE
  FROM specs WHERE id = '8b6e8bff-1783-4056-a71a-1c058396ffa1'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '14f975cb-09cb-4cb0-a20d-52cb7266d192', id, 'Custom', 20000, FALSE, 3, TRUE
  FROM specs WHERE id = '8b6e8bff-1783-4056-a71a-1c058396ffa1'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1d035e5f-7909-442e-869c-fab23cd9c1c7', id, 'Hyva 175', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ba0b0c23-db12-4bb4-8641-fc24308b01a8', id, 'Hydromen 175', 0, FALSE, 2, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'f0478d30-5ce8-429e-9e49-2438cbba7039', id, 'Wipro 175', 0, FALSE, 3, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '92e1008c-dc88-4f96-907c-35bfeff5ccc6', id, 'Hyva 179-5stage', 15000, FALSE, 4, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'b0b3ebf6-6fe0-4650-8c21-e944ab82a044', id, 'Hyva 150-4stage', -25000, FALSE, 5, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '780c8f73-be0a-4f39-8e52-3af6c94e7881', id, 'Wipro Heavy Duty', -10000, FALSE, 6, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '0ed41afd-a3b7-4ae8-8dd3-116094d6a149', id, 'Custom', 20000, FALSE, 7, TRUE
  FROM specs WHERE id = '1b8c7a51-3389-4a4a-b60d-931c782d75fa'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6e82f256-2d78-4bc8-886a-75d7f3e766b1', id, 'ISMC 200 SAIL make', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '48c8f001-ceeb-48c6-9e7e-acd47678d998'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '767c6bb7-d7fb-423c-a062-25cb0fe0affb', id, 'ISMC 175', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '48c8f001-ceeb-48c6-9e7e-acd47678d998'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '85301443-6a8b-41d9-80bd-74ab1cc9c6af', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '48c8f001-ceeb-48c6-9e7e-acd47678d998'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '76e0ae73-b265-4466-8e76-02d4446d780f', id, 'York', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '41d864ed-af6c-4156-87cd-208c2dcd5500'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '25fef38c-b11f-4826-91ea-0c7984de203a', id, 'Fuwa', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '41d864ed-af6c-4156-87cd-208c2dcd5500'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '02ebad08-7fbf-417c-92e6-ac5dae94aa7c', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '41d864ed-af6c-4156-87cd-208c2dcd5500'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'c463dec6-bb35-414e-9ee7-160ea5783427', id, 'Epoxy primer and PU top coat Nippon paint', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '0177e65f-3a7a-41c5-b23e-6317b799e834'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '9c8c2bbc-3b64-4870-883d-c58dca88d31f', id, 'Epoxy primer and Epoxy paint', -10000, FALSE, 2, TRUE
  FROM specs WHERE id = '0177e65f-3a7a-41c5-b23e-6317b799e834'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '11d9591b-c2eb-4951-b6aa-c537cfc9cc89', id, 'Custom', 15000, FALSE, 3, TRUE
  FROM specs WHERE id = '0177e65f-3a7a-41c5-b23e-6317b799e834'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '1e8bdf75-47f3-44a8-8e29-01e788a4a07d', id, 'Side Marker Lamp 6 no''s and top marker lamp 2 no''s', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '74095cd1-d1d4-4988-8571-93ed51a09793'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '6ab3dbf8-f9b5-48b5-b982-f23d8a42cf2a', id, 'Standard 4 marker lamps', -5000, FALSE, 2, TRUE
  FROM specs WHERE id = '74095cd1-d1d4-4988-8571-93ed51a09793'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '5fbe8338-47b9-4054-b8df-5ca551ca1b9d', id, 'Custom', 10000, FALSE, 3, TRUE
  FROM specs WHERE id = '74095cd1-d1d4-4988-8571-93ed51a09793'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT 'ee1b010d-516d-4e83-8dbd-cd20e6d3ab2f', id, 'Standard Heavy Duty RTO', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '4075528a-aa0a-4212-860f-9b3388da0c0b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '60f77483-e4cf-4d9c-8fae-420453422efb', id, 'Custom', 8000, FALSE, 2, TRUE
  FROM specs WHERE id = '4075528a-aa0a-4212-860f-9b3388da0c0b'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '3a8a741c-ebd1-436a-9b90-9a30715a26a1', id, '6mm', 0, TRUE, 1, TRUE
  FROM specs WHERE id = '10b18299-3eb5-4253-8369-561c071d5d2e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '12631a02-780e-48b4-bd58-6e62198db8d4', id, '8mm', 25000, FALSE, 2, TRUE
  FROM specs WHERE id = '10b18299-3eb5-4253-8369-561c071d5d2e'
  ON CONFLICT (spec_id, name) DO NOTHING;
INSERT INTO options (id, spec_id, name, price_difference, is_default, display_order, enabled)
  SELECT '937a0f13-ad37-46b3-a7d1-20a07c2013bc', id, 'Custom', 30000, FALSE, 3, TRUE
  FROM specs WHERE id = '10b18299-3eb5-4253-8369-561c071d5d2e'
  ON CONFLICT (spec_id, name) DO NOTHING;
COMMIT;

