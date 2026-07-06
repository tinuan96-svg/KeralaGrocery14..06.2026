/*
  # Revoke anon EXECUTE on graphql_public.graphql (direct, correct signature)

  The previous migration used an IF EXISTS guard that didn't match because the
  information_schema check ran before the privilege revoke could be attempted.
  This migration revokes directly using the correct argument types.
*/

REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM anon;
