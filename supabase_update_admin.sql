-- ==============================================================================
-- ACTUALIZACIÓN SCHEMA: SOPORTE PARA 3 PDFs, ANALYTICS Y BULK UPLOADS
-- ==============================================================================

-- 1. Agregar columnas para los 3 PDFs si no existen
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS manual_url TEXT,
ADD COLUMN IF NOT EXISTS parts_list_url TEXT;

-- 2. Tabla para registrar métricas/visitas del sitio (Analytics ligeros)
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_path TEXT NOT NULL,
    referrer TEXT,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para page_views
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert page_views" 
ON public.page_views FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Admin read page_views" 
ON public.page_views FOR SELECT 
TO authenticated 
USING (true);
