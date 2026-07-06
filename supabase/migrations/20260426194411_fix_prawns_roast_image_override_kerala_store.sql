/*
  # Fix Prawns Roast image_override for Kerala Groceries store

  The product had the real uploaded image URL saved to a different store's
  store_products row. This updates the correct Kerala Groceries store row.
*/

UPDATE store_products
SET image_override = 'https://icnvrpnzjjcbvgcqgiua.supabase.co/storage/v1/object/public/product-images/20260205_032313.jpg'
WHERE product_id = 'df20f2c0-d421-4892-8360-733d94bb4082'
  AND store_id = 'a2e4d9f9-6b51-4071-97eb-decf72485b5a';
