// Supabase Configuration
// Nota: La clave anon/publishable es pública por diseño y segura gracias a Row Level Security (RLS) en Supabase.
// La clave secreta (service_role) NUNCA debe colocarse en el frontend.

const SUPABASE_URL = 'https://qezrauybkpzcenqilwcw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlenJhdXlia3B6Y2VucWlsd2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mzk1OTIsImV4cCI6MjEwNzUxNTU5Mn0.KTLV5uA8ZWYmdJ9QexaY0G1ZzuWDr5CZTsBldSOk2-w';

// Inicializar cliente Supabase cuando la librería esté cargada
let supabaseClient = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

window.imberaSupabase = {
    client: () => supabaseClient || (typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null),
    url: SUPABASE_URL
};
