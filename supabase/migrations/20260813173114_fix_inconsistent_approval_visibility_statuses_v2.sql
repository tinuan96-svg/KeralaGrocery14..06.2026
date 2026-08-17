/*
  # Fix Inconsistent Approval and Visibility Statuses (retry)

  Sets visibility_status='hidden' for all non-approved products (draft, rejected)
  that currently have visibility_status='visible'.
*/

UPDATE products
SET visibility_status = 'hidden',
    updated_at = now()
WHERE is_deleted = false
  AND approval_status IN ('draft', 'rejected')
  AND visibility_status = 'visible';
