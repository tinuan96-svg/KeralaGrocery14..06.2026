/*
  # Add anon read policy for store_categories

  Public users need to read store categories for the categories page and
  homepage category section. The existing SELECT policy only allows authenticated users.
*/

CREATE POLICY "Anyone can view active store categories"
  ON store_categories
  FOR SELECT
  TO anon
  USING (is_active = true);
