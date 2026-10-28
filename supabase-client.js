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

// Helper universal para enmascarar URLs de Supabase Storage bajo el dominio principal
window.toProxiedStorageUrl = function(url) {
    if (!url || typeof url !== 'string') return url || '';
    return url.replace(/^https:\/\/qezrauybkpzcenqilwcw\.supabase\.co\/storage\/v1\/object\/public\//, '/storage/v1/object/public/');
};

// Generador de URLs limpias / SEO Slugs para productos (ej: /producto/vitrina-cremera-phs13-n)
window.generateProductSlug = function(product) {
    if (!product) return '';
    if (product.slug && typeof product.slug === 'string' && product.slug.length > 2) {
        return product.slug.toLowerCase().trim();
    }

    let prefix = '';
    const catName = (product.categories && product.categories.name) || product.subtitle || '';
    const catSlug = (product.categories && product.categories.slug) || '';

    if (catSlug) {
        prefix = catSlug
            .replace(/^enfriadores/, 'enfriador')
            .replace(/^congeladores/, 'congelador')
            .replace(/^vitrinas/, 'vitrina')
            .replace(/^rebanadoras/, 'rebanadora')
            .replace(/^sierras/, 'sierra')
            .replace(/^molinos/, 'molino')
            .replace(/^fabricas-de-hielo/, 'fabrica-de-hielo')
            .replace(/^conservadores-de-hielo/, 'conservador-de-hielo')
            .replace(/^cortinas-de-aire/, 'cortina-de-aire')
            .replace(/^camaras-de-conservacion/, 'camara-de-conservacion')
            .replace(/^refrigeradores-para-/, 'refrigerador-')
            .replace(/-verticales$/, '-vertical')
            .replace(/-horizontales$/, '-horizontal')
            .replace(/-cerveceros$/, '-cervecero')
            .replace(/-cremeras$/, '-cremera')
            .replace(/-carniceras$/, '-carnicera')
            .replace(/-especiales$/, '-especial')
            .replace(/-ecoinverter$/, '-ecoinverter');
    } else if (catName) {
        prefix = catName.split('|')[0].trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-');
    }

    let model = (product.model_code || product.commercial_name || product.sku || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    let slug = prefix ? `${prefix}-${model}` : model;
    slug = slug.replace(/--+/g, '-').replace(/^-+|-+$/g, '');
    return slug || (product.sku ? `producto-${product.sku}` : 'equipo');
};

window.imberaSupabase = {
    client: () => supabaseClient || (typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null),
    url: SUPABASE_URL,
    proxiedUrl: window.toProxiedStorageUrl,
    slug: window.generateProductSlug
};
