/*
  # Fix replace_product_image to also update products.image_main

  The function was only updating store_products.image_cdn_url, but the admin
  product list reads images from products.image_main / products.image_url.
  This fix makes the function also update products.image_main so the image
  appears immediately after saving.
*/

CREATE OR REPLACE FUNCTION replace_product_image(
  p_product_id  uuid,
  p_store_id    uuid,
  p_new_image_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update store_products image
  UPDATE store_products
  SET
    image_cdn_url = p_new_image_url,
    updated_at    = now()
  WHERE product_id = p_product_id
    AND store_id   = p_store_id;

  -- Upsert if no store_products row exists yet
  IF NOT FOUND THEN
    INSERT INTO store_products (product_id, store_id, image_cdn_url, updated_at)
    VALUES (p_product_id, p_store_id, p_new_image_url, now())
    ON CONFLICT (product_id, store_id) DO UPDATE
      SET image_cdn_url = EXCLUDED.image_cdn_url,
          updated_at    = now();
  END IF;

  -- Also update products.image_main so storefront and admin list see it immediately
  UPDATE products
  SET
    image_main = p_new_image_url,
    image_url  = p_new_image_url,
    updated_at = now()
  WHERE id = p_product_id;
END;
$$;

-- Ensure execute grants are correct
REVOKE EXECUTE ON FUNCTION replace_product_image(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION replace_product_image(uuid, uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION replace_product_image(uuid, uuid, text) TO service_role;
