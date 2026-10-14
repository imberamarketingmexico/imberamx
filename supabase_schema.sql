-- ==============================================================================
-- IMBERA B2B CATALOG & LEADS MANAGEMENT SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sku TEXT NOT NULL UNIQUE,
    commercial_name TEXT NOT NULL,
    model_code TEXT,
    subtitle TEXT,
    description TEXT,
    main_image TEXT,
    gallery TEXT[] DEFAULT ARRAY[]::TEXT[],
    datasheet_url TEXT, -- URL de la ficha técnica PDF
    manual_url TEXT,    -- URL del manual de usuario PDF
    specifications JSONB DEFAULT '{}'::jsonb, -- Dimensiones, refrigerante, rango temp, etc.
    is_new BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. LEADS (COTIZACIONES / CONTACTOS)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    units_count INTEGER,
    state TEXT,
    product_interest TEXT,
    message TEXT,
    source_page TEXT DEFAULT 'sitio-web',
    status TEXT DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'en_negociacion', 'cerrado', 'descartado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- POLICIES: CATEGORIES
-- Cualquier visitante puede consultar categorías activas
CREATE POLICY "Public read categories" 
ON public.categories FOR SELECT 
USING (true);

-- Solo administradores autenticados pueden crear, actualizar o borrar categorías
CREATE POLICY "Admin manage categories" 
ON public.categories FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- POLICIES: PRODUCTS
-- Cualquier visitante puede consultar productos activos
CREATE POLICY "Public read products" 
ON public.products FOR SELECT 
USING (is_active = true);

-- Administradores autenticados pueden ver y gestionar todos los productos
CREATE POLICY "Admin manage products" 
ON public.products FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- POLICIES: LEADS
-- Visitantes públicos pueden registrar cotizaciones (INSERT)
CREATE POLICY "Public create leads" 
ON public.leads FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Solo administradores autenticados pueden consultar y actualizar leads
CREATE POLICY "Admin read and manage leads" 
ON public.leads FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. STORAGE BUCKETS (Para imágenes y fichas técnicas en PDF)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('product-images', 'product-images', true),
    ('product-docs', 'product-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Lectura pública de imágenes y PDFs
CREATE POLICY "Public read product images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Public read product docs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-docs');

-- Storage Policies: Solo usuarios autenticados suben o eliminan archivos
CREATE POLICY "Admin upload product images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Admin upload product docs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'product-docs');

CREATE POLICY "Admin delete product images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'product-images');

CREATE POLICY "Admin delete product docs" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'product-docs');

-- 7. INITIAL CATEGORIES SEED DATA
INSERT INTO public.categories (name, slug, display_order) VALUES
    ('Refrigeradores', 'refrigeradores', 1),
    ('Congeladores', 'congeladores', 2),
    ('Procesamiento', 'procesamiento', 3),
    ('Sierras y rebanadoras', 'sierras-y-rebanadoras', 4),
    ('Healthcare', 'healthcare', 5),
    ('Smart', 'smart', 6),
    ('Home', 'home', 7),
    ('Cuartos fríos', 'cuartos-frios', 8)
ON CONFLICT (slug) DO NOTHING;
