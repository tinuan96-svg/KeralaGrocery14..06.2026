-- Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_purchase boolean DEFAULT false,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to approved reviews"
  ON product_reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Allow authenticated users to insert reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);

-- Function to update aggregate ratings on product
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM product_reviews
      WHERE product_id = NEW.product_id AND status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = NEW.product_id AND status = 'approved'
    )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update ratings
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();
