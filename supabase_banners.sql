-- ==============================================================================
-- IMBERA B2B HERO BANNERS MANAGEMENT TABLE
-- Permite gestionar los banners del carrusel con versión desktop (apaisada),
-- versión móvil (más cuadrada) y enlace a cualquier parte de la página o sitio.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    desktop_image TEXT NOT NULL,
    mobile_image TEXT,
    link_url TEXT,
    target_blank BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Lectura pública para cualquier visitante
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" 
ON public.banners FOR SELECT 
USING (is_active = true);

-- Gestión para usuarios autenticados (Admin)
DROP POLICY IF EXISTS "Admin manage banners" ON public.banners;
CREATE POLICY "Admin manage banners" 
ON public.banners FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Política de demostración para clientes anónimos autorizados
DROP POLICY IF EXISTS "Anon manage banners demo" ON public.banners;
CREATE POLICY "Anon manage banners demo" 
ON public.banners FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- Sembrar banners iniciales por defecto si la tabla está vacía
INSERT INTO public.banners (title, desktop_image, mobile_image, link_url, target_blank, display_order, is_active)
SELECT 
    'Soluciones Imbera Refrigeración Comercial',
    'images/banner_pc_5.webp',
    'images/banner_pc_5.webp',
    'categoria.html?cat=enfriadores',
    false,
    1,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.banners LIMIT 1);

INSERT INTO public.banners (title, desktop_image, mobile_image, link_url, target_blank, display_order, is_active)
SELECT 
    'Línea Health & Laboratorio',
    'images/bannerHealth.webp',
    'images/bannerHealth.webp',
    'categoria.html?cat=salud-y-laboratorio',
    false,
    2,
    true
WHERE NOT EXISTS (SELECT 1 FROM public.banners WHERE title = 'Línea Health & Laboratorio');
