/*
  # Restore anon SELECT on keralagroceries, hide internal tables from GraphQL

  ## Problem
  v_storefront_products uses security_invoker = true, so it runs as the calling role.
  Revoking SELECT from anon on keralagroceries broke the view with "permission denied".

  ## Fix
  1. Restore GRANT SELECT on keralagroceries to anon and authenticated
  2. Use pg_graphql @graphql({"ignored": true}) comments to hide tables from
     GraphQL introspection without revoking DB-level privileges
*/

GRANT SELECT ON public.keralagroceries TO anon;
GRANT SELECT ON public.keralagroceries TO authenticated;

GRANT SELECT ON public.image_processing_jobs TO anon;
GRANT SELECT ON public.ingestion_jobs TO anon;

-- Hide from pg_graphql introspection schema
COMMENT ON TABLE public.keralagroceries IS E'@graphql({"totalCount": {"enabled": false}, "ignored": true})';
COMMENT ON TABLE public.image_processing_jobs IS E'@graphql({"totalCount": {"enabled": false}, "ignored": true})';
COMMENT ON TABLE public.ingestion_jobs IS E'@graphql({"totalCount": {"enabled": false}, "ignored": true})';
COMMENT ON TABLE public.app_config IS E'@graphql({"totalCount": {"enabled": false}, "ignored": true})';
COMMENT ON VIEW public.store_products_view IS E'@graphql({"totalCount": {"enabled": false}, "ignored": true})';
