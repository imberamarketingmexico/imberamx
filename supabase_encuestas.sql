-- ==============================================================================
-- IMBERA SCORECARD COMERCIAL: TABLAS DE ENCUESTAS Y VISITAS
-- ==============================================================================

-- 1. TABLA DE RESPUESTAS DE ENCUESTAS
CREATE TABLE IF NOT EXISTS public.encuesta_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Datos del participante (Paso 0)
    nombre TEXT,
    empresa TEXT,
    rol TEXT,
    rol_otro TEXT,
    
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

-- 4. POLÍTICAS UNIVERSALES (APLICAN A VISITANTES ANÓNIMOS Y USUARIOS LOGUEADOS)
DROP POLICY IF EXISTS "Permitir insercion anonima respuestas" ON public.encuesta_respuestas;
DROP POLICY IF EXISTS "Permitir lectura anonima respuestas" ON public.encuesta_respuestas;
DROP POLICY IF EXISTS "Permitir insercion anonima visitas" ON public.encuesta_visitas;
DROP POLICY IF EXISTS "Permitir lectura anonima visitas" ON public.encuesta_visitas;
DROP POLICY IF EXISTS "Permitir insercion publica de encuestas" ON public.encuesta_respuestas;
DROP POLICY IF EXISTS "Permitir lectura de encuestas" ON public.encuesta_respuestas;
DROP POLICY IF EXISTS "Permitir insercion de visitas" ON public.encuesta_visitas;
DROP POLICY IF EXISTS "Permitir lectura de visitas" ON public.encuesta_visitas;
DROP POLICY IF EXISTS "Permitir actualizacion de visitas" ON public.encuesta_visitas;

CREATE POLICY "Permitir insercion encuestas universal" 
ON public.encuesta_respuestas FOR INSERT TO public 
WITH CHECK (true);

CREATE POLICY "Permitir lectura encuestas universal" 
ON public.encuesta_respuestas FOR SELECT TO public 
USING (true);

CREATE POLICY "Permitir insercion visitas universal" 
ON public.encuesta_visitas FOR INSERT TO public 
WITH CHECK (true);

CREATE POLICY "Permitir lectura visitas universal" 
ON public.encuesta_visitas FOR SELECT TO public 
USING (true);

-- 5. MIGRACIÓN: SI LA TABLA YA EXISTÍA, AGREGAR LAS COLUMNAS DE PARTICIPANTE
ALTER TABLE public.encuesta_respuestas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE public.encuesta_respuestas ADD COLUMN IF NOT EXISTS empresa TEXT;
ALTER TABLE public.encuesta_respuestas ADD COLUMN IF NOT EXISTS rol TEXT;
ALTER TABLE public.encuesta_respuestas ADD COLUMN IF NOT EXISTS rol_otro TEXT;
