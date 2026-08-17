/*
  # Reset All Products to Draft Status

  ## Purpose
  This migration sets all products in the database back to 'draft' status.
  This forces an admin to review and manually approve each product before it becomes visible on the storefront.

  ## Actions
  1. Sets `approval_status` to 'draft' for all products.
  2. Sets `visibility_status` to false to hide them from the storefront.
  3. Clears `approved_at` and `approved_by` columns.
  4. Adds a log entry to `approval_logs` for traceability.
*/

-- 1. Perform the bulk reset
UPDATE products
SET
  approval_status = 'draft',
  visibility_status = false,
  approved_at = NULL,
  approved_by = NULL,
  updated_at = now()
WHERE is_deleted = false;

-- 2. Log the action if the approval_logs table exists
DO $$
DECLARE
    affected_count integer;
BEGIN
    -- Get the number of rows updated
    GET DIAGNOSTICS affected_count = ROW_COUNT;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'approval_logs') THEN
        INSERT INTO approval_logs (
            product_id,
            product_name,
            action,
            admin_user,
            success,
            approval_status_before,
            created_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', -- Dummy ID for bulk action
            'Bulk Reset: Set ' || affected_count || ' products to draft',
            'draft',
            NULL, -- System action
            true,
            'various',
            now()
        );
    END IF;
END $$;
