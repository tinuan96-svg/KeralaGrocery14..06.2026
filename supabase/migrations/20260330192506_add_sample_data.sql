/*
  # Add Sample Data for Kerala Grocery UK

  1. Sample Data
    - Creates default store (Kerala Grocery UK)
    - Adds 6 product categories (Rice, Spices, Oils, Flours, Snacks, Beverages)
    - Adds 12 sample products across different categories
    - Links products to store with pricing and stock information
    
  2. Important Notes
    - Uses conditional INSERT to avoid duplicates
    - Realistic pricing for UK market
    - Stock levels set to reasonable amounts
    - All products are active and ready to display
*/

-- Create default store
INSERT INTO stores (name, created_at)
SELECT 'Kerala Grocery UK', now()
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'Kerala Grocery UK');

-- Create categories
INSERT INTO categories (name, slug)
VALUES 
  ('Rice & Grains', 'rice-grains'),
  ('Spices', 'spices'),
  ('Cooking Oils', 'cooking-oils'),
  ('Flours', 'flours'),
  ('Snacks', 'snacks'),
  ('Beverages', 'beverages')
ON CONFLICT (slug) DO NOTHING;

-- Get store and category IDs
DO $$
DECLARE
  v_store_id uuid;
  v_rice_cat_id uuid;
  v_spices_cat_id uuid;
  v_oils_cat_id uuid;
  v_flours_cat_id uuid;
  v_snacks_cat_id uuid;
  v_beverages_cat_id uuid;
BEGIN
  -- Get store ID
  SELECT id INTO v_store_id FROM stores WHERE name = 'Kerala Grocery UK' LIMIT 1;
  
  -- Get category IDs
  SELECT id INTO v_rice_cat_id FROM categories WHERE slug = 'rice-grains' LIMIT 1;
  SELECT id INTO v_spices_cat_id FROM categories WHERE slug = 'spices' LIMIT 1;
  SELECT id INTO v_oils_cat_id FROM categories WHERE slug = 'cooking-oils' LIMIT 1;
  SELECT id INTO v_flours_cat_id FROM categories WHERE slug = 'flours' LIMIT 1;
  SELECT id INTO v_snacks_cat_id FROM categories WHERE slug = 'snacks' LIMIT 1;
  SELECT id INTO v_beverages_cat_id FROM categories WHERE slug = 'beverages' LIMIT 1;

  -- Insert products for Rice & Grains
  INSERT INTO products (name, slug, description, category_id, image_url)
  VALUES 
    ('Ponni Raw Rice', 'ponni-raw-rice', 'Premium quality Ponni raw rice from Tamil Nadu. Perfect for daily cooking and ideal for making soft, fluffy rice.', v_rice_cat_id, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'),
    ('Kerala Matta Rice', 'kerala-matta-rice', 'Authentic Kerala red rice known for its nutritional value and unique taste. Rich in fiber and minerals.', v_rice_cat_id, 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert products for Spices
  INSERT INTO products (name, slug, description, category_id, image_url)
  VALUES 
    ('Kerala Curry Powder', 'kerala-curry-powder', 'Traditional Kerala curry powder blend with authentic spices. Perfect for fish curry, chicken curry, and vegetable dishes.', v_spices_cat_id, 'https://images.unsplash.com/photo-1596040033229-a0b4e27e7ddd?w=500'),
    ('Black Pepper Whole', 'black-pepper-whole', 'Premium Kerala black pepper, the king of spices. Fresh, aromatic, and full of flavor.', v_spices_cat_id, 'https://images.unsplash.com/photo-1599909412-773e1ac53da1?w=500'),
    ('Turmeric Powder', 'turmeric-powder', 'Pure Kerala turmeric powder, freshly ground. Known for its vibrant color and health benefits.', v_spices_cat_id, 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=500')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert products for Cooking Oils
  INSERT INTO products (name, slug, description, category_id, image_url)
  VALUES 
    ('Coconut Oil Pure', 'coconut-oil-pure', 'Pure Kerala coconut oil, cold-pressed and chemical-free. Perfect for cooking and hair care.', v_oils_cat_id, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'),
    ('Gingelly Oil', 'gingelly-oil', 'Traditional sesame oil (gingelly oil) perfect for Kerala cooking and Ayurvedic preparations.', v_oils_cat_id, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert products for Flours
  INSERT INTO products (name, slug, description, category_id, image_url)
  VALUES 
    ('Rice Flour', 'rice-flour', 'Fine quality rice flour perfect for making puttu, appam, and other traditional Kerala dishes.', v_flours_cat_id, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500'),
    ('Wheat Atta', 'wheat-atta', 'Premium quality whole wheat flour for making chapati, parotta, and other breads.', v_flours_cat_id, 'https://images.unsplash.com/photo-1628452048842-dde89de72d88?w=500')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert products for Snacks
  INSERT INTO products (name, slug, description, category_id, image_url)
  VALUES 
    ('Banana Chips', 'banana-chips', 'Crispy Kerala banana chips made from fresh Nendran bananas. A perfect tea-time snack.', v_snacks_cat_id, 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500'),
    ('Tapioca Chips', 'tapioca-chips', 'Crunchy tapioca chips seasoned with traditional Kerala spices. Addictively delicious!', v_snacks_cat_id, 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=500')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert products for Beverages
  INSERT INTO products (name, slug, description, category_id, image_url)
  VALUES 
    ('Kerala Coffee Powder', 'kerala-coffee-powder', 'Freshly roasted and ground Kerala coffee powder. Rich aroma and strong flavor.', v_beverages_cat_id, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500')
  ON CONFLICT (slug) DO NOTHING;

  -- Link products to store with pricing and stock
  -- Rice & Grains
  INSERT INTO store_products (store_id, product_id, price, stock, is_active)
  SELECT v_store_id, p.id, 
    CASE p.slug
      WHEN 'ponni-raw-rice' THEN 12.99
      WHEN 'kerala-matta-rice' THEN 14.99
    END,
    CASE p.slug
      WHEN 'ponni-raw-rice' THEN 50
      WHEN 'kerala-matta-rice' THEN 35
    END,
    true
  FROM products p
  WHERE p.slug IN ('ponni-raw-rice', 'kerala-matta-rice')
    AND NOT EXISTS (
      SELECT 1 FROM store_products sp 
      WHERE sp.store_id = v_store_id AND sp.product_id = p.id
    );

  -- Spices
  INSERT INTO store_products (store_id, product_id, price, stock, is_active)
  SELECT v_store_id, p.id, 
    CASE p.slug
      WHEN 'kerala-curry-powder' THEN 4.99
      WHEN 'black-pepper-whole' THEN 8.99
      WHEN 'turmeric-powder' THEN 3.99
    END,
    CASE p.slug
      WHEN 'kerala-curry-powder' THEN 100
      WHEN 'black-pepper-whole' THEN 75
      WHEN 'turmeric-powder' THEN 120
    END,
    true
  FROM products p
  WHERE p.slug IN ('kerala-curry-powder', 'black-pepper-whole', 'turmeric-powder')
    AND NOT EXISTS (
      SELECT 1 FROM store_products sp 
      WHERE sp.store_id = v_store_id AND sp.product_id = p.id
    );

  -- Cooking Oils
  INSERT INTO store_products (store_id, product_id, price, stock, is_active)
  SELECT v_store_id, p.id, 
    CASE p.slug
      WHEN 'coconut-oil-pure' THEN 15.99
      WHEN 'gingelly-oil' THEN 12.99
    END,
    CASE p.slug
      WHEN 'coconut-oil-pure' THEN 40
      WHEN 'gingelly-oil' THEN 30
    END,
    true
  FROM products p
  WHERE p.slug IN ('coconut-oil-pure', 'gingelly-oil')
    AND NOT EXISTS (
      SELECT 1 FROM store_products sp 
      WHERE sp.store_id = v_store_id AND sp.product_id = p.id
    );

  -- Flours
  INSERT INTO store_products (store_id, product_id, price, stock, is_active)
  SELECT v_store_id, p.id, 
    CASE p.slug
      WHEN 'rice-flour' THEN 3.49
      WHEN 'wheat-atta' THEN 4.99
    END,
    CASE p.slug
      WHEN 'rice-flour' THEN 60
      WHEN 'wheat-atta' THEN 55
    END,
    true
  FROM products p
  WHERE p.slug IN ('rice-flour', 'wheat-atta')
    AND NOT EXISTS (
      SELECT 1 FROM store_products sp 
      WHERE sp.store_id = v_store_id AND sp.product_id = p.id
    );

  -- Snacks
  INSERT INTO store_products (store_id, product_id, price, stock, is_active)
  SELECT v_store_id, p.id, 
    CASE p.slug
      WHEN 'banana-chips' THEN 5.99
      WHEN 'tapioca-chips' THEN 6.49
    END,
    CASE p.slug
      WHEN 'banana-chips' THEN 80
      WHEN 'tapioca-chips' THEN 65
    END,
    true
  FROM products p
  WHERE p.slug IN ('banana-chips', 'tapioca-chips')
    AND NOT EXISTS (
      SELECT 1 FROM store_products sp 
      WHERE sp.store_id = v_store_id AND sp.product_id = p.id
    );

  -- Beverages
  INSERT INTO store_products (store_id, product_id, price, stock, is_active)
  SELECT v_store_id, p.id, 9.99, 45, true
  FROM products p
  WHERE p.slug = 'kerala-coffee-powder'
    AND NOT EXISTS (
      SELECT 1 FROM store_products sp 
      WHERE sp.store_id = v_store_id AND sp.product_id = p.id
    );

END $$;
