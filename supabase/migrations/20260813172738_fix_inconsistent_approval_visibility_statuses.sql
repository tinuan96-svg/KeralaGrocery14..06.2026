/*
  # Fix Inconsistent Approval and Visibility Statuses

  ## Problem
  Some products have mismatched approval_status and visibility_status:
  - 12 products with approval_status='draft' but visibility_status='visible'
  - 9 products with approval_status='rejected' but visibility_status='visible'
  - 122 products with approval_status='approved' but visibility_status='hidden'

  These inconsistencies cause:
  1. Draft/rejected products appearing on the storefront
  2. Approved products being hidden from the storefront

  ## Fix
  1. Set visibility_status='hidden' for all non-approved products (draft, rejected)
  2. Leave approved+hidden products as-is (admin intentionally hid them)

  ## Scope
  Data update only — no schema changes.
*/

-- Fix: draft and rejected products should never be visible
UPDATE products
SET visibility_status = 'hidden',
    updated_at = now()
WHERE is_deleted = false
  AND approval_status IN ('draft', 'rejected')
  AND visibility_status = 'visible';
