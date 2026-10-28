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
    
    // Spec table cells
    const specCubicFt = document.getElementById('specCubicFt');
    const specWidth = document.getElementById('specWidth');
    const specHeight = document.getElementById('specHeight');
    const specDepth = document.getElementById('specDepth');
    const specVoltage = document.getElementById('specVoltage');
    const specAmps = document.getElementById('specAmps');
    const specWeight = document.getElementById('specWeight');
    const specElectrical = document.getElementById('specElectrical');

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
                brandLogoEl.src = toSafeUrl(portal.logo_url);
                brandLogoEl.alt = portalName;
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
                    <p>Try clearing your filters to see more results.</p>
                </div>
            `;
            return;
        }

        productsGridEl.innerHTML = items.map(p => {
            const dims = formatDimensions(p);
            const imgSrc = toSafeUrl(p.image_url) || 'images/Enfriador_VR17.jpg';

            return `
                <div class="portal-card" data-sku="${escapeHtml(p.sku)}">
                    <div class="portal-card-thumb-wrap">
                        <img src="${imgSrc}" alt="${escapeHtml(p.title)}" class="portal-card-thumb" loading="lazy" onerror="this.src='images/Enfriador_VR17.jpg'">
                    </div>
                    <span class="portal-card-sku">${escapeHtml(p.sku)}</span>
                    <h3 class="portal-card-title">${escapeHtml(p.title)}</h3>
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

    // 5. Filtros Dinámicos
    function getSelectedFilters() {
        const checkedBoxes = document.querySelectorAll('.portal-filter-checkbox:checked');
        const selected = {
            height: [],
            doors: [],
            doorStyle: [],
            passThru: false
        };

        checkedBoxes.forEach(cb => {
            const group = cb.getAttribute('data-group');
            const val = cb.value;
            if (group === 'height') selected.height.push(val);
            if (group === 'doors') selected.doors.push(val);
            if (group === 'doorStyle') selected.doorStyle.push(val);
            if (group === 'passThru') selected.passThru = true;
        });

        return selected;
    }

    function applyFilters() {
        const filters = getSelectedFilters();

        filteredProducts = portalProducts.filter(p => {
            // Filtro Altura
            if (filters.height.length > 0) {
                if (!filters.height.includes(p.height_type)) return false;
            }

            // Filtro Puertas
            if (filters.doors.length > 0) {
                if (!filters.doors.includes(p.door_count)) return false;
            }

            // Filtro Estilo de Puerta
            if (filters.doorStyle.length > 0) {
                if (!filters.doorStyle.includes(p.door_style)) return false;
            }

            // Filtro Pass Thru
            if (filters.passThru) {
                if (p.pass_through !== true && p.pass_through !== 'true') return false;
            }

            return true;
        });

        renderProducts(filteredProducts);
    }

    function clearFilters() {
        document.querySelectorAll('.portal-filter-checkbox').forEach(cb => cb.checked = false);
        filteredProducts = [...portalProducts];
        renderProducts(filteredProducts);
    }

    // Sincronizar checkboxes entre desktop y drawer móvil
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('portal-filter-checkbox')) {
            const val = e.target.value;
            const checked = e.target.checked;
            // Si el mismo checkbox está en sidebar y drawer, sincronizar
            document.querySelectorAll(`.portal-filter-checkbox[value="${val}"]`).forEach(cb => {
                cb.checked = checked;
            });
            applyFilters();
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

    // 6. Modal de Especificaciones Técnicas (Fiel al Screenshot del Usuario)
    function openProductModal(p) {
        if (!modalOverlay) return;

        const imgSrc = toSafeUrl(p.image_url) || 'images/Enfriador_VR17.jpg';
        if (modalImg) modalImg.src = imgSrc;
        if (modalSku) modalSku.innerText = p.sku || '';
        if (modalTitle) modalTitle.innerText = p.title || '';
        if (modalDesc) modalDesc.innerText = p.description || 'Cooler designed for high performance and visual impact.';

        // Especificaciones Técnicas (Screenshot Casillas)
        if (specCubicFt) specCubicFt.innerText = p.cubic_ft || '-';
        if (specWidth) specWidth.innerText = p.width_in || '-';
        if (specHeight) specHeight.innerText = p.height_in || '-';
        if (specDepth) specDepth.innerText = p.depth_in || '-';
        if (specVoltage) specVoltage.innerText = p.voltage || '-';
        if (specAmps) specAmps.innerText = p.amps || '-';
        if (specWeight) specWeight.innerText = p.weight_lbs || '-';
        if (specElectrical) specElectrical.innerText = p.electrical_req || 'NEMA 5-15P';

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
