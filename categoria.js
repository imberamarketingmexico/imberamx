// ==============================================================================
// CATEGORIA.JS - Catálogo Dinámico con Categorías Padre y Subcategorías
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
    
    // Fallback static structure matching user list if offline or loading
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
        { name: 'Cuidado de la Salud', slug: 'cuidado-de-la-salud', subcategories: [] },
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

    // Read URL query params (?cat=... or ?sub=...)
    const urlParams = new URLSearchParams(window.location.search);
    let selectedCatSlug = urlParams.get('cat') || 'enfriadores';
    let selectedSubSlug = urlParams.get('sub') || '';

    let dbCategories = [];
    let dbProducts = [];

    // DOM Elements
    const categoryTreeEl = document.getElementById('categoryTree');
    const heroTitleEl = document.getElementById('categoryHeroTitle');
    const breadcrumbsSubEl = document.getElementById('breadcrumbSub');
    const catalogGridEl = document.getElementById('catalogGrid');
    const resultsCountEl = document.getElementById('resultsCount');

    // 1. Fetch Categories from Supabase or Fallback
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
        const currentCat = tree.find(c => c.slug === selectedCatSlug) || tree[0];
        const currentSub = currentCat?.subcategories?.find(s => s.slug === selectedSubSlug);

        if (heroTitleEl) {
            heroTitleEl.innerText = currentSub ? currentSub.name : (currentCat ? currentCat.name : 'Catálogo de Equipos');
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
                
                // If a subcategory or category is chosen, filter by category_id or parent
                if (dbCategories.length > 0) {
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
                if (data && !error && data.length > 0) {
                    dbProducts = data;
                    renderProductsGrid(dbProducts);
                    return;
                }
            }
        } catch(e) {}

        // Fallback default sample grid if no products yet in Supabase for this category
        renderFallbackGrid();
    }

    // Sorting functionality
    const sortSelectEl = document.getElementById('sortSelect');
    if (sortSelectEl) {
        sortSelectEl.addEventListener('change', () => {
            const val = sortSelectEl.value;
            let sorted = [...dbProducts];
            if (val === 'name_asc') {
                sorted.sort((a, b) => a.commercial_name.localeCompare(b.commercial_name));
            } else if (val === 'name_desc') {
                sorted.sort((a, b) => b.commercial_name.localeCompare(a.commercial_name));
            }
            renderProductsGrid(sorted);
        });
    }

    function renderProductsGrid(products) {
        if (resultsCountEl) resultsCountEl.innerText = `Mostrando ${products.length} productos`;

        if (!products || products.length === 0) {
            catalogGridEl.innerHTML = `
                <div style="grid-column: span 3; text-align: center; padding: 60px 20px;">
                    <i class="fa-solid fa-box-open fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                    <h3 style="font-size: 18px; color: #475569; margin-bottom: 8px;">No hay equipos registrados en esta categoría</h3>
                    <p style="color: #94a3b8; font-size: 14px;">Pronto agregaremos más modelos a esta sección.</p>
                </div>
            `;
            return;
        }

        catalogGridEl.innerHTML = products.map(p => {
            return `
                <div class="catalog-item">
                    <div class="item-img">
                        <img src="${p.main_image || 'images/Enfriador_G3D42_Especial.jpg'}" alt="${p.commercial_name}">
                    </div>
                    <div class="item-info">
                        <h3>${p.commercial_name}</h3>
                        <p>Código: <strong>${p.sku}</strong></p>
                        <a href="producto.html?sku=${encodeURIComponent(p.sku)}" class="btn-view">Ver equipo</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderFallbackGrid() {
        const sampleProducts = [
            { name: 'ENFRIADOR G3D42 ESPECIAL', code: '1030002', img: 'images/Enfriador_G3D42_Especial.jpg' },
            { name: 'ENFRIADOR VR17', code: '1024175', img: 'images/Enfriador_VR17.jpg' },
            { name: 'ENFRIADOR VR17 ESPECIAL', code: '1023825', img: 'images/Enfriador_VR17_especial.jpg' },
            { name: 'ENFRIADOR VMC19B', code: '1025843', img: 'images/Enfriador_VMC19B.jpg' }
        ];

        if (resultsCountEl) resultsCountEl.innerText = `Mostrando ${sampleProducts.length} productos`;

        catalogGridEl.innerHTML = sampleProducts.map(p => `
            <div class="catalog-item">
                <div class="item-img"><img src="${p.img}" alt="${p.name}"></div>
                <div class="item-info">
                    <h3>${p.name}</h3>
                    <p>Código: <strong>${p.code}</strong></p>
                    <a href="producto.html?sku=${p.code}" class="btn-view">Ver equipo</a>
                </div>
            </div>
        `).join('');
    }
});
