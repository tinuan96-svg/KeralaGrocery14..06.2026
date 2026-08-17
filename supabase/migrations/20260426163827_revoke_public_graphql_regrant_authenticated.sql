/*
  # Block GraphQL introspection for anon via PUBLIC grant revoke

  ## Problem
  `graphql_public.graphql()` has EXECUTE granted to PUBLIC, which means all
  roles including `anon` inherit access. Revoking from `anon` alone has no
  effect while the PUBLIC grant exists.

  ## Fix
  1. Revoke EXECUTE from PUBLIC on graphql_public.graphql
  2. Revoke EXECUTE from anon explicitly (belt-and-suspenders)
  3. Re-grant EXECUTE to authenticated, service_role, and postgres so the
     GraphQL endpoint still works for authenticated users and server-side calls.

  ## Impact
  - Unauthenticated requests to /graphql/v1 will receive a permission denied
  - Authenticated requests and server-side calls are unaffected
  - All REST API (/rest/v1/) usage is completely unaffected
*/

REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM anon;

GRANT EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) TO postgres;
