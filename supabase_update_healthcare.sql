-- ==============================================================================
-- ACTUALIZACIÓN: HEALTHCARE Y SUS SUBCATEGORÍAS
-- ==============================================================================

-- 1. Actualizar el nombre y slug de Cuidado de la Salud a Healthcare
UPDATE public.categories 
SET name = 'Healthcare', slug = 'healthcare' 
WHERE slug = 'cuidado-de-la-salud' OR id = '11111111-1111-1111-1111-111111111102';

-- Si no existía, insertarlo:
INSERT INTO public.categories (id, name, slug, display_order)
VALUES ('11111111-1111-1111-1111-111111111102', 'Healthcare', 'healthcare', 2)
ON CONFLICT (slug) DO UPDATE SET name = 'Healthcare';

-- 2. Insertar las 3 subcategorías de Healthcare
INSERT INTO public.categories (name, slug, parent_id, display_order)
VALUES 
    ('Refrigeradores para consultorios', 'refrigeradores-para-consultorios', '11111111-1111-1111-1111-111111111102', 1),
    ('Refrigeradores para hospitales', 'refrigeradores-para-hospitales', '11111111-1111-1111-1111-111111111102', 2),
    ('Refrigeradores para laboratorios', 'refrigeradores-para-laboratorios', '11111111-1111-1111-1111-111111111102', 3)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name, 
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order;
