/*
  # Drop order_items product_image URL constraint

  ## Problem
  The `order_items_product_image_path_no_full_url` constraint blocks full https:// URLs
  in the `product_image` column. The checkout sends full image URLs from the product
  catalog, causing every order item insert to fail with a constraint violation.

  ## Fix
  Drop the constraint to allow full URLs in product_image.
*/

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_image_path_no_full_url;
