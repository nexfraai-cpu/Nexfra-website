-- ============================================================================
-- Nexfra ERP — Supabase Local Seed Data
-- Used by: supabase db reset
-- ============================================================================

-- This seed file is for LOCAL DEVELOPMENT ONLY.
-- It creates demo data so the ERP is functional immediately after reset.
-- For production, use the migration files instead.

BEGIN;

-- Seed products
INSERT INTO products (key, name, description, sort_order) VALUES
  ('trailer', 'Trailer', 'Flat Bed, Side Wall, and Tip Trailers', 1),
  ('tipper', 'Tipper', 'Box Body and Rock Body Tippers', 2),
  ('rigid', 'Rigid Load Body', 'Rigid truck load bodies', 3)
ON CONFLICT (key) DO NOTHING;

-- Seed templates
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'flatbed', 'Flat Bed Trailer', 850000,
  '{"length": "40 Feet", "height": "NA", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'trailer'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'flatbed');

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'sidewall', 'Side Wall Trailer', 1420000,
  '{"length": "40 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'trailer'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'sidewall');

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'tiptrailer', 'Tip Trailer', 1420000,
  '{"length": "32 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 3
FROM products p WHERE p.key = 'trailer'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'tiptrailer');

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'boxbody', 'Box Body Tipper', 780000,
  '{"length": "20 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'tipper'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'boxbody');

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rockbody', 'Rock Body Tipper', 1150000,
  '{"length": "18 Feet", "height": "4 Feet", "width": "96 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'tipper'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'rockbody');

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rigid28', '28 Feet Rigid Load Body', 380000,
  '{"length": "28 Feet", "height": "4.0 Feet", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'rigid'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'rigid28');

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rigid30', '30 Feet Rigid Load Body', 420000,
  '{"length": "30 Feet", "height": "4.0 Feet", "width": "98 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'rigid'
AND NOT EXISTS (SELECT 1 FROM product_templates WHERE key = 'rigid30');

-- Seed app settings
INSERT INTO app_settings (key, value, description) VALUES
  ('pricing_coefficients', '{"floor6": -15000, "floor10": 30000, "steelHardox": 150000, "axle2": -100000, "axle3_16": 80000}'::jsonb, 'Raw material pricing adjustment coefficients'),
  ('system_defaults', '{"gst_rate": 18, "payment_terms": ["50% advance", "50% before delivery"], "currency": "INR"}'::jsonb, 'System-wide default values'),
  ('bank_details', '{"companyName": "NEXFRA MANUFACTURING INDIA PVT LTD", "bankName": "ICICI BANK", "accountNumber": "060105004477", "accountType": "CURRENT", "ifsc": "ICIC0000156"}'::jsonb, 'Default company bank details'),
  ('default_terms', '["1) Validity – 15 days", "2) Delivery – 2 To 3 weeks from Date of receipt of purchase order and advance payment", "3) Freight - Ex Price Hosur.. Transportation in Customers Scope & is not considered in the above Price", "4) Warrantee: Standard warranty against manufacturing defects of 12 Months from the date of delivery. Consumables, Glass & Rubber parts are not covered under the standard warranty", "5) Taxes - All taxes & duties will be billed at actual applicable rates, at the time of billing", "6) Payment terms – 50% advance and balance Prior to Delivery", "7) Inspection: By Nexfra and share the report along with invoice"]'::jsonb, 'Default quotation terms and conditions')
ON CONFLICT (key) DO NOTHING;

-- Seed demo customers
INSERT INTO customers (customer_number, name, company, gst, phone, email, address, vehicles) VALUES
  ('CUS-000001', 'Tata Logistics Pvt Ltd', 'Tata Logistics', '33AAACT8281M1Z5', '+91 98400 12345', 'operations@tatalogistics.com', 'Plot 12, Port Road, Tuticorin, TN', '["TN-69-AA-1234", "TN-69-AA-5678"]'::jsonb),
  ('CUS-000002', 'Gati Mining & Minerals', 'Gati Minerals', '27AAACG1928A2Z0', '+91 99100 98765', 'mehta@gatimining.com', 'Mine Block C, Korba, Chhattisgarh', '["CG-12-BB-9922"]'::jsonb),
  ('CUS-000003', 'V-Trans Cargo India', 'V-Trans', '24AAACV1029P3Z1', '+91 98220 54321', 'sandeep@vtrans.com', 'Sarkhej Highway, Ahmedabad, Gujarat', '[]'::jsonb),
  ('CUS-000004', 'Golden Roadlines', 'Golden Roadlines', '09AAACG8811K1Z2', '+91 97110 22334', 'rajesh@goldenroadlines.com', 'Sanjay Gandhi Transport Nagar, Delhi', '["DL-1G-1020", "DL-1G-3344"]'::jsonb)
ON CONFLICT (customer_number) DO NOTHING;

COMMIT;
