/*
  # Add anonymous read access for store categories

  1. Security Changes
    - Add SELECT policy on `store_categories` for `anon` role to allow public browsing
    - Add SELECT policy on `store_category_mappings` for `anon` role to allow public browsing
  
  2. Notes
    - These tables were previously only readable by authenticated users
    - Anonymous users need to read categories for the storefront to display properly
    - Only active store categories are exposed to anonymous users
*/

CREATE POLICY "Anon can view active store categories"
  ON store_categories
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Anon can view store category mappings"
  ON store_category_mappings
  FOR SELECT
  TO anon
  USING (true);
