-- ==============================================================================
-- ACTUALIZACIÓN SCHEMA: CATEGORÍAS PADRE Y SUBCATEGORÍAS IMBERA
-- ==============================================================================

-- 1. Agregar columna parent_id para jerarquía de subcategorías
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- 2. Limpiar categorías anteriores e insertar el árbol completo oficial
TRUNCATE TABLE public.categories CASCADE;

-- 3. INSERTAR CATEGORÍAS PRINCIPALES (PADRES)
INSERT INTO public.categories (id, name, slug, display_order) VALUES
    ('11111111-1111-1111-1111-111111111101', 'Enfriadores', 'enfriadores', 1),
    ('11111111-1111-1111-1111-111111111102', 'Healthcare', 'healthcare', 2),
    ('11111111-1111-1111-1111-111111111103', 'Home Cooler', 'home-cooler', 3),
    ('11111111-1111-1111-1111-111111111104', 'Congeladores', 'congeladores', 4),
    ('11111111-1111-1111-1111-111111111105', 'Fábricas de Hielo', 'fabricas-de-hielo', 5),
    ('11111111-1111-1111-1111-111111111106', 'Conservadores de Hielo', 'conservadores-de-hielo', 6),
    ('11111111-1111-1111-1111-111111111107', 'Vitrinas', 'vitrinas', 7),
    ('11111111-1111-1111-1111-111111111108', 'Cortinas de Aire', 'cortinas-de-aire', 8),
    ('11111111-1111-1111-1111-111111111109', 'Línea Profesional', 'linea-profesional', 9),
    ('11111111-1111-1111-1111-111111111110', 'Cámaras de Conservación', 'camaras-de-conservacion', 10),
    ('11111111-1111-1111-1111-111111111111', 'Procesamiento y pesaje', 'procesamiento-y-pesaje', 11),
    ('11111111-1111-1111-1111-111111111112', 'Cocción', 'coccion', 12),
    ('11111111-1111-1111-1111-111111111113', 'Procesamiento', 'procesamiento', 13),
    ('11111111-1111-1111-1111-111111111114', 'Accesorios', 'accesorios', 14)
ON CONFLICT (slug) DO NOTHING;

-- 4. INSERTAR SUBCATEGORÍAS
-- Subcategorías de Enfriadores
INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Enfriadores Verticales', 'enfriadores-verticales', '11111111-1111-1111-1111-111111111101', 1),
    ('Enfriadores Cerveceros', 'enfriadores-cerveceros', '11111111-1111-1111-1111-111111111101', 2),
    ('Enfriadores Verticales Especiales', 'enfriadores-verticales-especiales', '11111111-1111-1111-1111-111111111101', 3),
    ('Enfriadores Ecoinverter', 'enfriadores-ecoinverter', '11111111-1111-1111-1111-111111111101', 4),
    ('Enfriadores Inverter + Bluetooth', 'enfriadores-inverter-bluetooth', '11111111-1111-1111-1111-111111111101', 5),
    ('Línea Cobalt', 'linea-cobalt', '11111111-1111-1111-1111-111111111101', 6),
    ('Enfriador horizontal', 'enfriador-horizontal', '11111111-1111-1111-1111-111111111101', 7);

-- Subcategorías de Healthcare
INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Refrigeradores para consultorios', 'refrigeradores-para-consultorios', '11111111-1111-1111-1111-111111111102', 1),
    ('Refrigeradores para hospitales', 'refrigeradores-para-hospitales', '11111111-1111-1111-1111-111111111102', 2),
    ('Refrigeradores para laboratorios', 'refrigeradores-para-laboratorios', '11111111-1111-1111-1111-111111111102', 3);

-- Subcategorías de Congeladores
INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Congeladores horizontales', 'congeladores-horizontales', '11111111-1111-1111-1111-111111111104', 1),
    ('Congeladores verticales', 'congeladores-verticales', '11111111-1111-1111-1111-111111111104', 2),
    ('Congeladores horizontal doble temperatura', 'congeladores-horizontal-doble-temperatura', '11111111-1111-1111-1111-111111111104', 3),
    ('Congeladores horizontal Pta. Cristal', 'congeladores-horizontal-pta-cristal', '11111111-1111-1111-1111-111111111104', 4);

-- Subcategorías de Vitrinas
INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Vitrinas Cremeras', 'vitrinas-cremeras', '11111111-1111-1111-1111-111111111107', 1),
    ('Vitrinas Carniceras', 'vitrinas-carniceras', '11111111-1111-1111-1111-111111111107', 2);

-- Subcategorías de Procesamiento y pesaje
INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Pesaje', 'pesaje', '11111111-1111-1111-1111-111111111111', 1),
    ('Rebanadoras', 'rebanadoras', '11111111-1111-1111-1111-111111111111', 2),
    ('Molinos', 'molinos', '11111111-1111-1111-1111-111111111111', 3),
    ('Sierras', 'sierras', '11111111-1111-1111-1111-111111111111', 4);
