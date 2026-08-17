/*
  # Revoke anon GraphQL introspection access

  ## Summary
  The `anon` role has SELECT on multiple public storefront tables. Because
  pg_graphql is installed, these grants are visible via the public
  `/graphql/v1` introspection endpoint, exposing table names, column names,
  and relationships to anyone.

  This app uses Supabase REST (PostgREST) exclusively — the GraphQL endpoint
  is not used anywhere in the codebase. Revoking EXECUTE on the public-facing
  `graphql_public.graphql()` function closes introspection for the anon role
  while leaving all REST API access completely intact.

  ## Changes
  - REVOKE EXECUTE on graphql_public.graphql from anon
    This disables /graphql/v1 for unauthenticated callers only.
    Authenticated users and the service role are unaffected.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'graphql_public'
      AND routine_name = 'graphql'
  ) THEN
    REVOKE EXECUTE ON FUNCTION graphql_public.graphql FROM anon;
  END IF;
END $$;
