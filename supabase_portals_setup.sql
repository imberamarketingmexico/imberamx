-- ==============================================================================
-- IMBERA MÉXICO - TABLAS PARA PORTALES DE CLIENTES Y MICROSITIOS B2B
-- Ejecutar este script en el Editor SQL de Supabase (SQL Editor)
-- ==============================================================================

-- 1. Tabla de Portales / Micrositios de Clientes
CREATE TABLE IF NOT EXISTS public.client_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,                       -- ej. 'redbull', 'pepsi', 'monster'
    name TEXT NOT NULL,                              -- ej. 'Red Bull Merchandisers'
    title TEXT DEFAULT 'Merchandisers',              -- Título del hero
    subtitle TEXT DEFAULT 'Catálogo Exclusivo B2B',  -- Subtítulo
    logo_url TEXT,                                   -- URL del logotipo de la marca
    banner_url TEXT,                                 -- URL de la imagen de cabecera / hero banner
    primary_color TEXT DEFAULT '#0C2340',            -- Color primario (navbar / hero)
    accent_color TEXT DEFAULT '#DB0A40',             -- Color de acento (SKU, links, bordes)
    button_color TEXT DEFAULT '#0C2340',             -- Color de botones (Clear filters, etc.)
    button_text_color TEXT DEFAULT '#FFFFFF',        -- Color texto botones
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Equipos para Portales de Clientes
CREATE TABLE IF NOT EXISTS public.portal_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_slug TEXT NOT NULL,                       -- Slug del portal vinculado (ej. 'redbull')
    sku TEXT NOT NULL,                               -- Modelo / SKU (ej. 'PC8L-HC')
    title TEXT NOT NULL,                             -- Nombre comercial (ej. 'Slim Glass Door Cooler')
    image_url TEXT,                                  -- URL del render / foto
    description TEXT,                                -- Descriptivo del equipo
    
    -- Filtros estándar (idénticos a la referencia Aeritek)
    height_type TEXT DEFAULT 'Full Height',          -- 'Full Height', 'Low Profile', 'Countertop'
    door_count TEXT DEFAULT 'Single Door',           -- 'Single Door', 'Double Door', 'Triple Door', 'Open Air'
    door_style TEXT DEFAULT 'Hinge Door',            -- 'Hinge Door', 'Sliding Door', 'Open Air'
    pass_through BOOLEAN DEFAULT false,              -- Pass Thru
    
    -- Datos técnicos específicos (idénticos a la ficha técnica del usuario)
    cubic_ft TEXT,                                   -- ej. '9.67'
    width_in TEXT,                                   -- ej. '19.625'
    height_in TEXT,                                  -- ej. '74.25'
    depth_in TEXT,                                   -- ej. '24.625'
    voltage TEXT,                                    -- ej. '115 / 60 / 1'
    amps TEXT,                                       -- ej. '2.1'
    weight_lbs TEXT,                                 -- ej. '294'
    electrical_req TEXT DEFAULT 'NEMA 5-15P',        -- ej. 'NEMA 5-15P'
    
    spec_sheet_url TEXT,                             -- URL del PDF con ficha técnica oficial
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_portal_slug ON public.portal_products(portal_slug);
CREATE INDEX IF NOT EXISTS idx_client_portals_slug ON public.client_portals(slug);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_products ENABLE ROW LEVEL SECURITY;

-- 5. Políticas: Lectura pública (anónima) para visualizar los portales
CREATE POLICY "Public portals are viewable by everyone" 
ON public.client_portals FOR SELECT USING (is_active = true);

CREATE POLICY "Public portal products are viewable by everyone" 
ON public.portal_products FOR SELECT USING (is_active = true);

-- 6. Políticas: Escritura y gestión para administradores autenticados (o clave anon en admin)
CREATE POLICY "Admin full access client_portals" 
ON public.client_portals FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access portal_products" 
ON public.portal_products FOR ALL USING (true) WITH CHECK (true);
