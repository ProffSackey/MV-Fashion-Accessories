-- =============================================================================
-- MV FASHION ACCESSORIES - FULL SUPABASE SCHEMA
-- Paste this into Supabase SQL Editor for a fresh project.
-- Non-destructive: uses CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  price varchar(50) NOT NULL,
  category varchar(255) REFERENCES public.categories(name) ON DELETE SET NULL,
  image_url text,
  images text[],
  status varchar(50) NOT NULL DEFAULT 'active',
  rating numeric(3,2) DEFAULT 0,
  about text,
  stock_quantity int DEFAULT 0,
  sku varchar(255) UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  type varchar(20) NOT NULL CHECK (type IN ('Percentage', 'Fixed')),
  discount varchar(50) NOT NULL,
  deadline timestamp NOT NULL,
  description text,
  code varchar(100) NOT NULL UNIQUE,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(50) NOT NULL UNIQUE,
  customer_name varchar(255) NOT NULL,
  customer_email varchar(255) NOT NULL,
  customer_phone varchar(20),
  total_amount numeric(10,2) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'pending',
  payment_status varchar(50) NOT NULL DEFAULT 'unpaid',
  items jsonb NOT NULL,
  shipping_address jsonb,
  promo_code varchar(100),
  discount_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id varchar(255) NOT NULL UNIQUE,
  amount numeric(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'GHS',
  payment_method varchar(50) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'pending',
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  username varchar(100) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  phone varchar(20),
  address jsonb,
  total_orders int DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title varchar(255),
  comment text,
  helpful_count int DEFAULT 0,
  is_verified_purchase boolean DEFAULT false,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  recipient_type varchar(50) NOT NULL,
  recipient_email varchar(255),
  is_read boolean DEFAULT false,
  action_url varchar(500),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email varchar(255) NOT NULL,
  recipient_email varchar(255) NOT NULL,
  subject varchar(255),
  body text NOT NULL,
  is_read boolean DEFAULT false,
  parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_revenue numeric(12,2) DEFAULT 0,
  total_orders int DEFAULT 0,
  total_customers int DEFAULT 0,
  average_order_value numeric(10,2) DEFAULT 0,
  top_products jsonb,
  top_categories jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(255) NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  type varchar(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email varchar(255) NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_email, product_id)
);

CREATE TABLE IF NOT EXISTS public.guest_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- BACKFILL COLUMNS FOR EXISTING DATABASES
-- =============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity int DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku varchar(255);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS title varchar(255);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
UPDATE public.reviews SET status = 'approved' WHERE status IS NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON public.promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_deadline ON public.promotions(deadline);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON public.promotions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users(username);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON public.notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_messages_sender_email ON public.messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_email ON public.messages(recipient_email);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
CREATE INDEX IF NOT EXISTS idx_cart_items_customer_email ON public.cart_items(customer_email);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_added_at ON public.cart_items(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_carts_items_gin ON public.guest_carts USING gin (items);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS promotions_updated_at ON public.promotions;
CREATE TRIGGER promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS admin_users_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS analytics_updated_at ON public.analytics;
CREATE TRIGGER analytics_updated_at BEFORE UPDATE ON public.analytics FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS cart_items_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS guest_carts_updated_at ON public.guest_carts;
CREATE TRIGGER guest_carts_updated_at BEFORE UPDATE ON public.guest_carts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are visible to all" ON public.categories;
CREATE POLICY "Categories are visible to all" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Active products are visible to all" ON public.products;
CREATE POLICY "Active products are visible to all" ON public.products FOR SELECT USING (status = 'active' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Active promotions are visible to all" ON public.promotions;
CREATE POLICY "Active promotions are visible to all" ON public.promotions FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Reviews are visible to all" ON public.reviews;
CREATE POLICY "Reviews are visible to all" ON public.reviews FOR SELECT USING (status = 'approved' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Customers can insert reviews" ON public.reviews;
CREATE POLICY "Customers can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can see own cart" ON public.cart_items;
CREATE POLICY "Customers can see own cart" ON public.cart_items FOR SELECT USING (auth.jwt() ->> 'email' = customer_email OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "Customers can add to own cart" ON public.cart_items;
CREATE POLICY "Customers can add to own cart" ON public.cart_items FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = customer_email OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "Customers can update own cart" ON public.cart_items;
CREATE POLICY "Customers can update own cart" ON public.cart_items FOR UPDATE USING (auth.jwt() ->> 'email' = customer_email OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "Customers can delete own cart items" ON public.cart_items;
CREATE POLICY "Customers can delete own cart items" ON public.cart_items FOR DELETE USING (auth.jwt() ->> 'email' = customer_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Guest carts browser access" ON public.guest_carts;
CREATE POLICY "Guest carts browser access" ON public.guest_carts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can see notifications" ON public.notifications;
CREATE POLICY "Admins can see notifications" ON public.notifications
  FOR SELECT USING (auth.role() = 'service_role' OR recipient_type IN ('admin', 'all'));

DROP POLICY IF EXISTS "Customers can see own notifications" ON public.notifications;
CREATE POLICY "Customers can see own notifications" ON public.notifications
  FOR SELECT USING (recipient_type = 'all' OR (recipient_type = 'customer' AND auth.jwt() ->> 'email' = recipient_email));

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR recipient_type IN ('admin', 'customer', 'all'));

DROP POLICY IF EXISTS "Admins update notifications" ON public.notifications;
CREATE POLICY "Admins update notifications" ON public.notifications
  FOR UPDATE USING (auth.role() = 'service_role' OR recipient_type IN ('admin', 'all'));

DROP POLICY IF EXISTS "Customer update own notification" ON public.notifications;
CREATE POLICY "Customer update own notification" ON public.notifications
  FOR UPDATE USING (recipient_type = 'customer' AND auth.jwt() ->> 'email' = recipient_email);

DROP POLICY IF EXISTS "Messages visible to participants" ON public.messages;
CREATE POLICY "Messages visible to participants" ON public.messages
  FOR SELECT USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IN (sender_email, recipient_email));

DROP POLICY IF EXISTS "Messages insert by sender" ON public.messages;
CREATE POLICY "Messages insert by sender" ON public.messages
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.jwt() ->> 'email' = sender_email);

-- =============================================================================
-- STORAGE BUCKETS AND POLICIES
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Products bucket public read" ON storage.objects;
CREATE POLICY "Products bucket public read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('products', 'product-images'));

DROP POLICY IF EXISTS "Products bucket authenticated upload" ON storage.objects;
CREATE POLICY "Products bucket authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('products', 'product-images') AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

DROP POLICY IF EXISTS "Products bucket authenticated update" ON storage.objects;
CREATE POLICY "Products bucket authenticated update" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('products', 'product-images') AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

DROP POLICY IF EXISTS "Products bucket admin delete" ON storage.objects;
CREATE POLICY "Products bucket admin delete" ON storage.objects
  FOR DELETE USING (bucket_id IN ('products', 'product-images') AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));

-- =============================================================================
-- STARTER DATA
-- =============================================================================

INSERT INTO public.categories (name, description)
VALUES
  ('Appliances', 'Kitchen and home appliances'),
  ('Grocessories', 'Groceries and food items'),
  ('Health & Beauty', 'Health, beauty, and personal care products')
ON CONFLICT (name) DO NOTHING;

