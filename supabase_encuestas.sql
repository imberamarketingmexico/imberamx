-- ==============================================================================
-- IMBERA SCORECARD COMERCIAL: TABLAS DE ENCUESTAS Y VISITAS
-- ==============================================================================

-- 1. TABLA DE RESPUESTAS DE ENCUESTAS
CREATE TABLE IF NOT EXISTS public.encuesta_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Pregunta 1
    p1_rating INTEGER CHECK (p1_rating BETWEEN 1 AND 5),
    p1_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    p1_other TEXT,
    
    -- Pregunta 2
    p2_rating INTEGER CHECK (p2_rating BETWEEN 1 AND 5),
    p2_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    p2_other TEXT,
    
    -- Pregunta 3
    p3_rating INTEGER CHECK (p3_rating BETWEEN 1 AND 5),
    p3_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    p3_other TEXT,
    
    -- Pregunta 4 (Escala 1 a 4)
    p4_rating INTEGER CHECK (p4_rating BETWEEN 1 AND 4),
    p4_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    p4_other TEXT,
    
    -- Pregunta 5 (Escala 1 a 4)
    p5_rating INTEGER CHECK (p5_rating BETWEEN 1 AND 4),
    
    -- Pregunta 6 (Radio)
    p6_answer TEXT,
    
    -- Pregunta 7 (Categorías Smart, Conectividad, IoT)
    p7_smart TEXT[] DEFAULT ARRAY[]::TEXT[],
    p7_conectividad TEXT[] DEFAULT ARRAY[]::TEXT[],
    p7_iot TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Pregunta 8 (Radio)
    p8_answer TEXT,
    
    -- Pregunta 9
    p9_rating INTEGER CHECK (p9_rating BETWEEN 1 AND 5),
    p9_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    p9_other TEXT,
    
    -- Pregunta 10
    p10_rating INTEGER CHECK (p10_rating BETWEEN 1 AND 5),
    p10_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    p10_other TEXT,
    
    -- Copia completa en formato JSON para máxima flexibilidad y exportación
    respuestas_json JSONB DEFAULT '{}'::jsonb
);

-- 2. TABLA DE SEGUIMIENTO DE VISITAS / APERTURAS (Métricas de Conversión)
CREATE TABLE IF NOT EXISTS public.encuesta_visitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completada BOOLEAN DEFAULT false,
    dispositivo TEXT DEFAULT 'desktop',
    duracion_segundos INTEGER DEFAULT 0
);

-- 3. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE public.encuesta_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuesta_visitas ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS PERMISIVAS PARA LA CLAVE ANON PÚBLICA
-- Permite insertar encuestas libremente desde el frontend
CREATE POLICY "Permitir insercion publica de encuestas" 
ON public.encuesta_respuestas FOR INSERT 
WITH CHECK (true);

-- Permite consultar encuestas para el panel superadmin protegido
CREATE POLICY "Permitir lectura de encuestas" 
ON public.encuesta_respuestas FOR SELECT 
USING (true);

-- Permite registrar visitas
CREATE POLICY "Permitir insercion de visitas" 
ON public.encuesta_visitas FOR INSERT 
WITH CHECK (true);

-- Permite consultar visitas para estadísticas
CREATE POLICY "Permitir lectura de visitas" 
ON public.encuesta_visitas FOR SELECT 
USING (true);

-- Permite actualizar visita a completada
CREATE POLICY "Permitir actualizacion de visitas" 
ON public.encuesta_visitas FOR UPDATE 
USING (true);
