export interface Store {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  color: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  show_on_homepage?: boolean;
  icon?: string | null;
  sort_order?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  show_on_homepage?: boolean;
  sort_order?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  price: number;
  original_price?: number | null;
  stock: number;
  is_active: boolean | null;
  created_at: string;
  enhanced_image_url?: string | null;
  discount_percentage?: number;
  is_bestseller?: boolean;
  rating?: number;
  review_count?: number;
  is_hot_product?: boolean;
  hot_product_expires_at?: string | null;
  is_featured?: boolean;
  is_deal?: boolean;
  is_new_arrival?: boolean;
  sold_count?: number;
}

export interface GalleryImage {
  id: string;
  product_id: string;
  image_url: string;
  enhanced_image_url: string | null;
  thumbnail_url: string | null;
  original_image_url: string | null;
  position: number;
  is_primary: boolean;
  image_processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  image_processed_at: string | null;
  created_at: string;
}

export interface ProductWithDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_main?: string | null;
  image_medium?: string | null;
  image_thumbnail?: string | null;
  image_large?: string | null;
  image_path?: string | null;
  category_id: string | null;
  brand_id: string | null;
  created_at: string;
  price: number;
  original_price?: number | null;
  stock: number;
  is_active: boolean | null;
  category?: Category;
  brand?: Brand;
  enhanced_image_url?: string | null;
  discount_percentage?: number;
  is_bestseller?: boolean;
  rating?: number;
  review_count?: number;
  is_hot_product?: boolean;
  hot_product_expires_at?: string | null;
  is_featured?: boolean;
  is_deal?: boolean;
  is_new_arrival?: boolean;
  sold_count?: number;
  gallery_images?: GalleryImage[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  phone_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'paypal' | 'card' | 'wallet' | 'cod';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
}

export interface HomepageSection {
  id: string;
  store_id: string;
  section_name: string;
  display_name: string;
  mode: 'manual' | 'auto';
  is_active: boolean;
  product_limit: number;
  label: string | null;
  icon: string | null;
  color: string | null;
  store_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  badge_text: string | null;
  status: 'active' | 'inactive' | 'scheduled';
  priority: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}
