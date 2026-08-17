/*
  # Map keralagroceries categories to store_categories

  ## Summary
  Products in the keralagroceries table have Malayalam-style internal category names
  (e.g. "Chaaya & Coffee", "Achar & Preserves") that do not match the display-friendly
  English names stored in store_categories (e.g. "Tea & Coffee", "Pickles & Preserves").

  ## Changes

  ### Modified Tables
  - `keralagroceries`
    - Added `store_category_id uuid` — FK to store_categories, populated via explicit mapping

  ### Modified Views
  - `v_storefront_products`
    - `display_category` now returns the mapped store_categories.name (English display name)
      instead of mapped_category_name (internal/Malayalam name)

  ## Mapping applied
  | keralagroceries.category_name | store_categories.name       |
  |-------------------------------|-----------------------------|
  | Achar & Preserves             | Pickles & Preserves         |
  | Ari                           | Rices                       |
  | Arogya & Care                 | Health & Personal Care      |
  | Atta & Podikal                | Flour & Grains              |
  | Chaaya & Coffee               | Tea & Coffee                |
  | Enna & Neyy                   | Oils & Fats                 |
  | Kondattam & Fryums            | Fryums                      |
  | Madhuram                      | Desserts                    |
  | Masala Kootu                  | Curry Masalas               |
  | Palaharam & Sweets            | Snacks & Sweets             |
  | Parippu & Payar               | Pulses & Beans              |
  | Podi & Whole Spices           | Whole & Ground Spices       |
  | Ready Foods                   | Ready to eat                |
  | Thalippu & Condiments         | Seasonings & Condiments     |
  | Veedu Care                    | Household & Cleaning        |
*/

-- 1. Add store_category_id column to keralagroceries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keralagroceries' AND column_name = 'store_category_id'
  ) THEN
    ALTER TABLE keralagroceries ADD COLUMN store_category_id uuid REFERENCES store_categories(id);
  END IF;
END $$;

-- 2. Populate store_category_id using the category_name → store_categories mapping
UPDATE keralagroceries k
SET store_category_id = sc.id
FROM store_categories sc
WHERE sc.store_id = k.store_id
  AND sc.id = CASE k.category_name
    WHEN 'Achar & Preserves'    THEN '71b6f445-f2f2-45da-91ff-8d783d973f7c'::uuid
    WHEN 'Ari'                  THEN 'd08b4b95-1d37-494a-8404-3f7673a3b7dd'::uuid
    WHEN 'Arogya & Care'        THEN '002dc16e-ab19-4f79-b196-0964c41e7734'::uuid
    WHEN 'Atta & Podikal'       THEN '4e50b6bc-65d1-4d1d-9b5d-7512abed66db'::uuid
    WHEN 'Chaaya & Coffee'      THEN '5b35a950-d6f6-4d51-8864-bbdd30fe3424'::uuid
    WHEN 'Enna & Neyy'          THEN '17ac9a2d-ca30-4c89-b61f-eaa75b85fdfa'::uuid
    WHEN 'Kondattam & Fryums'   THEN 'f6bc9914-e158-4079-adf4-7e4fb27b6fce'::uuid
    WHEN 'Madhuram'             THEN '70a07720-e8f1-4436-911f-864ab930028e'::uuid
    WHEN 'Masala Kootu'         THEN 'e7912bd3-9fa5-432e-9cc7-3d16d1710ccd'::uuid
    WHEN 'Palaharam & Sweets'   THEN 'ccffb503-ed38-4d7c-85bf-ffe8d62b3dc2'::uuid
    WHEN 'Parippu & Payar'      THEN '098a1b55-a97f-4860-a335-288d604bd79e'::uuid
    WHEN 'Podi & Whole Spices'  THEN '74c7bba8-ccc0-4f4b-8a7c-641360916ab0'::uuid
    WHEN 'Ready Foods'          THEN 'ac5a3518-b6f7-430c-967b-b33d8f6aae60'::uuid
    WHEN 'Thalippu & Condiments' THEN 'f12d562e-0cbe-4cd2-aa69-9480bf32147d'::uuid
    WHEN 'Veedu Care'           THEN 'aa1590c4-e5da-4b2a-9ff4-2b07a3b26de3'::uuid
    ELSE NULL
  END;

-- 3. Recreate v_storefront_products to use store_categories.name as display_category
CREATE OR REPLACE VIEW v_storefront_products AS
SELECT
  k.id AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,
  k.brand,
  COALESCE(k.adjusted_price, k.price) AS effective_price,
  k.price AS original_price,
  k.adjusted_price,
  COALESCE(k.adjusted_qnty, k.qnty) AS effective_stock,
  k.qnty,
  k.adjusted_qnty,
  k.unit,
  k.weight,
  COALESCE(sc.name, k.mapped_category_name, k.category_name) AS display_category,
  k.mapped_category_name,
  k.category_name,
  k.main_category,
  k.parent_category,
  k.product_description,
  k.seo_title,
  k.seo_keywords,
  k.seo_description,
  k.status,
  k.backorder_enabled,
  k.created_at,
  p.slug AS product_slug,
  COALESCE(sp.image_override, p.image_url) AS image_url
FROM keralagroceries k
LEFT JOIN products p ON p.id = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id AND sp.store_id = k.store_id
LEFT JOIN store_categories sc ON sc.id = k.store_category_id
WHERE k.status = 'active';
