/*
# Fix product data quality issues

## Purpose
Clean up visibility and approval mismatches in the products table before the
new push-based sync from CentralHub takes over.

## Changes
1. Hide inactive products: Set visibility_status = 'hidden' for all products
   where is_active = false. Inactive products should not be visible to customers.

2. Hide draft products: Set visibility_status = 'hidden' for all products
   where approval_status = 'draft'. Draft products should not be visible until
   approved by an admin.

3. Hide zero-price products: Set visibility_status = 'hidden' for all products
   where price = 0 (or selling_price = 0). Products with no valid price should
   not be visible until CentralHub pushes a valid price.

## Important Notes
- These are one-time fixes. Going forward, CentralHub's push sync will set
  is_published and status, and the storefront will filter based on those fields.
- No products are deleted — only hidden by setting visibility_status = 'hidden'.
- The visibility_status column is type text with values 'visible' and 'hidden'.
*/

-- 1. Hide inactive products (85 products)
UPDATE products
SET visibility_status = 'hidden',
    updated_at = now()
WHERE is_active = false
  AND is_deleted = false
  AND visibility_status != 'hidden';

-- 2. Hide draft products that are currently visible (82 products)
UPDATE products
SET visibility_status = 'hidden',
    updated_at = now()
WHERE approval_status = 'draft'
  AND is_deleted = false
  AND visibility_status != 'hidden';

-- 3. Hide products with zero price (13 products with no supplier_price)
UPDATE products
SET visibility_status = 'hidden',
    updated_at = now()
WHERE (price = 0 OR (selling_price = 0 AND cost_price IS NULL))
  AND is_deleted = false
  AND visibility_status != 'hidden';

-- 4. Sync in_stock and is_published from existing data for consistency
UPDATE products
SET in_stock = (stock > 0)
WHERE in_stock IS NULL OR in_stock != (stock > 0);

UPDATE products
SET is_published = (visibility_status = 'visible' AND approval_status = 'approved')
WHERE is_published IS NULL;

-- 5. Set status from approval_status for consistency
UPDATE products
SET status = CASE
    WHEN approval_status = 'approved' AND is_active = true THEN 'publish'
    ELSE 'draft'
END
WHERE status IS NULL OR status = '';
