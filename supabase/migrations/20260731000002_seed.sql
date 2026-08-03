-- ============================================================================
-- Nexfra ERP — Supabase Migration 002: Seed Data & Storage
-- Date: 2026-07-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEED DATA
-- ----------------------------------------------------------------------------

BEGIN;

-- 1.1 Products
INSERT INTO products (key, name, description, sort_order) VALUES
  ('trailer', 'Trailer', 'Flat Bed, Side Wall, and Tip Trailers', 1),
  ('tipper', 'Tipper', 'Box Body and Rock Body Tippers', 2),
  ('rigid', 'Rigid Load Body', 'Rigid truck load bodies', 3)
ON CONFLICT (key) DO NOTHING;

-- 1.2 Product Templates
-- Flat Bed Trailer
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'flatbed', 'Flat Bed Trailer', 850000,
  '{"length": "40 Feet", "height": "NA", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'trailer'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'flatbed');

-- Side Wall Trailer
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'sidewall', 'Side Wall Trailer', 1420000,
  '{"length": "40 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'trailer'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'sidewall');

-- Tip Trailer
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'tiptrailer', 'Tip Trailer', 1420000,
  '{"length": "32 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 3
FROM products p WHERE p.key = 'trailer'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'tiptrailer');

-- Box Body Tipper
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'boxbody', 'Box Body Tipper', 780000,
  '{"length": "20 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'tipper'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'boxbody');

-- Rock Body Tipper
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rockbody', 'Rock Body Tipper', 1150000,
  '{"length": "18 Feet", "height": "4 Feet", "width": "96 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'tipper'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'rockbody');

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

-- 1.3 App Settings (default pricing coefficients)
INSERT INTO app_settings (key, value, description) VALUES
  (
    'pricing_coefficients',
    '{"floor6": -15000, "floor10": 30000, "steelHardox": 150000, "axle2": -100000, "axle3_16": 80000}'::jsonb,
    'Raw material pricing adjustment coefficients'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  (
    'system_defaults',
    '{"gst_rate": 18, "payment_terms": ["50% advance", "50% before delivery"], "currency": "INR"}'::jsonb,
    'System-wide default values'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  (
    'bank_details',
    '{"companyName": "NEXFRA MANUFACTURING INDIA PVT LTD", "bankName": "ICICI BANK", "accountNumber": "060105004477", "accountType": "CURRENT", "ifsc": "ICIC0000156"}'::jsonb,
    'Default company bank details for quotations'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  (
    'default_terms',
    '["1) Validity – 15 days", "2) Delivery – 2 To 3 weeks from Date of receipt of purchase order and advance payment", "3) Freight - Ex Price Hosur, Transportation in Customers Scope & is not considered in the above Price", "4) Warrantee: Standard warranty against manufacturing defects of 12 Months from the date of delivery. Consumables, Glass & Rubber parts are not covered under the standard warranty", "5) Taxes - All taxes & duties will be billed at actual applicable rates, at the time of billing", "6) Payment terms – 50% advance and balance Prior to Delivery", "7) Inspection: By Nexfra and share the report along with invoice"]'::jsonb,
    'Default quotation terms and conditions'
  )
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ----------------------------------------------------------------------------
-- 2. STORAGE BUCKETS
-- ----------------------------------------------------------------------------

-- quotation-pdfs: Generated quotation PDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quotation-pdfs',
  'quotation-pdfs',
  true,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- attachments: General file attachments (images, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- company-assets: Logos, templates, brand assets (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  20971520,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. STORAGE RLS POLICIES
-- ----------------------------------------------------------------------------

-- quotation-pdfs: Authenticated users can read; admin/sales can insert
CREATE POLICY "quotation_pdfs_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'quotation-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "quotation_pdfs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'quotation-pdfs'
    AND (auth_has_role('admin') OR auth_has_role('sales'))
  );

CREATE POLICY "quotation_pdfs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'quotation-pdfs'
    AND auth_has_role('admin')
  );

-- attachments: Authenticated users can read own; admin can read all
CREATE POLICY "attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "attachments_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "attachments_read_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments'
    AND auth_has_role('admin')
  );

CREATE POLICY "attachments_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- company-assets: Public read, admin write
CREATE POLICY "company_assets_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-assets'
    AND auth_has_role('admin')
  );

CREATE POLICY "company_assets_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-assets'
    AND auth_has_role('admin')
  );
