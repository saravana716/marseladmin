-- ===================================================
-- CRACKERS ADMIN PANEL — SUPABASE DATABASE SETUP
-- Run these SQL statements in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ===================================================

-- ─── 1. Categories ───
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Products ───
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  type TEXT,
  quantity TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all product columns exist if table was already created
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity TEXT;

-- ─── 3. Customers ───
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure receipt_url column exists if table already created
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Status check constraint
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'));

-- ─── 5. Order Items ───
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Enable Row Level Security ───
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS Policies (authenticated users get full access) ───
CREATE POLICY "Allow authenticated full access" ON categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access" ON order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 8. Sample Data (Optional — Remove if not needed) ───

-- Sample Categories
INSERT INTO categories (name, description) VALUES
  ('Sparklers', 'Beautiful hand-held sparklers for all ages'),
  ('Ground Chakkar', 'Spinning ground wheels with colorful sparks'),
  ('Flower Pots', 'Cone-shaped fountains shooting colorful stars'),
  ('Rockets', 'Sky-bound rockets with aerial bursts'),
  ('Atom Bombs', 'Loud crackers for maximum celebration');

-- Sample Customers
INSERT INTO customers (name, email, phone, address) VALUES
  ('Ravi Kumar', 'ravi@example.com', '9876543210', '42 Anna Nagar, Chennai - 600040'),
  ('Priya Sharma', 'priya@example.com', '9123456789', '15 MG Road, Bangalore - 560001'),
  ('Amit Patel', 'amit@example.com', '9988776655', '7 Sector 18, Noida - 201301');

-- ===================================================
-- STORAGE SETUP (AUTOMATED STORAGE BUCKET CREATION)
-- ===================================================

-- Create public storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('category-images', 'category-images', true),
  ('product-images', 'product-images', true),
  ('gallery-videos', 'gallery-videos', true),
  ('price-lists', 'price-lists', true),
  ('order-receipts', 'order-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable storage RLS policies for public reading and authenticated file management
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Policy for Storage' AND tablename = 'objects') THEN
    CREATE POLICY "Public Access Policy for Storage" ON storage.objects FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload Policy for Storage' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated Upload Policy for Storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Full Access Policy for Storage' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated Full Access Policy for Storage" ON storage.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── 9. Marquee Banners & Media Gallery ───

-- Create Marquee table
CREATE TABLE IF NOT EXISTS marquee (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL DEFAULT 'Welcome to Marsel Traders!',
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default announcement
INSERT INTO marquee (text, active)
VALUES ('Welcome to Marsel Traders!', true);

-- Enable RLS
ALTER TABLE marquee ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated full access" ON marquee
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access" ON marquee
  FOR SELECT TO anon USING (true);

-- Create Gallery table
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated full access" ON gallery
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access" ON gallery
  FOR SELECT TO anon USING (true);

-- ─── 10. Store Settings (Min Order, etc.) ───

-- Create Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default minimum order constraint setting
INSERT INTO settings (key, value, label, description)
VALUES (
  'min_order_amount', 
  '1000', 
  'Minimum Order Amount', 
  'Minimum cart total value required for customers to place an order (in Rupees)'
)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated full access" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access" ON settings
  FOR SELECT TO anon USING (true);

-- ─── 11. Price List ───

-- Create Price List table
CREATE TABLE IF NOT EXISTS price_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated full access" ON price_list
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access" ON price_list
  FOR SELECT TO anon USING (true);

-- Storage bucket note:
-- Create public bucket: "price-lists" in Supabase Storage with public read access.

