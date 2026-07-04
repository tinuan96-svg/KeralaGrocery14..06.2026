/*
  # Optimize is_admin Function

  ## Changes Made
  
  1. Optimize the is_admin() function to handle NULL auth.uid() more efficiently
  2. Add early return for NULL user ID to avoid unnecessary database queries
  
  ## Performance Improvements
  
  - Reduces database load by avoiding unnecessary queries when user is not authenticated
  - Improves response time for anonymous users
*/

-- Drop and recreate the is_admin function with optimization
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  user_id_val uuid;
BEGIN
  -- Get the current user ID
  user_id_val := auth.uid();
  
  -- If no user is authenticated, return false immediately
  IF user_id_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the user's email ends with @keralagroceries.com
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id_val
    AND email LIKE '%@keralagroceries.com'
  );
END;
$$;
