/*
  # Fix RLS Performance and Security Issues

  1. RLS Policy Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in all policies
    - Improves query performance at scale by preventing re-evaluation per row
    - Affects tables: cart, users, user_profiles

  2. Function Security
    - Set explicit search_path for all functions
    - Prevents role mutable search_path vulnerabilities

  3. Tables Updated
    - cart: 4 policies optimized
    - users: 3 policies optimized  
    - user_profiles: 3 policies optimized
*/

-- Drop and recreate cart policies with optimized auth checks
DROP POLICY IF EXISTS "Users can read own cart" ON cart;
DROP POLICY IF EXISTS "Users can insert into own cart" ON cart;
DROP POLICY IF EXISTS "Users can update own cart" ON cart;
DROP POLICY IF EXISTS "Users can delete from own cart" ON cart;

CREATE POLICY "Users can read own cart"
  ON cart
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert into own cart"
  ON cart
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own cart"
  ON cart
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete from own cart"
  ON cart
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate users policies with optimized auth checks
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate user_profiles policies with optimized auth checks (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

    EXECUTE 'CREATE POLICY "Users can read own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = id)';

    EXECUTE 'CREATE POLICY "Users can update own profile"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) = id)
      WITH CHECK ((select auth.uid()) = id)';

    EXECUTE 'CREATE POLICY "Users can insert own profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = id)';
  END IF;
END $$;

-- Fix function search_path security issues
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION handle_new_user_signup() SET search_path = public, pg_temp;

-- Fix additional functions if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_profile_updated_at') THEN
    ALTER FUNCTION update_user_profile_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    ALTER FUNCTION handle_new_user() SET search_path = public, pg_temp;
  END IF;
END $$;
