async function initCatalog() {
    const SUPABASE_REST_URL = 'https://qezrauybkpzcenqilwcw.supabase.co/rest/v1';
    const SUPABASE_REST_HEADERS = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlenJhdXlia3B6Y2VucWlsd2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mzk1OTIsImV4cCI6MjEwNzUxNTU5Mn0.KTLV5uA8ZWYmdJ9QexaY0G1ZzuWDr5CZTsBldSOk2-w',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlenJhdXlia3B6Y2VucWlsd2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mzk1OTIsImV4cCI6MjEwNzUxNTU5Mn0.KTLV5uA8ZWYmdJ9QexaY0G1ZzuWDr5CZTsBldSOk2-w'
    };

    function getSb() {
        if (window.imberaSupabase && typeof window.imberaSupabase.client === 'function') {
            const c = window.imberaSupabase.client();
            if (c) return c;
        }
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            return supabase.createClient('https://qezrauybkpzcenqilwcw.supabase.co', SUPABASE_REST_HEADERS.apikey);
        }
        return null;
    }
    const sb = getSb();
    
    const officialTree = [
        {
            name: 'Enfriadores',
            slug: 'enfriadores',
            subcategories: [
                { name: 'Enfriadores Verticales', slug: 'enfriadores-verticales' },
                { name: 'Enfriadores Cerveceros', slug: 'enfriadores-cerveceros' },
                { name: 'Enfriadores Verticales Especiales', slug: 'enfriadores-verticales-especiales' },
                { name: 'Enfriadores Ecoinverter', slug: 'enfriadores-ecoinverter' },
                { name: 'Enfriadores Inverter + Bluetooth', slug: 'enfriadores-inverter-bluetooth' },
                { name: 'Línea Cobalt', 'slug': 'linea-cobalt' },
                { name: 'Enfriador horizontal', slug: 'enfriador-horizontal' }
            ]
        },
        {
            name: 'Healthcare',
            slug: 'healthcare',
            subcategories: [
                { name: 'Refrigeradores para consultorios', slug: 'refrigeradores-para-consultorios' },
                { name: 'Refrigeradores para hospitales', slug: 'refrigeradores-para-hospitales' },
                { name: 'Refrigeradores para laboratorios', slug: 'refrigeradores-para-laboratorios' }
            ]
        },
        { name: 'Home Cooler', slug: 'home-cooler', subcategories: [] },
        {
            name: 'Congeladores',
            slug: 'congeladores',
            subcategories: [
                { name: 'Congeladores horizontales', slug: 'congeladores-horizontales' },
                { name: 'Congeladores verticales', slug: 'congeladores-verticales' },
                { name: 'Congeladores horizontal doble temperatura', slug: 'congeladores-horizontal-doble-temperatura' },
                { name: 'Congeladores horizontal Pta. Cristal', slug: 'congeladores-horizontal-pta-cristal' }
            ]
        },
        { name: 'Fábricas de Hielo', slug: 'fabricas-de-hielo', subcategories: [] },
        { name: 'Conservadores de Hielo', slug: 'conservadores-de-hielo', subcategories: [] },
        {
            name: 'Vitrinas',
            slug: 'vitrinas',
            subcategories: [
                { name: 'Vitrinas Cremeras', slug: 'vitrinas-cremeras' },
                { name: 'Vitrinas Carniceras', slug: 'vitrinas-carniceras' }
            ]
        },
        { name: 'Cortinas de Aire', slug: 'cortinas-de-aire', subcategories: [] },
        { name: 'Línea Profesional', slug: 'linea-profesional', subcategories: [] },
        { name: 'Cámaras de Conservación', slug: 'camaras-de-conservacion', subcategories: [] },
        {
            name: 'Procesamiento y pesaje',
            slug: 'procesamiento-y-pesaje',
            subcategories: [
                { name: 'Pesaje', slug: 'pesaje' },
                { name: 'Rebanadoras', slug: 'rebanadoras' },
                { name: 'Molinos', slug: 'molinos' },
                { name: 'Sierras', slug: 'sierras' }
            ]
        },
        { name: 'Cocción', slug: 'coccion', subcategories: [] },
        { name: 'Procesamiento', slug: 'procesamiento', subcategories: [] },
        { name: 'Accesorios', slug: 'accesorios', subcategories: [] }
    ];

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = (urlParams.get('q') || '').trim();
    let selectedCatSlug = urlParams.get('cat') || '';
    let selectedSubSlug = urlParams.get('sub') || '';

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    if (!selectedCatSlug && !searchQuery) {
        const segments = window.location.pathname.split('/').filter(p => p && !p.endsWith('.html') && p !== 'categoria');
        if (segments.length >= 1) selectedCatSlug = segments[0];
        if (segments.length >= 2) selectedSubSlug = segments[1];
    }
    if (!selectedCatSlug && !searchQuery) selectedCatSlug = 'enfriadores';

    let dbCategories = [];
    let dbProducts = [];
    let currentNoticeHtml = '';

    // DOM Elements
    const categoryTreeEl = document.getElementById('categoryTree');
    const heroTitleEl = document.getElementById('categoryHeroTitle');
    const breadcrumbsSubEl = document.getElementById('breadcrumbSub');
    const catalogGridEl = document.getElementById('catalogGrid');
    const resultsCountEl = document.getElementById('resultsCount');

    async function fetchCategoriesList() {
        if (dbCategories && dbCategories.length > 0) return dbCategories;

        const client = getSb();
        if (client) {
            try {
                const { data, error } = await client.from('categories').select('*').order('display_order');
                if (data && !error && data.length > 0) {
                    dbCategories = data;
                    return dbCategories;
                }
            } catch(e) {
                console.warn('client categories query error:', e);
            }
        }
        // Direct REST fallback
        try {
            const res = await fetch(`${SUPABASE_REST_URL}/categories?select=*&order=display_order`, {
                headers: SUPABASE_REST_HEADERS
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    dbCategories = data;
                    return dbCategories;
                }
            }
        } catch(e) {
            console.warn('REST categories query error:', e);
        }

        // Static In-Memory Baseline Fallback (Offline Resilience)
        if (window.IMBERA_DATA && Array.isArray(window.IMBERA_DATA.categories) && window.IMBERA_DATA.categories.length > 0) {
            dbCategories = window.IMBERA_DATA.categories;
            return dbCategories;
        }

        return dbCategories || [];
    }

    await fetchCategoriesList();

    // Build hierarchy map
    const parents = dbCategories.filter(c => !c.parent_id);
    const categoryMap = parents.map(p => {
        const subs = dbCategories.filter(s => s.parent_id === p.id);
        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            subcategories: subs.map(s => ({ id: s.id, name: s.name, slug: s.slug }))
        };
    });

    const activeTree = categoryMap.length > 0 ? categoryMap : officialTree;

    // 2. Render Sidebar Category Tree
    renderSidebarTree(activeTree);

    // 3. Update Titles & Breadcrumbs
    updateHeaderAndBreadcrumbs(activeTree);

    // 4. Fetch and Render Products
    await loadProducts();

    function renderSidebarTree(tree) {
        if (!categoryTreeEl) return;

        categoryTreeEl.innerHTML = tree.map(cat => {
            const isCatActive = (cat.slug === selectedCatSlug);
            const hasSubs = cat.subcategories && cat.subcategories.length > 0;

            return `
                <li class="cat-item ${isCatActive ? 'active expanded' : ''}">
                    <div class="cat-parent-row">
                        <a href="/categoria?cat=${cat.slug}" class="cat-parent-link ${isCatActive && !selectedSubSlug ? 'selected' : ''}">
                            ${cat.name}
                        </a>
                        ${hasSubs ? `<button type="button" class="btn-toggle-sub" data-target="sub-${cat.slug}"><i class="fa-solid ${isCatActive ? 'fa-minus' : 'fa-plus'}"></i></button>` : ''}
                    </div>
                    ${hasSubs ? `
                        <ul class="sub-cat" id="sub-${cat.slug}" style="${isCatActive ? 'display: block;' : 'display: none;'}">
                            ${cat.subcategories.map(sub => {
                                const isSubActive = (sub.slug === selectedSubSlug);
                                return `
                                    <li class="${isSubActive ? 'active' : ''}">
                                        <a href="/categoria?cat=${cat.slug}&sub=${sub.slug}" class="${isSubActive ? 'selected' : ''}">
                                            ${sub.name}
                                        </a>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    ` : ''}
                </li>
            `;
        }).join('');

        // Attach accordion click events
        document.querySelectorAll('.btn-toggle-sub').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetId = btn.getAttribute('data-target');
                const subUl = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                if (subUl) {
                    const isVisible = subUl.style.display === 'block';
                    subUl.style.display = isVisible ? 'none' : 'block';
                    if (icon) {
                        icon.classList.toggle('fa-plus', isVisible);
                        icon.classList.toggle('fa-minus', !isVisible);
                    }
                }
            });
        });
    }

    function updateHeaderAndBreadcrumbs(tree) {
        if (searchQuery) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery);
            const titleText = isUuid ? 'Búsqueda de Equipos' : `Búsqueda: "${searchQuery}"`;
            document.title = `${titleText} | Catálogo Oficial Imbera México`;
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = isUuid
                ? 'Resultados de búsqueda en el catálogo oficial de refrigeración comercial Imbera México.'
                : `Resultados de búsqueda para "${searchQuery}" en el catálogo oficial de refrigeración comercial Imbera México.`;

            if (heroTitleEl) {
                heroTitleEl.innerText = titleText;
            }

            if (breadcrumbsSubEl) {
                breadcrumbsSubEl.innerHTML = isUuid
                    ? `<a href="/categoria">Catálogo</a> | <span>Búsqueda de Equipos</span>`
                    : `<a href="/categoria">Catálogo</a> | <span>Búsqueda: <strong>"${escapeHtml(searchQuery)}"</strong></span>`;
            }

            const searchInput = document.querySelector('.search-form input[name="q"], .search-form input[type="text"], .search-form input:not([type="hidden"])');
            if (searchInput) {
                searchInput.value = isUuid ? '' : searchQuery;
            }
            return;
        }

        const currentCat = tree.find(c => c.slug === selectedCatSlug) || tree[0];
        const currentSub = currentCat?.subcategories?.find(s => s.slug === selectedSubSlug);
        const titleText = currentSub ? currentSub.name : (currentCat ? currentCat.name : 'Catálogo de Equipos');

        // Dynamic SEO Page Title & Description
        document.title = `${titleText} | Catálogo Oficial Imbera México`;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = `Descubre los equipos de refrigeración comercial Imbera en la categoría ${titleText}. Alta eficiencia energética, durabilidad y garantía oficial.`;

        // BreadcrumbList JSON-LD for Search Engines
        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Inicio",
                    "item": window.location.origin + "/index.html"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": currentCat ? currentCat.name : "Catálogo",
                    "item": window.location.origin + `/categoria?cat=${currentCat?.slug || ''}`
                }
            ]
        };
        if (currentSub) {
            breadcrumbSchema.itemListElement.push({
                "@type": "ListItem",
                "position": 3,
                "name": currentSub.name,
                "item": window.location.href
            });
        }
        let bcScript = document.getElementById('schema-breadcrumbs');
        if (!bcScript) {
            bcScript = document.createElement('script');
            bcScript.id = 'schema-breadcrumbs';
            bcScript.type = 'application/ld+json';
            document.head.appendChild(bcScript);
        }
        bcScript.text = JSON.stringify(breadcrumbSchema);

        if (heroTitleEl) {
            heroTitleEl.innerText = titleText;
        }

        if (breadcrumbsSubEl) {
            if (currentSub) {
                breadcrumbsSubEl.innerHTML = `<a href="/categoria?cat=${currentCat.slug}">${currentCat.name}</a> | <span>${currentSub.name}</span>`;
            } else if (currentCat) {
                breadcrumbsSubEl.innerHTML = `<span>${currentCat.name}</span>`;
            }
        }
    }

    // Algoritmo Inteligente de Búsqueda y Modelos Cercanos
    function executeSmartSearch(query, products) {
        if (!query || !products || products.length === 0) {
            return { items: [], mode: 'empty', query: '' };
        }

        const clean = query.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
        if (isUuid) {
            const direct = products.filter(p => p.id === clean);
            if (direct.length > 0) return { items: direct, mode: 'exact', query: clean, isUuid: true };
        }

        const norm = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
        const tokens = clean.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0);

        // Padding de modelos de 1 dígito (ej. vr4 <-> vr04)
        const padMatch = norm.match(/^([a-z]+)(\d+)$/);
        let zeroPadded = null;
        let zeroStripped = null;
        if (padMatch) {
            const pfx = padMatch[1];
            const num = padMatch[2];
            if (num.length === 1) zeroPadded = `${pfx}0${num}`;
            if (num.startsWith('0') && num.length > 1) zeroStripped = `${pfx}${parseInt(num, 10)}`;
        }

        // 1. COINCIDENCIAS DIRECTAS / EXACTAS / NORMALIZADAS
        const exactMatches = [];
        products.forEach(p => {
            const mNorm = (p.model_code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const cNorm = (p.commercial_name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const sNorm = (p.sku || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const catName = (p.categories?.name || '').toLowerCase();
            const catSlug = (p.categories?.slug || '').toLowerCase();

            let score = 0;

            // Coincidencia por código de modelo
            if (mNorm === norm || (zeroPadded && mNorm === zeroPadded) || (zeroStripped && mNorm === zeroStripped)) {
                score += 120;
            } else if (mNorm.startsWith(norm)) {
                score += 70;
            } else if (mNorm.includes(norm)) {
                score += 45;
            }

            // Coincidencia por SKU numérico
            if (sNorm === norm) {
                score += 100;
            } else if (sNorm.includes(norm)) {
                score += 50;
            }

            // Coincidencia por nombre comercial
            if (cNorm.includes(norm)) {
                score += 35;
            }

            // Coincidencia multi-término (ej. "vr 17", "g3d 42", "enfriador blanco")
            if (tokens.length > 1) {
                const allTokensFound = tokens.every(t => 
                    (p.commercial_name || '').toLowerCase().includes(t) ||
                    (p.model_code || '').toLowerCase().includes(t) ||
                    (p.sku || '').toLowerCase().includes(t) ||
                    catName.includes(t)
                );
                if (allTokensFound) score += 60;
            }

            // Sinónimos comunes de refrigeración comercial
            if (/refrig|refri|enfriad|nevera/i.test(norm) && (catSlug === 'enfriadores' || cNorm.includes('enf') || catSlug === 'healthcare')) score += 30;
            if (/congelad|freezer/i.test(norm) && (catSlug === 'congeladores' || cNorm.includes('con'))) score += 30;
            if (/vitrina|cremera|carnic/i.test(norm) && (catSlug === 'vitrinas' || cNorm.includes('vmc'))) score += 30;
            if (/cervec|beer|cerveza/i.test(norm) && (cNorm.includes('ccv') || catSlug.includes('cervec'))) score += 30;
            if (/pesaj|bascul|balanz|peso/i.test(norm) && (cNorm.includes('bpk') || cNorm.includes('br') || catSlug.includes('pesaj'))) score += 30;
            if (/rebanad|cortad/i.test(norm) && (cNorm.includes('rpk') || catSlug.includes('rebanad'))) score += 30;
            if (/hielo|hielera/i.test(norm) && catSlug.includes('hielo')) score += 30;
            if (/microonda|horno/i.test(norm) && cNorm.includes('microondas')) score += 30;

            if (score > 0) {
                exactMatches.push({ product: p, score });
            }
        });

        if (exactMatches.length > 0) {
            exactMatches.sort((a, b) => b.score - a.score);
            return {
                items: exactMatches.map(e => e.product),
                mode: 'exact',
                query: clean,
                isUuid: isUuid
            };
        }

        // 2. MODELOS CERCANOS EN LA MISMA FAMILIA (Ej: vr05, vr18, vr4, ccv100, g3d40)
        const familyRegex = /^([a-z]+)(\d+(?:\.\d+)?)$/i;
        const famMatch = norm.match(familyRegex);
        if (famMatch) {
            const prefix = famMatch[1];
            const targetNum = parseFloat(famMatch[2]);

            const familyMatches = [];
            products.forEach(p => {
                const mNorm = (p.model_code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const pMatch = mNorm.match(new RegExp(`^${prefix}(\\d+(?:\\.\\d+)?)`));
                if (pMatch) {
                    const pNum = parseFloat(pMatch[1]);
                    const diff = Math.abs(pNum - targetNum);
                    familyMatches.push({ product: p, diff });
                }
            });

            if (familyMatches.length > 0) {
                familyMatches.sort((a, b) => a.diff - b.diff);
                const seen = new Set();
                const deduped = [];
                for (const f of familyMatches) {
                    const code = f.product.model_code;
                    if (!seen.has(code)) {
                        seen.add(code);
                        deduped.push(f.product);
                    }
                    if (deduped.length >= 9) break;
                }
                return {
                    items: deduped,
                    mode: 'close_family',
                    family: prefix.toUpperCase(),
                    query: clean
                };
            }
        }

        // 3. Coincidencia por prefijo general (ej. búsqueda de "vr", "ccv", "vmc", "g3")
        if (norm.length >= 2) {
            const prefixProds = products.filter(p => {
                const mNorm = (p.model_code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return mNorm.startsWith(norm);
            });
            if (prefixProds.length > 0) {
                return {
                    items: prefixProds,
                    mode: 'close_family',
                    family: norm.toUpperCase(),
                    query: clean
                };
            }
        }

        // 4. FALLBACK GLOBAL: Equipos insignia y populares
        const fallbackCodes = ['VR17', 'G3D42', 'VR08', 'CCV320', 'VR04', 'VMC05A', 'VR19', 'VR11', 'VR20'];
        const fallbackItems = products.filter(p => fallbackCodes.includes(p.model_code) || p.is_featured).slice(0, 8);

        return {
            items: fallbackItems.length > 0 ? fallbackItems : products.slice(0, 8),
            mode: 'popular_fallback',
            query: clean
        };
    }

    async function fetchCategoryProducts(targetIds) {
        if (!targetIds || targetIds.length === 0) return [];
        const client = getSb();
        if (client) {
            try {
                const { data, error } = await client.from('products').select('*, categories(*)').eq('is_active', true).in('category_id', targetIds);
                if (!error && data) return data;
            } catch(e) {
                console.warn('client products query error:', e);
            }
        }
        // Direct REST fallback
        try {
            const idsList = targetIds.map(encodeURIComponent).join(',');
            const res = await fetch(`${SUPABASE_REST_URL}/products?select=*,categories(*)&is_active=eq.true&category_id=in.(${idsList})`, {
                headers: SUPABASE_REST_HEADERS
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) return data;
            }
        } catch(e) {
            console.warn('REST products query error:', e);
        }
        return [];
    }

    async function fetchAllActiveProducts() {
        // 1. In-memory global cache during current page lifecycle
        if (window.__imberaAllProducts && Array.isArray(window.__imberaAllProducts) && window.__imberaAllProducts.length > 0) {
            return window.__imberaAllProducts;
        }

        let products = null;

        // 2. Supabase Client (First try with join, then try raw)
        const client = getSb();
        if (client) {
            try {
                const { data, error } = await client.from('products').select('*, categories(*)').eq('is_active', true);
                if (!error && Array.isArray(data) && data.length > 0) {
                    products = data;
                }
            } catch(e) {
                console.warn('client all products with join query error:', e);
            }

            if (!products) {
                try {
                    const { data, error } = await client.from('products').select('*').eq('is_active', true);
                    if (!error && Array.isArray(data) && data.length > 0) {
                        products = data;
                    }
                } catch(e) {
                    console.warn('client raw products query error:', e);
                }
            }
        }

        // 3. Direct REST fallback (with join, then raw)
        if (!products) {
            try {
                const res = await fetch(`${SUPABASE_REST_URL}/products?select=*,categories(*)&is_active=eq.true`, {
                    headers: SUPABASE_REST_HEADERS
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        products = data;
                    }
                }
            } catch(e) {
                console.warn('REST all products with join query error:', e);
            }
        }

        if (!products) {
            try {
                const res = await fetch(`${SUPABASE_REST_URL}/products?select=*&is_active=eq.true`, {
                    headers: SUPABASE_REST_HEADERS
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        products = data;
                    }
                }
            } catch(e) {
                console.warn('REST raw products query error:', e);
            }
        }

        // 4. Fallback to static in-memory baseline if Supabase is offline/fails
        if (!products && window.IMBERA_DATA && Array.isArray(window.IMBERA_DATA.products) && window.IMBERA_DATA.products.length > 0) {
            products = window.IMBERA_DATA.products;
        }

        if (Array.isArray(products) && products.length > 0) {
            window.__imberaAllProducts = products;
            return products;
        }

        return [];
    }

    async function loadProducts() {
        if (!catalogGridEl) return;
        catalogGridEl.innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 50px 0;"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-2 text-muted">Cargando equipos...</p></div>';

        try {
            await fetchCategoriesList();
            const allActive = await fetchAllActiveProducts();

            // Asegurar que cada producto tenga su categoría resuelta
            allActive.forEach(p => {
                if (Array.isArray(p.categories)) {
                    p.categories = p.categories.length > 0 ? p.categories[0] : null;
                }
                if (!p.categories && dbCategories && dbCategories.length > 0 && p.category_id) {
                    p.categories = dbCategories.find(c => c.id === p.category_id) || null;
                }
                if (!p.category_id && p.categories?.id) {
                    p.category_id = p.categories.id;
                }
            });

            if (searchQuery) {
                if (allActive && allActive.length > 0) {
                    const outcome = executeSmartSearch(searchQuery, allActive);

                    // Si se buscó un UUID directo y sólo hay 1 producto, redirigir a detalle
                    if (outcome.isUuid && outcome.items.length === 1) {
                        const p = outcome.items[0];
                        const cleanSlug = typeof window.generateProductSlug === 'function' ? window.generateProductSlug(p) : p.sku;
                        window.location.replace(`/producto/${cleanSlug}`);
                        return;
                    }

                    dbProducts = outcome.items;
                    renderProductsGrid(outcome);
                    return;
                } else {
                    renderProductsGrid({ items: [], mode: 'empty', query: searchQuery });
                    return;
                }
            }

            // Modo Categoría
            let targetCatIds = [];
            let targetCatRecord = null;
            let targetSubRecord = null;

            if (selectedSubSlug) {
                const subClean = selectedSubSlug.toLowerCase().trim();
                targetSubRecord = dbCategories.find(c => (c.slug || '').toLowerCase().trim() === subClean);
                if (targetSubRecord) targetCatIds.push(targetSubRecord.id);
            }
            if (selectedCatSlug) {
                const catClean = selectedCatSlug.toLowerCase().trim();
                targetCatRecord = dbCategories.find(c => (c.slug || '').toLowerCase().trim() === catClean);
                if (targetCatRecord && !selectedSubSlug) {
                    targetCatIds.push(targetCatRecord.id);
                    // Incluir subcategorías hijas
                    const childIds = dbCategories.filter(c => c.parent_id === targetCatRecord.id).map(c => c.id);
                    targetCatIds.push(...childIds);
                }
            }

            // Filtrado resiliente: por ID de categoría, por join y por slug
            const matchedProducts = (allActive || []).filter(p => {
                const catObj = p.categories || dbCategories.find(c => c.id === p.category_id);
                const catObjSlug = (catObj?.slug || '').toLowerCase().trim();

                // 1. Coincidencia por ID directo (subcategoría o padre con hijas)
                if (targetCatIds.length > 0) {
                    if (targetCatIds.includes(p.category_id)) return true;
                    if (catObj && targetCatIds.includes(catObj.id)) return true;
                }

                // 2. Coincidencia por subcategoría seleccionada
                if (selectedSubSlug) {
                    const subClean = selectedSubSlug.toLowerCase().trim();
                    if (catObjSlug === subClean) return true;
                    if (targetSubRecord && p.category_id === targetSubRecord.id) return true;
                }

                // 3. Coincidencia por categoría padre seleccionada (cuando no hay subcategoría específica)
                if (selectedCatSlug && !selectedSubSlug) {
                    const catClean = selectedCatSlug.toLowerCase().trim();
                    if (catObjSlug === catClean) return true;
                    if (catObj && targetCatRecord && catObj.parent_id === targetCatRecord.id) return true;
                }

                return false;
            });

            dbProducts = matchedProducts;
            renderProductsGrid({ items: dbProducts, mode: 'category' });
            return;
        } catch(e) {
            console.error('Error al cargar productos:', e);
            renderProductsGrid({ items: [], mode: searchQuery ? 'empty' : 'category' });
        }
    }

    // Sorting functionality
    const sortSelectEl = document.getElementById('sortSelect');
    if (sortSelectEl) {
        sortSelectEl.addEventListener('change', () => {
            const val = sortSelectEl.value;
            let sorted = [...dbProducts];
            if (val === 'name_asc') {
                sorted.sort((a, b) => {
                    const nameA = a.model_code || a.commercial_name;
                    const nameB = b.model_code || b.commercial_name;
                    return nameA.localeCompare(nameB);
                });
            } else if (val === 'name_desc') {
                sorted.sort((a, b) => {
                    const nameA = a.model_code || a.commercial_name;
                    const nameB = b.model_code || b.commercial_name;
                    return nameB.localeCompare(nameA);
                });
            }
            renderProductsGrid(sorted);
        });
    }

    function renderProductsGrid(input) {
        let products = [];
        let mode = 'normal';
        let family = '';
        let query = searchQuery;
        let isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

        if (Array.isArray(input)) {
            products = input;
        } else if (input && typeof input === 'object') {
            products = input.items || [];
            mode = input.mode || 'normal';
            family = input.family || '';
            query = input.query || searchQuery;
            isUuid = input.isUuid || isUuid;
        }

        // Generar banner informativo según el modo de búsqueda
        if (mode === 'close_family') {
            currentNoticeHtml = `
                <div class="search-family-notice">
                    <div class="notice-icon"><i class="fa-solid fa-circle-info"></i></div>
                    <div class="notice-body">
                        <h3>Mostrando modelos de la serie <strong>${family}</strong> más cercanos</h3>
                        <p>No encontramos el modelo exacto "<strong>${escapeHtml(query)}</strong>", pero te recomendamos los siguientes equipos similares disponibles en el catálogo:</p>
                    </div>
                </div>
            `;
            if (resultsCountEl) {
                resultsCountEl.innerText = `${products.length} modelo${products.length === 1 ? '' : 's'} de la serie ${family} recomendados`;
            }
        } else if (mode === 'popular_fallback') {
            currentNoticeHtml = `
                <div class="search-family-notice fallback">
                    <div class="notice-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                    <div class="notice-body">
                        <h3>No encontramos coincidencias exactas para "<strong>${escapeHtml(query)}</strong>"</h3>
                        <p>Te mostramos nuestros equipos de refrigeración comercial más populares y solicitados:</p>
                    </div>
                </div>
            `;
            if (resultsCountEl) {
                resultsCountEl.innerText = `Mostrando ${products.length} equipos destacados`;
            }
        } else if (mode === 'exact') {
            currentNoticeHtml = '';
            if (resultsCountEl) {
                resultsCountEl.innerText = isUuid
                    ? `${products.length} resultado${products.length === 1 ? '' : 's'}`
                    : `${products.length} resultado${products.length === 1 ? '' : 's'} para "${query}"`;
            }
        } else if (resultsCountEl) {
            resultsCountEl.innerText = `Mostrando ${products.length} productos`;
        }

        if (!products || products.length === 0) {
            if (resultsCountEl) resultsCountEl.innerText = 'Mostrando 0 productos';

            if (mode === 'category' || !searchQuery) {
                catalogGridEl.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-box-open fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 20px; color: #475569; margin-bottom: 8px;">No hay equipos registrados en esta categoría</h3>
                        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Pronto agregaremos más modelos a esta sección. Te invitamos a conocer otros equipos disponibles en nuestro catálogo.</p>
                        <a href="/categoria" class="btn-view" style="display: inline-block; padding: 10px 24px; text-decoration: none;">Ver todo el catálogo</a>
                    </div>
                `;
            } else {
                const isUuidQuery = isUuid || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
                catalogGridEl.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-magnifying-glass fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 20px; color: #475569; margin-bottom: 8px;">${isUuidQuery ? 'Búsqueda de Equipos' : `No se encontraron productos para "${escapeHtml(query)}"`}</h3>
                        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">${isUuidQuery ? 'Ingresa el modelo (ej. VR17, G3D42), nombre o código en la barra de búsqueda.' : 'Intenta buscando por modelo (ej. VR17, G3D42, CCV), tipo de equipo o código numérico.'}</p>
                        <a href="/categoria" class="btn-view" style="display: inline-block; padding: 10px 24px; text-decoration: none;">Ver todo el catálogo</a>
                    </div>
                `;
            }
            return;
        }

        // Cache products into sessionStorage for 0ms instant loading upon click
        products.forEach(p => {
            try {
                if (p.sku) sessionStorage.setItem('imbera_prod_sku_' + p.sku, JSON.stringify(p));
                if (p.model_code) {
                    const mSlug = p.model_code.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                    sessionStorage.setItem('imbera_prod_slug_' + mSlug, JSON.stringify(p));
                }
            } catch(e) {}
        });

        const cardsHtml = products.map(p => {
            // Short model name preferred, fallback to commercial name
            const displayName = p.model_code || p.commercial_name;
            const cleanSlug = typeof window.generateProductSlug === 'function' ? window.generateProductSlug(p) : p.sku;
            const targetUrl = `/producto/${cleanSlug}`;

            return `
                <div class="catalog-item" data-href="${targetUrl}" role="link" tabindex="0" aria-label="Ver detalles de ${displayName}">
                    <div class="item-img">
                        <img src="${p.main_image || 'images/Enfriador_G3D42_Especial.jpg'}" alt="${displayName} - Código ${p.sku}" loading="lazy">
                    </div>
                    <div class="item-info">
                        <h3>${displayName}</h3>
                        <p>Código: <strong>${p.sku}</strong></p>
                        <a href="${targetUrl}" class="btn-view">Ver equipo</a>
                    </div>
                </div>
            `;
        }).join('');

        catalogGridEl.innerHTML = (currentNoticeHtml || '') + cardsHtml;
    }

    // Click and keyboard accessibility for catalog items
    if (catalogGridEl) {
        catalogGridEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-view');
            if (btn) return; // let natural link handle it
            const item = e.target.closest('.catalog-item');
            if (item && item.dataset.href) {
                window.location.href = item.dataset.href;
            }
        });

        catalogGridEl.addEventListener('keydown', (e) => {
            const item = e.target.closest('.catalog-item');
            if (item && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                if (item.dataset.href) {
                    window.location.href = item.dataset.href;
                }
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalog);
} else {
    initCatalog();
}

