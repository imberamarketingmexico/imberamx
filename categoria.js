document.addEventListener('DOMContentLoaded', async () => {
    const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
    
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

    // DOM Elements
    const categoryTreeEl = document.getElementById('categoryTree');
    const heroTitleEl = document.getElementById('categoryHeroTitle');
    const breadcrumbsSubEl = document.getElementById('breadcrumbSub');
    const catalogGridEl = document.getElementById('catalogGrid');
    const resultsCountEl = document.getElementById('resultsCount');

    try {
        if (sb) {
            const { data, error } = await sb.from('categories').select('*').order('display_order');
            if (data && !error && data.length > 0) {
                dbCategories = data;
            }
        }
    } catch(e) {}

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
                        <a href="categoria.html?cat=${cat.slug}" class="cat-parent-link ${isCatActive && !selectedSubSlug ? 'selected' : ''}">
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
                                        <a href="categoria.html?cat=${cat.slug}&sub=${sub.slug}" class="${isSubActive ? 'selected' : ''}">
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
            const titleText = `Búsqueda: "${searchQuery}"`;
            document.title = `${titleText} | Catálogo Oficial Imbera México`;
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = `Resultados de búsqueda para "${searchQuery}" en el catálogo oficial de refrigeración comercial Imbera México.`;

            if (heroTitleEl) {
                heroTitleEl.innerText = titleText;
            }

            if (breadcrumbsSubEl) {
                breadcrumbsSubEl.innerHTML = `<a href="categoria.html">Catálogo</a> | <span>Búsqueda: <strong>"${escapeHtml(searchQuery)}"</strong></span>`;
            }

            const searchInput = document.querySelector('.search-form input');
            if (searchInput) {
                searchInput.value = searchQuery;
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
                    "item": window.location.origin + `/categoria.html?cat=${currentCat?.slug || ''}`
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
                breadcrumbsSubEl.innerHTML = `<a href="categoria.html?cat=${currentCat.slug}">${currentCat.name}</a> | <span>${currentSub.name}</span>`;
            } else if (currentCat) {
                breadcrumbsSubEl.innerHTML = `<span>${currentCat.name}</span>`;
            }
        }
    }

    async function loadProducts() {
        if (!catalogGridEl) return;
        catalogGridEl.innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 50px 0;"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-2 text-muted">Cargando equipos...</p></div>';

        try {
            if (sb) {
                let query = sb.from('products').select('*, categories(*)').eq('is_active', true);
                
                if (searchQuery) {
                    const cleanQ = searchQuery.replace(/[,()]/g, ' ').trim();
                    query = query.or(`commercial_name.ilike.%${cleanQ}%,model_code.ilike.%${cleanQ}%,sku.ilike.%${cleanQ}%,subtitle.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`);
                } else if (dbCategories.length > 0) {
                    if (selectedSubSlug) {
                        const targetSub = dbCategories.find(c => c.slug === selectedSubSlug);
                        if (targetSub) {
                            query = query.eq('category_id', targetSub.id);
                        }
                    } else if (selectedCatSlug) {
                        const targetParent = dbCategories.find(c => c.slug === selectedCatSlug && !c.parent_id);
                        if (targetParent) {
                            const childIds = dbCategories.filter(c => c.parent_id === targetParent.id).map(c => c.id);
                            const allRelevantIds = [targetParent.id, ...childIds];
                            query = query.in('category_id', allRelevantIds);
                        }
                    }
                }

                const { data, error } = await query;
                if (!error) {
                    dbProducts = data || [];
                    renderProductsGrid(dbProducts);
                    return;
                }
            }
        } catch(e) {}

        // Fallback default sample grid if no products yet in Supabase for this category
        if (!searchQuery) {
            renderFallbackGrid();
        } else {
            renderProductsGrid([]);
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

    function renderProductsGrid(products) {
        if (resultsCountEl) {
            resultsCountEl.innerText = searchQuery 
                ? `${products.length} resultado${products.length === 1 ? '' : 's'} para "${searchQuery}"`
                : `Mostrando ${products.length} productos`;
        }

        if (!products || products.length === 0) {
            if (searchQuery) {
                catalogGridEl.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-magnifying-glass fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 20px; color: #475569; margin-bottom: 8px;">No se encontraron productos para "${escapeHtml(searchQuery)}"</h3>
                        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Intenta con otro modelo, código numérico o categoría.</p>
                        <a href="categoria.html" class="btn-view" style="display: inline-block; padding: 10px 24px; text-decoration: none;">Ver todo el catálogo</a>
                    </div>
                `;
            } else {
                catalogGridEl.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-box-open fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 18px; color: #475569; margin-bottom: 8px;">No hay equipos registrados en esta categoría</h3>
                        <p style="color: #94a3b8; font-size: 14px;">Pronto agregaremos más modelos a esta sección.</p>
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

        catalogGridEl.innerHTML = products.map(p => {
            // Short model name preferred, fallback to commercial name
            const displayName = p.model_code || p.commercial_name;
            const modelSlug = (p.model_code || p.sku).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
            const catSlug = selectedCatSlug || 'enfriadores';
            const subSlug = selectedSubSlug || (p.categories?.slug || 'equipos');
            const targetUrl = `/${catSlug}/${subSlug}/${modelSlug}?sku=${encodeURIComponent(p.sku)}`;

            return `
                <div class="catalog-item" onclick="window.location.href='${targetUrl}'" role="link" tabindex="0" aria-label="Ver detalles de ${displayName}">
                    <div class="item-img">
                        <img src="${p.main_image || 'images/Enfriador_G3D42_Especial.jpg'}" alt="${displayName} - Código ${p.sku}" loading="lazy">
                    </div>
                    <div class="item-info">
                        <h3>${displayName}</h3>
                        <p>Código: <strong>${p.sku}</strong></p>
                        <a href="${targetUrl}" class="btn-view" onclick="event.stopPropagation();">Ver equipo</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderFallbackGrid() {
        const sampleProducts = [
            { name: 'G3D42 ESPECIAL', code: '1030002', img: 'images/Enfriador_G3D42_Especial.jpg' },
            { name: 'VR17', code: '1024175', img: 'images/Enfriador_VR17.jpg' },
            { name: 'VR17 ESPECIAL', code: '1023825', img: 'images/Enfriador_VR17_especial.jpg' },
            { name: 'VMC19B', code: '1025843', img: 'images/Enfriador_VMC19B.jpg' }
        ];

        if (resultsCountEl) resultsCountEl.innerText = `Mostrando ${sampleProducts.length} productos`;

        catalogGridEl.innerHTML = sampleProducts.map(p => {
            const modelSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const targetUrl = `/enfriadores/enfriadores-verticales/${modelSlug}?sku=${encodeURIComponent(p.code)}`;
            return `
                <div class="catalog-item" onclick="window.location.href='${targetUrl}'" role="link" tabindex="0" aria-label="Ver detalles de ${p.name}">
                    <div class="item-img"><img src="${p.img}" alt="${p.name} - Código ${p.code}" loading="lazy"></div>
                    <div class="item-info">
                        <h3>${p.name}</h3>
                        <p>Código: <strong>${p.code}</strong></p>
                        <a href="${targetUrl}" class="btn-view" onclick="event.stopPropagation();">Ver equipo</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Keyboard accessibility: Enter or Space activates card link
    if (catalogGridEl) {
        catalogGridEl.addEventListener('keydown', (e) => {
            const item = e.target.closest('.catalog-item');
            if (item && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                item.click();
            }
        });
    }
});
