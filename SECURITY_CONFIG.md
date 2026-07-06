# Security Configuration Guide

This document outlines security configurations that have been applied and those that require manual configuration in the Supabase Dashboard.

## Completed (Via Migration)

### 1. Foreign Key Indexes
All foreign key columns now have indexes for optimal query performance:

- `ai_actions`: `approved_by`, `insight_id`
- `cart`: `product_id`
- `inventory_logs`: `store_id`
- `order_items`: `order_id`
- `order_status_history`: `created_by`, `order_id`
- `orders`: `store_id`, `user_id`
- `pricing_rules`: `category_id`, `product_id`, `store_id`
- `product_sync_logs`: `created_by`, `product_id`, `store_id`
- `transactions`: `user_id`
- `user_actions`: `user_id`

### 2. Function Search Path
Both `generate_sku()` function variants now have secure search paths:
- `generate_sku()` - Fixed
- `generate_sku(p_store_id uuid)` - Fixed

## Required Manual Configuration

The following security settings must be configured in the Supabase Dashboard:

### 1. Auth DB Connection Strategy

**Current Issue:** Auth server uses fixed connection count (10 connections)

**Required Action:**
1. Go to Supabase Dashboard
2. Navigate to: Settings > Database > Connection Pooling
3. Change Auth connection strategy from "Fixed" to "Percentage"
4. Recommended: Set to 10-15% of total connections

**Why:** Percentage-based allocation automatically scales with instance size upgrades.

### 2. Leaked Password Protection

**Current Issue:** HaveIBeenPwned password checking is disabled

**Required Action:**
1. Go to Supabase Dashboard
2. Navigate to: Authentication > Settings
3. Find "Leaked Password Protection" section
4. Enable "Check passwords against HaveIBeenPwned"

**Why:** Prevents users from using compromised passwords, enhancing account security.

## Verification

### Check Indexes
```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

### Check Function Search Paths
```sql
SELECT
  proname,
  pg_get_function_arguments(oid) as args,
  proconfig
FROM pg_proc
WHERE proname = 'generate_sku';
```

## Security Best Practices

1. **Regular Audits**: Review security configurations quarterly
2. **Monitor Logs**: Check auth and database logs for suspicious activity
3. **Update Dependencies**: Keep Supabase and all packages up to date
4. **RLS Policies**: Ensure all tables have proper Row Level Security policies
5. **API Keys**: Rotate service role keys if compromised
6. **Environment Variables**: Never commit secrets to version control

## Support

For issues or questions about security configuration:
- Review Supabase documentation: https://supabase.com/docs
- Contact Supabase support for dashboard configuration assistance
