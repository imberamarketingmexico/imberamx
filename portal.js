// ==============================================================================
// PORTAL.JS - Lógica de Micrositios de Clientes y Marcas B2B (ej. /redbull)
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Determinar el portal actual desde URL o pathname
    function getActivePortalSlug() {
        const urlParams = new URLSearchParams(window.location.search);
        const querySlug = urlParams.get('portal') || urlParams.get('brand') || urlParams.get('p');
        if (querySlug) return querySlug.toLowerCase().trim();

        const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
        const segments = pathname.split('/').filter(Boolean);
        
        // ej: /redbull o /portal/redbull
        if (segments.length === 1 && segments[0] !== 'portal' && !segments[0].endsWith('.html')) {
            return segments[0];
        }
        if (segments.length >= 2 && segments[0] === 'portal') {
            return segments[1].replace('.html', '');
        }

        // Si la página se llama redbull.html
        if (pathname.includes('redbull')) {
            return 'redbull';
        }

        return 'redbull'; // Default
    }

    const currentSlug = getActivePortalSlug();

    // DOM Elements
    const heroEl = document.getElementById('portalHero');
    const brandLogoEl = document.getElementById('portalBrandLogo');
    const brandFallbackEl = document.getElementById('portalBrandFallback');
    const heroTitleEl = document.getElementById('portalHeroTitle');
    const heroSubtitleEl = document.getElementById('portalHeroSubtitle');
    const productsGridEl = document.getElementById('portalProductsGrid');
    const resultsCountEl = document.getElementById('portalResultsCount');
    const clearFiltersBtn = document.getElementById('btnClearFilters');
    const drawerClearFiltersBtn = document.getElementById('btnDrawerClearFilters');
    
    // Mobile Drawer
    const btnOpenFilterDrawer = document.getElementById('btnOpenFilterDrawer');
    const btnCloseFilterDrawer = document.getElementById('btnCloseFilterDrawer');
    const drawerOverlay = document.getElementById('portalDrawerOverlay');

    // Modal Elements
    const modalOverlay = document.getElementById('portalModalOverlay');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalImg = document.getElementById('modalImg');
    const modalSku = document.getElementById('modalSku');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const btnModalSpecSheet = document.getElementById('btnModalSpecSheet');
    
    // Spec table cells (Exact 10 English fields)
    const specSku = document.getElementById('specSku');
    const specMaterialDesc = document.getElementById('specMaterialDesc');
    const specWidth = document.getElementById('specWidth');
    const specHeight = document.getElementById('specHeight');
    const specDepth = document.getElementById('specDepth');
    const specCubicFt = document.getElementById('specCubicFt');
    const specVoltage = document.getElementById('specVoltage');
    const specRefrigerant = document.getElementById('specRefrigerant');
    const specCanCapacity = document.getElementById('specCanCapacity');
    const specCertsRow = document.getElementById('specCertsRow');

    // Filter "Select All"
    const filterSelectAll = document.getElementById('filterSelectAll');
    const filterSelectAllDrawer = document.getElementById('filterSelectAllDrawer');

    // Data State
    let currentPortal = null;
    let portalProducts = [];
    let filteredProducts = [];

    // Helper universal para proxies de imágenes
    const toSafeUrl = (url) => {
        if (!url) return '';
        if (typeof window.toProxiedStorageUrl === 'function') {
            return window.toProxiedStorageUrl(url);
        }
        return url;
    };

    // 2. Cargar Datos del Portal y sus Productos
    async function loadPortalData() {
        const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;

        // a) Buscar en Supabase directamente (100% Online)
        let portalFoundOnline = false;
        let productsFoundOnline = false;

        if (sb) {
            try {
                const { data: pData, error: pErr } = await sb.from('client_portals').select('*').eq('slug', currentSlug).single();
                if (pData && !pErr) {
                    currentPortal = pData;
                    portalFoundOnline = true;
                }
            } catch(e) {
                console.warn('Error fetching portal from Supabase:', e);
            }

            try {
                const { data: prodsData, error: prodsErr } = await sb.from('portal_products').select('*').eq('portal_slug', currentSlug).eq('is_active', true).order('display_order');
                if (!prodsErr && Array.isArray(prodsData)) {
                    portalProducts = prodsData;
                    productsFoundOnline = true;
                }
            } catch(e) {
                console.warn('Error fetching portal products from Supabase:', e);
            }
        }

        // b) Fallback de contingencia ÚNICAMENTE si Supabase no estuvo disponible
        if (!portalFoundOnline && !currentPortal) {
            try {
                const localPortals = JSON.parse(localStorage.getItem('imbera_client_portals') || '[]');
                const found = localPortals.find(p => p.slug === currentSlug);
                if (found) currentPortal = found;
            } catch(e) {}
        }

        if (!productsFoundOnline && portalProducts.length === 0) {
            try {
                const localProds = JSON.parse(localStorage.getItem('imbera_portal_products') || '[]');
                const found = localProds.filter(p => p.portal_slug === currentSlug && p.is_active !== false);
                if (found && found.length > 0) portalProducts = found;
            } catch(e) {}
        }

        // c) Último recurso estático sólo si la base de datos estaba vacía o inaccesible
        if (!currentPortal && window.IMBERA_PORTALS_DATA && Array.isArray(window.IMBERA_PORTALS_DATA.portals)) {
            currentPortal = window.IMBERA_PORTALS_DATA.portals.find(p => p.slug === currentSlug) || window.IMBERA_PORTALS_DATA.portals[0];
        }

        if (!productsFoundOnline && portalProducts.length === 0 && window.IMBERA_PORTALS_DATA && Array.isArray(window.IMBERA_PORTALS_DATA.products)) {
            portalProducts = window.IMBERA_PORTALS_DATA.products.filter(p => p.portal_slug === currentSlug && p.is_active !== false);
        }

        // Aplicar configuraciones de diseño
        applyPortalBranding(currentPortal);

        // Renderizar productos
        filteredProducts = [...portalProducts];
        renderProducts(filteredProducts);
    }

    // 3. Aplicar colores y branding dinámico
    function applyPortalBranding(portal) {
        if (!portal) return;

        // Custom properties en CSS
        const root = document.documentElement;
        if (portal.primary_color) root.style.setProperty('--portal-primary', portal.primary_color);
        if (portal.accent_color) root.style.setProperty('--portal-accent', portal.accent_color);
        if (portal.button_color) root.style.setProperty('--portal-button', portal.button_color);
        if (portal.button_text_color) root.style.setProperty('--portal-button-text', portal.button_text_color);

        // SEO y Título de pestaña
        const portalName = portal.name || 'Portal B2B';
        const pageTitle = portal.title || 'Merchandisers';
        document.title = `${pageTitle} | ${portalName} - Imbera México`;

        // Banner Hero
        if (heroEl) {
            if (portal.banner_url) {
                heroEl.style.backgroundImage = `url('${toSafeUrl(portal.banner_url)}')`;
            } else {
                heroEl.style.backgroundImage = 'none';
                heroEl.style.backgroundColor = portal.primary_color || '#0C2340';
            }
        }

        // Logotipo de la marca
        if (brandLogoEl && brandFallbackEl) {
            if (portal.logo_url) {
                brandLogoEl.alt = portalName;
                brandLogoEl.onerror = function() {
                    if (currentSlug === 'redbull' && !this.dataset.fallbackTried) {
                        this.dataset.fallbackTried = 'true';
                        this.src = 'images/redbull-logo.svg';
                        return;
                    }
                    brandLogoEl.style.display = 'none';
                    brandFallbackEl.innerText = portalName;
                    brandFallbackEl.style.display = 'block';
                };
                brandLogoEl.src = toSafeUrl(portal.logo_url);
                brandLogoEl.style.display = 'block';
                brandFallbackEl.style.display = 'none';
            } else {
                brandLogoEl.style.display = 'none';
                brandFallbackEl.innerText = portalName;
                brandFallbackEl.style.display = 'block';
            }
        }

        // Títulos en hero
        if (heroTitleEl) heroTitleEl.innerText = portal.title || 'Merchandisers';
        if (heroSubtitleEl) heroSubtitleEl.innerText = portal.subtitle || '';
    }

    // 4. Renderizar cuadrícula de productos
    function renderProducts(items) {
        if (!productsGridEl) return;

        if (resultsCountEl) {
            resultsCountEl.innerText = `${items.length} merchandisers found.`;
        }

        if (!items || items.length === 0) {
            productsGridEl.innerHTML = `
                <div class="portal-empty-state">
                    <i class="fa-solid fa-filter-circle-xmark"></i>
                    <h3>No matching merchandisers</h3>
                    <p>Try selecting categories above to see more results.</p>
                </div>
            `;
            return;
        }

        productsGridEl.innerHTML = items.map(p => {
            const dims = formatDimensions(p);
            const imgSrc = toSafeUrl(p.image_url) || 'images/Enfriador_VR17.jpg';
            const modelName = p.title || p.sku || 'Merchandiser';
            const categoryName = p.category || p.door_count || 'Single door';

            return `
                <div class="portal-card" data-sku="${escapeHtml(p.sku)}">
                    <div class="portal-card-thumb-wrap">
                        <img src="${imgSrc}" alt="${escapeHtml(modelName)}" class="portal-card-thumb" loading="lazy" onerror="this.src='images/Enfriador_VR17.jpg'">
                    </div>
                    <span class="portal-card-sku">${escapeHtml(modelName)}</span>
                    <h3 class="portal-card-title">${escapeHtml(categoryName)}</h3>
                    <span class="portal-card-dims">${dims}</span>
                </div>
            `;
        }).join('');

        // Event listener a cada tarjeta para abrir el modal
        document.querySelectorAll('.portal-card').forEach(card => {
            card.addEventListener('click', () => {
                const sku = card.getAttribute('data-sku');
                const product = portalProducts.find(p => p.sku === sku);
                if (product) openProductModal(product);
            });
        });
    }

    function formatDimensions(p) {
        if (p.dimensions_text) return escapeHtml(p.dimensions_text);
        const w = p.width_in ? `${p.width_in}" (w)` : '';
        const h = p.height_in ? `${p.height_in}" (h)` : '';
        const d = p.depth_in ? `${p.depth_in}" (d)` : '';
        const parts = [w, h, d].filter(Boolean);
        return parts.length > 0 ? parts.join(' x ') : '';
    }

    // 5. Filtros Dinámicos (Solo 5 categorías exactas)
    function getSelectedCategories() {
        const checkedBoxes = document.querySelectorAll('.portal-filter-checkbox[data-group="category"]:checked');
        return Array.from(checkedBoxes).map(cb => cb.value.trim().toLowerCase());
    }

    function applyFilters() {
        const selectedCats = getSelectedCategories();
        const allCategoryCheckboxes = document.querySelectorAll('.portal-filter-checkbox[data-group="category"]');
        
        // Sync "Select all" state
        const allChecked = selectedCats.length === allCategoryCheckboxes.length && allCategoryCheckboxes.length > 0;
        if (filterSelectAll) filterSelectAll.checked = allChecked;
        if (filterSelectAllDrawer) filterSelectAllDrawer.checked = allChecked;

        if (selectedCats.length === 0) {
            filteredProducts = [];
        } else {
            filteredProducts = portalProducts.filter(p => {
                const cat = (p.category || p.door_count || '').trim().toLowerCase();
                return selectedCats.includes(cat);
            });
        }

        renderProducts(filteredProducts);
    }

    function toggleSelectAll(checked) {
        document.querySelectorAll('.portal-filter-checkbox[data-group="category"]').forEach(cb => {
            cb.checked = checked;
        });
        if (filterSelectAll) filterSelectAll.checked = checked;
        if (filterSelectAllDrawer) filterSelectAllDrawer.checked = checked;
        applyFilters();
    }

    function clearFilters() {
        toggleSelectAll(true);
    }

    // Sincronizar checkboxes entre desktop y drawer móvil
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('portal-filter-checkbox')) {
            const val = e.target.value;
            const checked = e.target.checked;
            document.querySelectorAll(`.portal-filter-checkbox[value="${val}"]`).forEach(cb => {
                cb.checked = checked;
            });
            applyFilters();
        } else if (e.target.id === 'filterSelectAll' || e.target.id === 'filterSelectAllDrawer') {
            toggleSelectAll(e.target.checked);
        }
    });

    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (drawerClearFiltersBtn) drawerClearFiltersBtn.addEventListener('click', clearFilters);

    // Mobile Drawer Controls
    if (btnOpenFilterDrawer && drawerOverlay) {
        btnOpenFilterDrawer.addEventListener('click', () => {
            drawerOverlay.classList.add('active');
        });
    }
    if (btnCloseFilterDrawer && drawerOverlay) {
        btnCloseFilterDrawer.addEventListener('click', () => {
            drawerOverlay.classList.remove('active');
        });
    }
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) {
                drawerOverlay.classList.remove('active');
            }
        });
    }

    // 6. Certificaciones SVG Helper
    function renderCertBadges(certStr) {
        if (!certStr) return '-';
        const str = String(certStr).toLowerCase();
        const badges = [];

        // Energy Star 4.0
        if (str.includes('energy') || str.includes('star')) {
            badges.push(`<img src="images/certs/energy-star.svg" alt="Energy Star 4.0" title="Energy Star 4.0" class="portal-cert-badge">`);
        }
        // UL NSF 7
        if (str.includes('nsf') || str.includes('ul')) {
            badges.push(`<img src="images/certs/ul-nsf.svg" alt="UL Classified NSF 7" title="UL Classified NSF 7" class="portal-cert-badge">`);
        }
        // DOE 17
        if (str.includes('doe')) {
            badges.push(`<img src="images/certs/doe-17.svg" alt="DOE 17 Compliant" title="DOE 17 Compliant" class="portal-cert-badge">`);
        }

        if (badges.length === 0) {
            badges.push(`<img src="images/certs/energy-star.svg" alt="Energy Star 4.0" title="Energy Star 4.0" class="portal-cert-badge">`);
            badges.push(`<img src="images/certs/ul-nsf.svg" alt="UL Classified NSF 7" title="UL Classified NSF 7" class="portal-cert-badge">`);
            badges.push(`<img src="images/certs/doe-17.svg" alt="DOE 17" title="DOE 17" class="portal-cert-badge">`);
        }

        let extraNote = '';
        if (str.includes('proceso') || str.includes('process')) {
            extraNote = '<span style="font-size: 11px; color: #d97706; font-weight: 600; margin-left: 4px;">(en proceso)</span>';
        } else if (str.includes('tbc')) {
            extraNote = '<span style="font-size: 11px; color: #64748b; font-weight: 600; margin-left: 4px;">(TBC)</span>';
        }

        return badges.join('') + extraNote;
    }

    // 7. Modal de Especificaciones Técnicas (Exact 10 English fields)
    function openProductModal(p) {
        if (!modalOverlay) return;

        const imgSrc = toSafeUrl(p.image_url) || 'images/Enfriador_VR17.jpg';
        if (modalImg) modalImg.src = imgSrc;
        if (modalSku) modalSku.innerText = p.sku || '';
        if (modalTitle) modalTitle.innerText = p.title || '';
        if (modalDesc) modalDesc.innerText = p.material_description || p.description || 'Commercial cooler designed for high performance and visual impact.';

        // Technical Specifications (10 exact fields)
        if (specSku) specSku.innerText = p.sku || '-';
        if (specMaterialDesc) specMaterialDesc.innerText = p.material_description || p.description || '-';
        if (specWidth) specWidth.innerText = p.width_in ? `${p.width_in}` : '-';
        if (specHeight) specHeight.innerText = p.height_in ? `${p.height_in}` : '-';
        if (specDepth) specDepth.innerText = p.depth_in ? `${p.depth_in}` : '-';
        if (specCubicFt) specCubicFt.innerText = p.cubic_ft || '-';
        if (specVoltage) specVoltage.innerText = p.voltage || '-';
        if (specRefrigerant) specRefrigerant.innerText = p.refrigerant || p.weight_lbs || '-';
        if (specCanCapacity) specCanCapacity.innerText = p.can_capacity || p.amps || '-';

        const certsVal = p.certifications || p.electrical_req || 'Energy Star 4.0, UL NSF 7, DOE 17';
        if (specCertsRow) {
            specCertsRow.innerHTML = renderCertBadges(certsVal);
        }

        // Botón Ficha Técnica PDF
        if (btnModalSpecSheet) {
            if (p.spec_sheet_url) {
                btnModalSpecSheet.href = toSafeUrl(p.spec_sheet_url);
                btnModalSpecSheet.style.display = 'inline-flex';
            } else {
                btnModalSpecSheet.style.display = 'none';
            }
        }

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modalOverlay) return;
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Inicializar
    await loadPortalData();
});
