// ==============================================================================
// ADMIN PANEL CONTROLLER (admin.js)
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
    if (!sb) {
        alert('Error: Supabase no está conectado.');
        return;
    }

    // STATE
    let allLeads = [];
    let allProducts = [];
    let allCategories = [];
    let currentAdminUser = null;

    // DOM ELEMENTS: Screens
    const loginScreen = document.getElementById('adminLoginScreen');
    const dashboardScreen = document.getElementById('adminDashboardScreen');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginErrorMsg');
    const btnLogout = document.getElementById('btnLogout');
    const adminUserEmailEl = document.getElementById('adminUserEmail');

    // DOM: Tabs & Topbar
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('pageTitle');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebar = document.querySelector('.admin-sidebar');

    // DOM: KPIs
    const kpiTotalLeads = document.getElementById('kpiTotalLeads');
    const kpiNewLeads = document.getElementById('kpiNewLeads');
    const kpiTotalProducts = document.getElementById('kpiTotalProducts');
    const kpiSpecificLeads = document.getElementById('kpiSpecificLeads');
    const kpiTotalViews = document.getElementById('kpiTotalViews');
    const topProductsList = document.getElementById('topProductsList');
    const topStatesList = document.getElementById('topStatesList');
    const badgeLeadsCount = document.getElementById('badgeLeadsCount');

    // DOM: Tables
    const leadsTableBody = document.getElementById('leadsTableBody');
    const searchLeadsInput = document.getElementById('searchLeadsInput');
    const filterLeadStatus = document.getElementById('filterLeadStatus');
    const btnRefreshLeads = document.getElementById('btnRefreshLeads');

    const productsTableBody = document.getElementById('productsTableBody');
    const searchProductsInput = document.getElementById('searchProductsInput');
    const filterProductCategory = document.getElementById('filterProductCategory');
    const btnOpenNewProductModal = document.getElementById('btnOpenNewProductModal');

    // DOM: Product Modal
    const productModal = document.getElementById('productModal');
    const btnCloseProductModal = document.getElementById('btnCloseProductModal');
    const btnCancelProductModal = document.getElementById('btnCancelProductModal');
    const productForm = document.getElementById('productForm');
    const productModalTitle = document.getElementById('productModalTitle');
    const editProductId = document.getElementById('editProductId');
    const pInputCategory = document.getElementById('pInputCategory');

    // DOM: Lead Modal
    const leadModal = document.getElementById('leadModal');
    const btnCloseLeadModal = document.getElementById('btnCloseLeadModal');
    const leadModalContent = document.getElementById('leadModalContent');

    // DOM: Bulk CSV
    const csvDropzone = document.getElementById('csvDropzone');
    const csvFileInput = document.getElementById('csvFileInput');
    const csvPreviewSection = document.getElementById('csvPreviewSection');
    const csvPreviewTbody = document.getElementById('csvPreviewTbody');
    const csvRowsCount = document.getElementById('csvRowsCount');
    const btnConfirmBulkImport = document.getElementById('btnConfirmBulkImport');
    const btnDownloadCsvTemplate = document.getElementById('btnDownloadCsvTemplate');
    let parsedCsvData = [];

    // DOM: Storage dropzone
    const fileStorageDropzone = document.getElementById('fileStorageDropzone');
    const storageFileInput = document.getElementById('storageFileInput');
    const storageUploadProgress = document.getElementById('storageUploadProgress');

    // DOM: Banners & Contenido
    let allBanners = [];
    const bannersTableBody = document.getElementById('bannersTableBody');
    const searchBannersInput = document.getElementById('searchBannersInput');
    const btnRefreshBanners = document.getElementById('btnRefreshBanners');
    const btnOpenAddBannerModal = document.getElementById('btnOpenAddBannerModal');
    const bannerModal = document.getElementById('bannerModal');
    const btnCloseBannerModal = document.getElementById('btnCloseBannerModal');
    const btnCancelBannerModal = document.getElementById('btnCancelBannerModal');
    const bannerForm = document.getElementById('bannerForm');
    const bannerModalTitle = document.getElementById('bannerModalTitle');
    const editBannerId = document.getElementById('editBannerId');
    const bInputTitle = document.getElementById('bInputTitle');
    const bInputIsActive = document.getElementById('bInputIsActive');
    const bInputDesktopImage = document.getElementById('bInputDesktopImage');
    const bInputMobileImage = document.getElementById('bInputMobileImage');
    const bInputLinkUrl = document.getElementById('bInputLinkUrl');
    const bInputOrder = document.getElementById('bInputOrder');
    const bInputTargetBlank = document.getElementById('bInputTargetBlank');
    const imgPreviewDesktop = document.getElementById('imgPreviewDesktop');
    const previewDesktopContainer = document.getElementById('previewDesktopContainer');
    const imgPreviewMobile = document.getElementById('imgPreviewMobile');
    const previewMobileContainer = document.getElementById('previewMobileContainer');

    // --------------------------------------------------------------------------
    // 1. AUTHENTICATION (SUPABASE AUTH)
    // --------------------------------------------------------------------------
    async function checkAuthSession() {
        const { data: { session } } = await sb.auth.getSession();
        if (session && session.user) {
            currentAdminUser = session.user;
            showDashboard();
        } else {
            showLogin();
        }
    }

    function showLogin() {
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        if (adminUserEmailEl && currentAdminUser) {
            adminUserEmailEl.innerText = currentAdminUser.email;
        }
        initDashboardData();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const submitBtn = document.getElementById('btnLoginSubmit');

            loginError.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';

            const { data, error } = await sb.auth.signInWithPassword({ email, password });

            if (error) {
                loginError.innerText = 'Credenciales inválidas: ' + error.message;
                loginError.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Iniciar sesión</span> <i class="fa-solid fa-arrow-right"></i>';
            } else {
                currentAdminUser = data.user;
                showDashboard();
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await sb.auth.signOut();
            currentAdminUser = null;
            showLogin();
        });
    }

    // --------------------------------------------------------------------------
    // 2. NAVIGATION & TABS
    // --------------------------------------------------------------------------
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            menuItems.forEach(m => m.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            item.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) targetPane.classList.add('active');

            // Title
            const titleSpan = item.querySelector('span');
            if (titleSpan && pageTitle) pageTitle.innerText = titleSpan.innerText;

            if (window.innerWidth <= 992 && sidebar) {
                sidebar.classList.remove('open');
            }
        });
    });

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // --------------------------------------------------------------------------
    // 3. INITIALIZE DATA (LEADS, PRODUCTS, CATEGORIES, ANALYTICS)
    // --------------------------------------------------------------------------
    async function initDashboardData() {
        await Promise.all([
            fetchCategories(),
            fetchProducts(),
            fetchLeads(),
            fetchAnalytics(),
            fetchBanners()
        ]);
        renderKPIs();
    }

    async function fetchCategories() {
        const { data, error } = await sb.from('categories').select('*').order('display_order');
        if (data && !error) {
            allCategories = data;
            populateCategoryDropdowns();
        }
    }

    function populateCategoryDropdowns() {
        const parents = allCategories.filter(c => !c.parent_id);
        
        // Helper to build grouped options
        const buildOptionsHtml = (includeAllOption) => {
            let html = includeAllOption ? '<option value="all">Todas las categorías</option>' : '<option value="">Selecciona categoría o subcategoría</option>';
            
            parents.forEach(p => {
                const subs = allCategories.filter(s => s.parent_id === p.id);
                if (subs.length > 0) {
                    html += `<optgroup label="${p.name}">`;
                    html += `<option value="${p.id}">${p.name} (Todo el grupo)</option>`;
                    subs.forEach(s => {
                        html += `<option value="${s.id}">↳ ${s.name}</option>`;
                    });
                    html += `</optgroup>`;
                } else {
                    html += `<option value="${p.id}">${p.name}</option>`;
                }
            });
            return html;
        };

        if (filterProductCategory) {
            filterProductCategory.innerHTML = buildOptionsHtml(true);
        }
        if (pInputCategory) {
            pInputCategory.innerHTML = buildOptionsHtml(false);
        }
    }

    async function fetchLeads() {
        const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false });
        if (data && !error) {
            allLeads = data;
            renderLeadsTable(allLeads);
            if (badgeLeadsCount) badgeLeadsCount.innerText = allLeads.length;
        } else {
            leadsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error al cargar prospectos.</td></tr>';
        }
    }

    async function fetchProducts() {
        const { data, error } = await sb.from('products').select('*, categories(name)').order('created_at', { ascending: false });
        if (data && !error) {
            allProducts = data;
            renderProductsTable(allProducts);
        } else {
            productsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error al cargar catálogo.</td></tr>';
        }
    }

    async function fetchAnalytics() {
        try {
            const { count } = await sb.from('page_views').select('*', { count: 'exact', head: true });
            if (kpiTotalViews) kpiTotalViews.innerText = (count || 0).toLocaleString();
        } catch (e) {
            if (kpiTotalViews) kpiTotalViews.innerText = '0';
        }
    }

    // --------------------------------------------------------------------------
    // 4. KPIS & CHARTS
    // --------------------------------------------------------------------------
    function renderKPIs() {
        if (kpiTotalLeads) kpiTotalLeads.innerText = allLeads.length;
        if (kpiTotalProducts) kpiTotalProducts.innerText = allProducts.length;

        // Specific leads (model selected)
        const specificCount = allLeads.filter(l => l.product_interest && l.product_interest !== 'inicio' && l.product_interest !== 'sitio-web').length;
        if (kpiSpecificLeads) kpiSpecificLeads.innerText = specificCount;

        // New leads today
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayCount = allLeads.filter(l => l.created_at && l.created_at.startsWith(todayStr)).length;
        if (kpiNewLeads) kpiNewLeads.innerText = `${todayCount} nuevos hoy`;

        // Top products by quote
        const productInterestCounts = {};
        allLeads.forEach(l => {
            const prod = l.product_interest || 'General';
            productInterestCounts[prod] = (productInterestCounts[prod] || 0) + 1;
        });

        const sortedProds = Object.entries(productInterestCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        if (topProductsList) {
            if (sortedProds.length === 0) {
                topProductsList.innerHTML = '<li class="empty-state">No hay cotizaciones registradas aún.</li>';
            } else {
                topProductsList.innerHTML = sortedProds.map(([name, count]) => `
                    <li class="top-item-row">
                        <strong>${name}</strong>
                        <span class="badge-status status-nuevo">${count} cotizaciones</span>
                    </li>
                `).join('');
            }
        }

        // Top states
        const stateCounts = {};
        allLeads.forEach(l => {
            const st = l.state || 'No especificado';
            stateCounts[st] = (stateCounts[st] || 0) + 1;
        });

        const sortedStates = Object.entries(stateCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        if (topStatesList) {
            if (sortedStates.length === 0) {
                topStatesList.innerHTML = '<li class="empty-state">Sin datos de estados.</li>';
            } else {
                topStatesList.innerHTML = sortedStates.map(([state, count]) => `
                    <li class="top-item-row">
                        <span><i class="fa-solid fa-map-pin text-green"></i> ${state}</span>
                        <strong>${count} leads</strong>
                    </li>
                `).join('');
            }
        }
    }

    // --------------------------------------------------------------------------
    // 5. LEADS TABLE & FILTERS
    // --------------------------------------------------------------------------
    function renderLeadsTable(leads) {
        if (!leadsTableBody) return;
        if (leads.length === 0) {
            leadsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No se encontraron prospectos.</td></tr>';
            return;
        }

        leadsTableBody.innerHTML = leads.map(l => {
            const dateStr = new Date(l.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `
                <tr>
                    <td><small>${dateStr}</small></td>
                    <td><strong>${l.full_name}</strong></td>
                    <td>
                        <div><a href="tel:${l.phone}"><i class="fa-solid fa-phone"></i> ${l.phone}</a></div>
                        <small class="text-muted"><a href="mailto:${l.email}"><i class="fa-solid fa-envelope"></i> ${l.email}</a></small>
                    </td>
                    <td>
                        <span class="text-primary font-weight-bold">${l.product_interest || 'General'}</span>
                        ${l.source_page ? `<br><small class="text-muted">Origen: ${l.source_page}</small>` : ''}
                    </td>
                    <td>${l.units_count || 1} pza(s)</td>
                    <td><i class="fa-solid fa-location-dot text-muted"></i> ${l.state || 'N/A'}</td>
                    <td>
                        <select class="select-filter lead-status-select" data-id="${l.id}">
                            <option value="nuevo" ${l.status === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                            <option value="contactado" ${l.status === 'contactado' ? 'selected' : ''}>Contactado</option>
                            <option value="en_negociacion" ${l.status === 'en_negociacion' ? 'selected' : ''}>En negociación</option>
                            <option value="cerrado" ${l.status === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                            <option value="descartado" ${l.status === 'descartado' ? 'selected' : ''}>Descartado</option>
                        </select>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button type="button" class="btn-table-action btn-view-lead" data-id="${l.id}" title="Ver detalles y notas">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <a href="https://wa.me/52${l.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(l.full_name)},%20te%20contacto%20de%20Imbera%20respecto%20a%20tu%20cotización." target="_blank" class="btn-table-action" title="Abrir WhatsApp">
                                <i class="fa-brands fa-whatsapp text-green"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach status update listeners
        document.querySelectorAll('.lead-status-select').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const leadId = sel.getAttribute('data-id');
                const newStatus = sel.value;
                await sb.from('leads').update({ status: newStatus }).eq('id', leadId);
                const item = allLeads.find(x => x.id === leadId);
                if (item) item.status = newStatus;
            });
        });

        // Attach view detail modal listeners
        document.querySelectorAll('.btn-view-lead').forEach(btn => {
            btn.addEventListener('click', () => {
                const leadId = btn.getAttribute('data-id');
                const l = allLeads.find(x => x.id === leadId);
                if (l && leadModal && leadModalContent) {
                    leadModalContent.innerHTML = `
                        <p><strong>Fecha:</strong> ${new Date(l.created_at).toLocaleString()}</p>
                        <p><strong>Nombre:</strong> ${l.full_name}</p>
                        <p><strong>Teléfono:</strong> <a href="tel:${l.phone}">${l.phone}</a></p>
                        <p><strong>Correo:</strong> <a href="mailto:${l.email}">${l.email}</a></p>
                        <p><strong>Estado / Región:</strong> ${l.state || 'N/A'}</p>
                        <p><strong>Equipo de Interés:</strong> ${l.product_interest || 'General'}</p>
                        <p><strong>Unidades:</strong> ${l.units_count || 1}</p>
                        <p><strong>Mensaje / Comentarios:</strong></p>
                        <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid var(--admin-primary); margin: 8px 0;">${l.message || 'Sin mensaje adicional.'}</blockquote>
                        <div class="form-group mt-3">
                            <label>Notas internas de seguimiento:</label>
                            <textarea id="leadInternalNotes" rows="3" class="form-control" placeholder="Escribe notas de llamadas o acuerdos...">${l.notes || ''}</textarea>
                            <button type="button" class="btn-primary mt-2" id="btnSaveLeadNotes" data-id="${l.id}">Guardar Notas</button>
                        </div>
                    `;
                    leadModal.classList.add('active');

                    document.getElementById('btnSaveLeadNotes').addEventListener('click', async () => {
                        const notesVal = document.getElementById('leadInternalNotes').value;
                        await sb.from('leads').update({ notes: notesVal }).eq('id', l.id);
                        l.notes = notesVal;
                        alert('Notas guardadas con éxito.');
                        leadModal.classList.remove('active');
                    });
                }
            });
        });
    }

    if (btnCloseLeadModal) {
        btnCloseLeadModal.addEventListener('click', () => leadModal.classList.remove('active'));
    }

    if (searchLeadsInput) {
        searchLeadsInput.addEventListener('input', () => {
            applyLeadFilters();
        });
    }

    if (filterLeadStatus) {
        filterLeadStatus.addEventListener('change', () => {
            applyLeadFilters();
        });
    }

    if (btnRefreshLeads) {
        btnRefreshLeads.addEventListener('click', async () => {
            await fetchLeads();
            renderKPIs();
        });
    }

    function applyLeadFilters() {
        const query = (searchLeadsInput?.value || '').toLowerCase();
        const status = filterLeadStatus?.value || 'all';

        const filtered = allLeads.filter(l => {
            const matchesQuery = (
                (l.full_name && l.full_name.toLowerCase().includes(query)) ||
                (l.phone && l.phone.includes(query)) ||
                (l.email && l.email.toLowerCase().includes(query)) ||
                (l.product_interest && l.product_interest.toLowerCase().includes(query))
            );
            const matchesStatus = (status === 'all' || l.status === status);
            return matchesQuery && matchesStatus;
        });

        renderLeadsTable(filtered);
    }

    // --------------------------------------------------------------------------
    // 6. PRODUCTS TABLE & CRUD MODAL
    // --------------------------------------------------------------------------
    function renderProductsTable(products) {
        if (!productsTableBody) return;
        if (products.length === 0) {
            productsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No hay equipos registrados.</td></tr>';
            return;
        }

        productsTableBody.innerHTML = products.map(p => {
            const catName = p.categories ? p.categories.name : 'General';
            const specs = p.specifications || {};
            const extDim = (specs.ext_height && specs.ext_width) ? `${specs.ext_height}x${specs.ext_width}x${specs.ext_depth || 0}mm` : 'N/D';
            const capacityStr = specs.capacity || 'N/D';
            const isVisible = p.is_active !== false; // Default true

            return `
                <tr class="${isVisible ? '' : 'row-product-hidden'}">
                    <td>
                        <img src="${p.main_image || 'images/indeximg.png'}" alt="Foto" class="table-thumb">
                    </td>
                    <td>
                        <strong>${p.commercial_name}</strong>
                        ${p.subtitle ? `<br><small class="text-muted">${p.subtitle.slice(0, 45)}...</small>` : ''}
                    </td>
                    <td><code>${p.sku}</code></td>
                    <td><span class="badge-role">${catName}</span></td>
                    <td><small><strong>${capacityStr}</strong></small></td>
                    <td>
                        ${p.datasheet_url ? `<a href="${p.datasheet_url}" target="_blank" class="badge-pdf-check"><i class="fa-solid fa-file-pdf"></i> Ficha</a>` : '<span class="badge-pdf-check missing">Sin Ficha</span>'}
                        ${p.manual_url ? `<a href="${p.manual_url}" target="_blank" class="badge-pdf-check"><i class="fa-solid fa-book"></i> Manual</a>` : '<span class="badge-pdf-check missing">Sin Manual</span>'}
                        ${p.parts_list_url ? `<a href="${p.parts_list_url}" target="_blank" class="badge-pdf-check"><i class="fa-solid fa-gear"></i> Partes</a>` : '<span class="badge-pdf-check missing">Sin Partes</span>'}
                    </td>
                    <td><small>${extDim}</small></td>
                    <td>
                        <span class="badge-status ${isVisible ? 'status-cerrado' : 'status-descartado'}" style="display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fa-solid ${isVisible ? 'fa-circle-check' : 'fa-eye-slash'}"></i>
                            ${isVisible ? 'Visible' : 'Oculto'}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button type="button" class="btn-table-action btn-toggle-visibility ${isVisible ? 'visible' : 'hidden'}" data-id="${p.id}" data-active="${isVisible ? 'true' : 'false'}" title="${isVisible ? 'Visible en el sitio (Clic para ocultar)' : 'Oculto del sitio (Clic para mostrar)'}">
                                <i class="fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                            </button>
                            <a href="producto.html?sku=${encodeURIComponent(p.sku)}" target="_blank" class="btn-table-action" title="Ver en sitio web">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                            <button type="button" class="btn-table-action btn-edit-product" data-id="${p.id}" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button type="button" class="btn-table-action delete btn-delete-product" data-id="${p.id}" title="Eliminar">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Visibility Toggle (Eye Button) Handlers
        document.querySelectorAll('.btn-toggle-visibility').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const prodId = btn.getAttribute('data-id');
                const p = allProducts.find(x => x.id === prodId);
                if (!p) return;

                const currentActive = p.is_active !== false;
                const newActive = !currentActive;

                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                try {
                    const { error } = await sb.from('products').update({ is_active: newActive }).eq('id', prodId);
                    if (error) throw error;

                    p.is_active = newActive;

                    // Invalidate sessionStorage cache for this SKU
                    try {
                        sessionStorage.removeItem('imbera_prod_sku_' + p.sku);
                        if (p.model_code) {
                            const mSlug = p.model_code.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                            sessionStorage.removeItem('imbera_prod_slug_' + mSlug);
                        }
                    } catch(err) {}

                    applyProductFilters();
                } catch(err) {
                    alert('Error al actualizar visibilidad: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fa-solid ${currentActive ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
                }
            });
        });

        // Edit handlers
        document.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', () => {
                const prodId = btn.getAttribute('data-id');
                const p = allProducts.find(x => x.id === prodId);
                if (p) openProductModalForEdit(p);
            });
        });

        // Delete handlers
        document.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', async () => {
                const prodId = btn.getAttribute('data-id');
                const p = allProducts.find(x => x.id === prodId);
                if (confirm(`¿Estás seguro de eliminar el equipo "${p?.commercial_name}"?`)) {
                    await sb.from('products').delete().eq('id', prodId);
                    allProducts = allProducts.filter(x => x.id !== prodId);
                    renderProductsTable(allProducts);
                    renderKPIs();
                }
            });
        });
    }

    if (searchProductsInput) {
        searchProductsInput.addEventListener('input', () => applyProductFilters());
    }

    if (filterProductCategory) {
        filterProductCategory.addEventListener('change', () => applyProductFilters());
    }

    const filterProductStatus = document.getElementById('filterProductStatus');
    if (filterProductStatus) {
        filterProductStatus.addEventListener('change', () => applyProductFilters());
    }

    function applyProductFilters() {
        const query = (searchProductsInput?.value || '').toLowerCase();
        const catId = filterProductCategory?.value || 'all';
        const statusFilter = document.getElementById('filterProductStatus')?.value || 'all';

        const filtered = allProducts.filter(p => {
            const matchesQuery = (
                (p.commercial_name && p.commercial_name.toLowerCase().includes(query)) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.model_code && p.model_code.toLowerCase().includes(query))
            );
            const matchesCat = (catId === 'all' || p.category_id === catId);

            const isVisible = p.is_active !== false;
            let matchesStatus = true;
            if (statusFilter === 'active') matchesStatus = isVisible;
            if (statusFilter === 'hidden') matchesStatus = !isVisible;

            return matchesQuery && matchesCat && matchesStatus;
        });

        renderProductsTable(filtered);
    }

    // PRODUCT MODAL OPEN & CLOSE
    if (btnOpenNewProductModal) {
        btnOpenNewProductModal.addEventListener('click', () => {
            productForm.reset();
            editProductId.value = '';
            productModalTitle.innerText = 'Agregar Nuevo Equipo';
            const activeCheckbox = document.getElementById('pInputIsActive');
            if (activeCheckbox) activeCheckbox.checked = true; // Default: visible upon creation
            productModal.classList.add('active');
        });
    }

    function openProductModalForEdit(p) {
        productForm.reset();
        editProductId.value = p.id;
        productModalTitle.innerText = `Editar Equipo: ${p.commercial_name}`;

        const activeCheckbox = document.getElementById('pInputIsActive');
        if (activeCheckbox) activeCheckbox.checked = (p.is_active !== false);

        document.getElementById('pInputCommercialName').value = p.commercial_name || '';
        document.getElementById('pInputSku').value = p.sku || '';
        document.getElementById('pInputModelCode').value = p.model_code || '';
        document.getElementById('pInputCategory').value = p.category_id || '';
        document.getElementById('pInputSubtitle').value = p.subtitle || '';
        document.getElementById('pInputDescription').value = p.description || '';
        document.getElementById('pInputMainImage').value = p.main_image || '';
        document.getElementById('pInputDatasheet').value = p.datasheet_url || '';
        document.getElementById('pInputManual').value = p.manual_url || '';
        document.getElementById('pInputPartsList').value = p.parts_list_url || '';

        const specs = p.specifications || {};
        document.getElementById('specCapacity').value = specs.capacity || '';
        document.getElementById('specExtHeight').value = specs.ext_height || '';
        document.getElementById('specExtWidth').value = specs.ext_width || '';
        document.getElementById('specExtDepth').value = specs.ext_depth || '';
        document.getElementById('specIntHeight').value = specs.int_height || '';
        document.getElementById('specIntWidth').value = specs.int_width || '';
        document.getElementById('specIntDepth').value = specs.int_depth || '';
        document.getElementById('specTempRange').value = specs.temp_range || '';
        document.getElementById('specRefrigerant').value = specs.refrigerant || '';
        document.getElementById('specVoltage').value = specs.voltage || '';
        document.getElementById('specShelves').value = specs.shelves || '';

        productModal.classList.add('active');
    }

    if (btnCloseProductModal) btnCloseProductModal.addEventListener('click', () => productModal.classList.remove('active'));
    if (btnCancelProductModal) btnCancelProductModal.addEventListener('click', () => productModal.classList.remove('active'));

    // SAVE PRODUCT (INSERT OR UPDATE)
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSave = document.getElementById('btnSaveProduct');
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

            const pId = editProductId.value;
            const codeVal = document.getElementById('pInputSku').value.trim();

            // Enforce 7 numeric digits
            if (!/^\d{7}$/.test(codeVal)) {
                alert('El Código del producto debe contener exactamente 7 dígitos numéricos (ejemplo: 1030002).');
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Equipo';
                return;
            }

            const payload = {
                commercial_name: document.getElementById('pInputCommercialName').value.trim(),
                sku: codeVal,
                model_code: document.getElementById('pInputModelCode').value.trim() || null,
                category_id: document.getElementById('pInputCategory').value || null,
                subtitle: document.getElementById('pInputSubtitle').value.trim() || null,
                description: (document.getElementById('pInputDescription').value.trim()
                    .replace(/(?:precio(?:\s+de\s+lista)?[:\s]*\$?[\d,.]+(?:\s*mxn|\s*usd)?(?:\s*\([^)]*\))?|\$[\d,.]+(?:\s*mxn|\s*usd)?)/gi, '')
                    .replace(/\(?p[aá]g\.?\s*\d+\)?/gi, '')
                    .trim()) || null,
                main_image: document.getElementById('pInputMainImage').value.trim() || null,
                datasheet_url: document.getElementById('pInputDatasheet').value.trim() || null,
                manual_url: document.getElementById('pInputManual').value.trim() || null,
                parts_list_url: document.getElementById('pInputPartsList').value.trim() || null,
                specifications: {
                    capacity: document.getElementById('specCapacity').value.trim() || null,
                    ext_height: document.getElementById('specExtHeight').value || null,
                    ext_width: document.getElementById('specExtWidth').value || null,
                    ext_depth: document.getElementById('specExtDepth').value || null,
                    int_height: document.getElementById('specIntHeight').value || null,
                    int_width: document.getElementById('specIntWidth').value || null,
                    int_depth: document.getElementById('specIntDepth').value || null,
                    temp_range: document.getElementById('specTempRange').value || null,
                    refrigerant: document.getElementById('specRefrigerant').value || null,
                    voltage: document.getElementById('specVoltage').value || null,
                    shelves: document.getElementById('specShelves').value || null
                },
                is_active: document.getElementById('pInputIsActive') ? document.getElementById('pInputIsActive').checked : true,
                updated_at: new Date().toISOString()
            };

            try {
                if (pId) {
                    const { error } = await sb.from('products').update(payload).eq('id', pId);
                    if (error) throw error;
                } else {
                    const { error } = await sb.from('products').insert([payload]);
                    if (error) throw error;
                }

                // Invalidate cache
                try {
                    sessionStorage.removeItem('imbera_prod_sku_' + codeVal);
                } catch(e) {}

                productModal.classList.remove('active');
                await fetchProducts();
                renderKPIs();
            } catch (err) {
                alert('Error al guardar el equipo: ' + err.message);
            } finally {
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Equipo';
            }
        });
    }

    // UPLOAD DRAG & DROP IN PRODUCT MODAL (Image & PDFs)
    setupModalDropzone('dropzoneMainImage', 'pUploadImageFile', 'pInputMainImage', 'product-images', 'Foto subida con éxito');
    setupModalDropzone('dropzonePdf1', 'pUploadPdf1', 'pInputDatasheet', 'product-docs', 'Ficha Técnica subida');
    setupModalDropzone('dropzonePdf2', 'pUploadPdf2', 'pInputManual', 'product-docs', 'Manual de Usuario subido');
    setupModalDropzone('dropzonePdf3', 'pUploadPdf3', 'pInputPartsList', 'product-docs', 'Números de Parte subido');

    function setupModalDropzone(dropzoneId, fileInputId, targetUrlInputId, bucketName, successLabel) {
        const dropzone = document.getElementById(dropzoneId);
        const fileInput = document.getElementById(fileInputId);
        const targetInput = document.getElementById(targetUrlInputId);
        if (!dropzone || !fileInput || !targetInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                uploadSingleModalFile(e.dataTransfer.files[0], dropzone, targetInput, bucketName, successLabel);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                uploadSingleModalFile(fileInput.files[0], dropzone, targetInput, bucketName, successLabel);
            }
        });
    }

    async function uploadSingleModalFile(file, dropzone, targetInput, bucketName, successLabel) {
        const labelText = dropzone.querySelector('.dropzone-text');
        const originalText = labelText ? labelText.innerText : '';
        if (labelText) labelText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo a Supabase...';

        try {
            const ext = file.name.split('.').pop();
            const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const filePath = `${Date.now()}_${cleanName}.${ext}`;

            const { data, error } = await sb.storage.from(bucketName).upload(filePath, file);
            if (error) throw error;

            const { data: publicData } = sb.storage.from(bucketName).getPublicUrl(filePath);
            targetInput.value = publicData.publicUrl;

            dropzone.classList.add('uploaded');
            if (labelText) labelText.innerHTML = `<i class="fa-solid fa-circle-check text-green"></i> ${successLabel} (${file.name})`;
        } catch (err) {
            alert('No se pudo subir el archivo: ' + err.message);
            if (labelText) labelText.innerText = originalText;
        }
    }

    // --------------------------------------------------------------------------
    // 7. BULK IMPORT CSV (200+ PRODUCTOS)
    // --------------------------------------------------------------------------
    if (btnDownloadCsvTemplate) {
        btnDownloadCsvTemplate.addEventListener('click', () => {
            const csvContent = "codigo,commercial_name,category_slug,model_code,subtitle,description,main_image,datasheet_url,manual_url,parts_list_url,capacity,ext_height,ext_width,ext_depth,int_height,int_width,int_depth,temp_range,refrigerant,voltage,shelves\n" +
                               "1030002,Enfriador G3D42 Especial,refrigeradores,G3D42-2P,Enfriador vertical de 2 puertas,Control inteligente LED perimetral,https://...,https://...,https://...,https://...,1189 Lts / 42 ft³,2040,1375,860,1540,1270,710,0°C a 4°C,R290,115V/60Hz,8\n" +
                               "1024175,ENFRIADOR VR17,refrigeradores,VR17-1P,Enfriador vertical 1 puerta,Ahorro de energía ecológico,https://...,https://...,,,480 Lts / 17 ft³,1900,750,700,1400,650,600,0°C a 4°C,R290,115V/60Hz,4";
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = "plantilla_imbera_catalogo.csv";
            link.click();
        });
    }

    if (csvDropzone && csvFileInput) {
        csvDropzone.addEventListener('click', () => csvFileInput.click());

        csvDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            csvDropzone.classList.add('dragover');
        });

        csvDropzone.addEventListener('dragleave', () => csvDropzone.classList.remove('dragover'));

        csvDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            csvDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                processCsvFile(e.dataTransfer.files[0]);
            }
        });

        csvFileInput.addEventListener('change', () => {
            if (csvFileInput.files.length > 0) {
                processCsvFile(csvFileInput.files[0]);
            }
        });
    }

    function processCsvFile(file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: function(header) {
                // Strip UTF-8 BOM, trim whitespace, lowercase, and remove accents (e.g., Código -> codigo)
                return header
                    .replace(/^\ufeff/, '')
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
            },
            complete: function(results) {
                parsedCsvData = results.data;
                renderCsvPreview(parsedCsvData);
            },
            error: function(err) {
                alert('Error al leer el archivo CSV: ' + err.message);
            }
        });
    }

    // Helper to safely extract values checking multiple common aliases
    function getCsvRowValue(r, ...aliases) {
        for (const alias of aliases) {
            const cleanKey = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (r[cleanKey] !== undefined && r[cleanKey] !== null && String(r[cleanKey]).trim() !== '') {
                return String(r[cleanKey]).trim();
            }
        }
        return '';
    }

    function renderCsvPreview(rows) {
        if (!csvPreviewSection || !csvPreviewTbody) return;
        csvRowsCount.innerText = rows.length;
        csvPreviewSection.style.display = 'block';

        csvPreviewTbody.innerHTML = rows.slice(0, 10).map((r, idx) => {
            const code = getCsvRowValue(r, 'codigo', 'sku', 'code', 'clave', 'id') || `(Auto ${1030000 + idx})`;
            const name = getCsvRowValue(r, 'commercial_name', 'nombre_comercial', 'modelo_comercial', 'nombre', 'name') || 'Equipo Imbera';
            const cat = getCsvRowValue(r, 'category_slug', 'categoria_slug', 'categoria', 'category') || 'enfriadores';
            const pdf1 = getCsvRowValue(r, 'datasheet_url', 'ficha', 'ficha_tecnica', 'pdf1');
            const pdf2 = getCsvRowValue(r, 'manual_url', 'manual', 'manual_usuario', 'pdf2');
            const pdf3 = getCsvRowValue(r, 'parts_list_url', 'partes', 'numeros_de_parte', 'pdf3');
            const h = getCsvRowValue(r, 'ext_height', 'alto') || '0';
            const w = getCsvRowValue(r, 'ext_width', 'ancho') || '0';
            const d = getCsvRowValue(r, 'ext_depth', 'profundo') || '0';

            return `
                <tr>
                    <td><code>${code}</code></td>
                    <td><strong>${name}</strong></td>
                    <td>${cat}</td>
                    <td><small>${pdf1 ? '✓ Ficha adjunta' : 'Sin ficha'}</small></td>
                    <td><small>${pdf2 ? '✓ Manual' : '-'}</small></td>
                    <td><small>${pdf3 ? '✓ Partes' : '-'}</small></td>
                    <td>${h}x${w}x${d}mm</td>
                </tr>
            `;
        }).join('');

        if (rows.length > 10) {
            csvPreviewTbody.innerHTML += `<tr><td colspan="7" class="text-center py-2 text-muted">... y ${rows.length - 10} productos más listos para importar.</td></tr>`;
        }
    }

    if (btnConfirmBulkImport) {
        btnConfirmBulkImport.addEventListener('click', async () => {
            if (parsedCsvData.length === 0) return;

            btnConfirmBulkImport.disabled = true;
            btnConfirmBulkImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando importación...';

            // Build accent-tolerant category lookup map
            const categoryMap = {};
            allCategories.forEach(c => {
                if (c.slug) {
                    const normSlug = c.slug.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    categoryMap[normSlug] = c.id;
                    categoryMap[normSlug.replace(/-/g, '_')] = c.id;
                    categoryMap[normSlug.replace(/_/g, '-')] = c.id;
                }
                if (c.name) {
                    const normName = c.name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    categoryMap[normName] = c.id;
                }
            });

            // Calculate starting sequential SKU for any items that lack a numeric code
            let autoSkuCounter = 1000000;
            allProducts.forEach(p => {
                const num = parseInt(p.sku, 10);
                if (!isNaN(num) && num >= autoSkuCounter && num < 9999999) {
                    autoSkuCounter = num + 1;
                }
            });

            // Map rows into clean product payloads
            const payloadRows = parsedCsvData.map((r) => {
                let codeRaw = getCsvRowValue(r, 'codigo', 'sku', 'code', 'clave', 'id');
                if (!codeRaw) {
                    codeRaw = String(autoSkuCounter++);
                }

                const catRaw = getCsvRowValue(r, 'category_slug', 'categoria_slug', 'categoria', 'category');
                const normCat = catRaw.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const categoryId = categoryMap[normCat] || categoryMap[normCat.replace(/_/g, '-')] || null;

                const rawDesc = getCsvRowValue(r, 'description', 'descripcion') || '';
                const cleanDesc = rawDesc
                    .replace(/(?:precio(?:\s+de\s+lista)?[:\s]*\$?[\d,.]+(?:\s*mxn|\s*usd)?(?:\s*\([^)]*\))?|\$[\d,.]+(?:\s*mxn|\s*usd)?)/gi, '')
                    .replace(/\(?p[aá]g\.?\s*\d+\)?/gi, '')
                    .trim() || null;

                return {
                    sku: codeRaw,
                    commercial_name: (getCsvRowValue(r, 'commercial_name', 'nombre_comercial', 'modelo_comercial', 'nombre', 'name') || 'Equipo Imbera').trim(),
                    model_code: getCsvRowValue(r, 'model_code', 'modelo_tecnico', 'modelo') || null,
                    subtitle: getCsvRowValue(r, 'subtitle', 'subtitulo', 'nombre_tecnico') || null,
                    description: cleanDesc,
                    category_id: categoryId,
                    main_image: getCsvRowValue(r, 'main_image', 'imagen', 'foto') || null,
                    datasheet_url: getCsvRowValue(r, 'datasheet_url', 'ficha', 'ficha_tecnica', 'pdf1') || null,
                    manual_url: getCsvRowValue(r, 'manual_url', 'manual', 'manual_usuario', 'pdf2') || null,
                    parts_list_url: getCsvRowValue(r, 'parts_list_url', 'partes', 'numeros_de_parte', 'pdf3') || null,
                    is_active: true,
                    specifications: {
                        capacity: getCsvRowValue(r, 'capacity', 'capacidad') || null,
                        ext_height: getCsvRowValue(r, 'ext_height', 'alto') || null,
                        ext_width: getCsvRowValue(r, 'ext_width', 'ancho') || null,
                        ext_depth: getCsvRowValue(r, 'ext_depth', 'profundo') || null,
                        int_height: getCsvRowValue(r, 'int_height', 'alto_int') || null,
                        int_width: getCsvRowValue(r, 'int_width', 'ancho_int') || null,
                        int_depth: getCsvRowValue(r, 'int_depth', 'profundo_int') || null,
                        temp_range: getCsvRowValue(r, 'temp_range', 'temperatura', 'rango_temperatura') || null,
                        refrigerant: getCsvRowValue(r, 'refrigerant', 'refrigerante', 'gas') || null,
                        voltage: getCsvRowValue(r, 'voltage', 'voltaje') || null,
                        shelves: getCsvRowValue(r, 'shelves', 'parrillas') || null
                    }
                };
            });

            // CRITICAL FIX FOR POSTGRESQL "ON CONFLICT DO UPDATE command cannot affect row a second time":
            // Deduplicate batch by SKU so no two rows in the same batch statement have identical SKUs
            const deduplicatedMap = new Map();
            payloadRows.forEach(item => {
                deduplicatedMap.set(item.sku, item);
            });
            const uniquePayload = Array.from(deduplicatedMap.values());

            try {
                // Upsert in batches of 50 records for optimal reliability & progress reporting
                const BATCH_SIZE = 50;
                let importedCount = 0;

                for (let i = 0; i < uniquePayload.length; i += BATCH_SIZE) {
                    const chunk = uniquePayload.slice(i, i + BATCH_SIZE);
                    const { error } = await sb.from('products').upsert(chunk, { onConflict: 'sku' });
                    if (error) throw error;
                    importedCount += chunk.length;
                    btnConfirmBulkImport.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando (${importedCount}/${uniquePayload.length})...`;
                }

                alert(`¡Éxito! Se han importado / actualizado ${uniquePayload.length} equipos en la base de datos de Supabase.`);
                csvPreviewSection.style.display = 'none';
                parsedCsvData = [];
                await fetchProducts();
                renderKPIs();
            } catch (err) {
                alert('Hubo un inconveniente al importar: ' + err.message);
            } finally {
                btnConfirmBulkImport.disabled = false;
                btnConfirmBulkImport.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Iniciar Importación Masiva';
            }
        });
    }

    // --------------------------------------------------------------------------
    // 8. STORAGE DRAG & DROP MULTI-UPLOADER
    // --------------------------------------------------------------------------
    if (fileStorageDropzone && storageFileInput) {
        fileStorageDropzone.addEventListener('click', () => storageFileInput.click());

        fileStorageDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileStorageDropzone.classList.add('dragover');
        });

        fileStorageDropzone.addEventListener('dragleave', () => fileStorageDropzone.classList.remove('dragover'));

        fileStorageDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            fileStorageDropzone.classList.remove('dragover');
            handleStorageBatchUpload(e.dataTransfer.files);
        });

        storageFileInput.addEventListener('change', () => {
            handleStorageBatchUpload(storageFileInput.files);
        });
    }

    async function handleStorageBatchUpload(fileList) {
        if (!fileList || fileList.length === 0) return;

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const isPdf = file.name.endsWith('.pdf');
            const bucket = isPdf ? 'product-docs' : 'product-images';

            const card = document.createElement('div');
            card.className = 'upload-item-card';
            card.innerHTML = `<span><i class="fa-solid ${isPdf ? 'fa-file-pdf text-danger' : 'fa-image text-primary'}"></i> ${file.name}</span> <small>Subiendo...</small>`;
            storageUploadProgress.prepend(card);

            try {
                const ext = file.name.split('.').pop();
                const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const filePath = `${Date.now()}_${cleanName}.${ext}`;

                const { data, error } = await sb.storage.from(bucket).upload(filePath, file);
                if (error) throw error;

                const { data: publicData } = sb.storage.from(bucket).getPublicUrl(filePath);

                card.innerHTML = `
                    <span><i class="fa-solid ${isPdf ? 'fa-file-pdf text-danger' : 'fa-image text-primary'}"></i> ${file.name}</span>
                    <div>
                        <input type="text" value="${publicData.publicUrl}" readonly style="width: 250px; font-size: 11px; padding: 4px;">
                        <button type="button" class="btn-outline-small" onclick="navigator.clipboard.writeText('${publicData.publicUrl}'); alert('URL copiada');">Copiar</button>
                    </div>
                `;
            } catch (err) {
                card.innerHTML = `<span>${file.name}</span> <span class="text-danger">Error: ${err.message}</span>`;
            }
        }
    }

    // --------------------------------------------------------------------------
    // 9. BANNERS MANAGEMENT (HERO CAROUSEL)
    // --------------------------------------------------------------------------
    const defaultInitialBanners = [
        {
            id: 'banner-default-1',
            title: 'Soluciones Imbera Refrigeración Comercial',
            desktop_image: 'images/banner_pc_5.webp',
            mobile_image: 'images/banner_pc_5.webp',
            link_url: 'categoria.html?cat=enfriadores',
            target_blank: false,
            display_order: 1,
            is_active: true
        },
        {
            id: 'banner-default-2',
            title: 'Línea Health & Laboratorio',
            desktop_image: 'images/bannerHealth.webp',
            mobile_image: 'images/bannerHealth.webp',
            link_url: 'categoria.html?cat=salud-y-laboratorio',
            target_blank: false,
            display_order: 2,
            is_active: true
        }
    ];

    async function fetchBanners() {
        if (!bannersTableBody) return;
        try {
            const { data, error } = await sb.from('banners').select('*').order('display_order', { ascending: true });
            if (data && !error && data.length > 0) {
                allBanners = data;
                localStorage.setItem('imbera_banners', JSON.stringify(data));
            } else {
                const cached = localStorage.getItem('imbera_banners');
                if (cached) {
                    allBanners = JSON.parse(cached);
                } else {
                    allBanners = defaultInitialBanners;
                    localStorage.setItem('imbera_banners', JSON.stringify(defaultInitialBanners));
                }
            }
        } catch(e) {
            console.warn('Error fetching banners from Supabase, using localStorage fallback:', e);
            const cached = localStorage.getItem('imbera_banners');
            allBanners = cached ? JSON.parse(cached) : defaultInitialBanners;
        }
        renderBannersTable(allBanners);
    }

    function renderBannersTable(banners) {
        if (!bannersTableBody) return;
        if (!banners || banners.length === 0) {
            bannersTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay banners registrados aún. Haz clic en "Agregar Nuevo Banner".</td></tr>';
            return;
        }

        bannersTableBody.innerHTML = banners.map(b => {
            const isVisible = b.is_active !== false;
            const mobileSrc = b.mobile_image || b.desktop_image;
            return `
                <tr>
                    <td><strong>#${b.display_order || 1}</strong></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="${b.desktop_image}" class="table-thumb" style="width: 85px; height: 38px; object-fit: cover; border-radius: 4px;" onerror="this.src='images/indeximg.png'">
                            <small class="text-muted" style="font-size: 11px;">16:9 / Apaisado</small>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="${mobileSrc}" class="table-thumb" style="width: 38px; height: 38px; object-fit: cover; border-radius: 4px;" onerror="this.src='images/indeximg.png'">
                            <small class="text-muted" style="font-size: 11px;">${b.mobile_image ? 'Adaptada' : 'Heredada'}</small>
                        </div>
                    </td>
                    <td>
                        <strong>${b.title || 'Sin título'}</strong>
                    </td>
                    <td>
                        ${b.link_url ? `<a href="${b.link_url}" target="_blank" style="color: #0b4372; font-weight: 600; text-decoration: underline; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${b.link_url} ${b.target_blank ? '<span class="badge-pdf-check" style="font-size: 10px;">_blank</span>' : ''}</a>` : '<span style="color: #94a3b8; font-size: 12px;">Sin redirección</span>'}
                    </td>
                    <td>
                        <span class="badge-status ${isVisible ? 'status-cerrado' : 'status-descartado'}" style="display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fa-solid ${isVisible ? 'fa-circle-check' : 'fa-eye-slash'}"></i>
                            ${isVisible ? 'Visible' : 'Oculto'}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button type="button" class="btn-table-action btn-toggle-banner-vis ${isVisible ? 'visible' : 'hidden'}" data-id="${b.id}" title="${isVisible ? 'Clic para ocultar del carrusel' : 'Clic para mostrar en el carrusel'}">
                                <i class="fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                            </button>
                            <button type="button" class="btn-table-action btn-edit-banner" data-id="${b.id}" title="Editar banner">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button type="button" class="btn-table-action delete btn-delete-banner" data-id="${b.id}" title="Eliminar banner">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach listeners for banner table actions
        document.querySelectorAll('.btn-toggle-banner-vis').forEach(btn => {
            btn.addEventListener('click', async () => {
                const bId = btn.getAttribute('data-id');
                const banner = allBanners.find(x => String(x.id) === String(bId));
                if (!banner) return;

                const newActive = !banner.is_active;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                try {
                    await sb.from('banners').update({ is_active: newActive }).eq('id', bId);
                } catch(e) {
                    console.warn('Supabase banner toggle fallback to local:', e);
                }

                banner.is_active = newActive;
                localStorage.setItem('imbera_banners', JSON.stringify(allBanners));
                renderBannersTable(allBanners);
            });
        });

        document.querySelectorAll('.btn-edit-banner').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.getAttribute('data-id');
                openEditBannerModal(bId);
            });
        });

        document.querySelectorAll('.btn-delete-banner').forEach(btn => {
            btn.addEventListener('click', async () => {
                const bId = btn.getAttribute('data-id');
                const banner = allBanners.find(x => String(x.id) === String(bId));
                if (!banner) return;

                if (!confirm(`¿Estás seguro de eliminar el banner "${banner.title || 'seleccionado'}"?`)) return;

                try {
                    await sb.from('banners').delete().eq('id', bId);
                } catch(e) {
                    console.warn('Supabase banner delete fallback to local:', e);
                }

                allBanners = allBanners.filter(x => String(x.id) !== String(bId));
                localStorage.setItem('imbera_banners', JSON.stringify(allBanners));
                renderBannersTable(allBanners);
            });
        });
    }

    function openEditBannerModal(bannerId) {
        const b = allBanners.find(x => String(x.id) === String(bannerId));
        if (!b) return;

        bannerModalTitle.innerText = 'Editar Banner';
        editBannerId.value = b.id;
        bInputTitle.value = b.title || '';
        bInputIsActive.checked = b.is_active !== false;
        bInputDesktopImage.value = b.desktop_image || '';
        bInputMobileImage.value = b.mobile_image || '';
        bInputLinkUrl.value = b.link_url || '';
        bInputOrder.value = b.display_order || 1;
        bInputTargetBlank.checked = !!b.target_blank;

        updateDesktopPreview(b.desktop_image);
        updateMobilePreview(b.mobile_image);

        bannerModal.classList.add('active');
    }

    function openAddBannerModal() {
        bannerModalTitle.innerText = 'Agregar Nuevo Banner';
        bannerForm.reset();
        editBannerId.value = '';
        bInputIsActive.checked = true;
        bInputOrder.value = allBanners.length + 1;
        updateDesktopPreview('');
        updateMobilePreview('');
        bannerModal.classList.add('active');
    }

    function updateDesktopPreview(url) {
        if (!imgPreviewDesktop || !previewDesktopContainer) return;
        if (url && url.trim().length > 0) {
            imgPreviewDesktop.src = url.trim();
            previewDesktopContainer.style.display = 'block';
        } else {
            previewDesktopContainer.style.display = 'none';
        }
    }

    function updateMobilePreview(url) {
        if (!imgPreviewMobile || !previewMobileContainer) return;
        if (url && url.trim().length > 0) {
            imgPreviewMobile.src = url.trim();
            previewMobileContainer.style.display = 'block';
        } else {
            previewMobileContainer.style.display = 'none';
        }
    }

    if (bInputDesktopImage) {
        bInputDesktopImage.addEventListener('input', (e) => updateDesktopPreview(e.target.value));
    }
    if (bInputMobileImage) {
        bInputMobileImage.addEventListener('input', (e) => updateMobilePreview(e.target.value));
    }

    if (btnOpenAddBannerModal) {
        btnOpenAddBannerModal.addEventListener('click', openAddBannerModal);
    }
    if (btnCloseBannerModal) {
        btnCloseBannerModal.addEventListener('click', () => bannerModal.classList.remove('active'));
    }
    if (btnCancelBannerModal) {
        btnCancelBannerModal.addEventListener('click', () => bannerModal.classList.remove('active'));
    }
    if (btnRefreshBanners) {
        btnRefreshBanners.addEventListener('click', () => fetchBanners());
    }

    if (searchBannersInput) {
        searchBannersInput.addEventListener('input', () => {
            const q = searchBannersInput.value.toLowerCase().trim();
            const filtered = allBanners.filter(b => 
                (b.title && b.title.toLowerCase().includes(q)) || 
                (b.link_url && b.link_url.toLowerCase().includes(q))
            );
            renderBannersTable(filtered);
        });
    }

    // Modal Dropzone setup for Banners
    setupModalDropzone('bannerDropzoneDesktop', 'bannerFileDesktop', 'bInputDesktopImage', 'product-images', 'Imagen Desktop subida');
    setupModalDropzone('bannerDropzoneMobile', 'bannerFileMobile', 'bInputMobileImage', 'product-images', 'Imagen Móvil subida');

    const bannerFileDesktopEl = document.getElementById('bannerFileDesktop');
    if (bannerFileDesktopEl) {
        bannerFileDesktopEl.addEventListener('change', () => {
            setTimeout(() => updateDesktopPreview(bInputDesktopImage.value), 600);
        });
    }
    const bannerFileMobileEl = document.getElementById('bannerFileMobile');
    if (bannerFileMobileEl) {
        bannerFileMobileEl.addEventListener('change', () => {
            setTimeout(() => updateMobilePreview(bInputMobileImage.value), 600);
        });
    }

    if (bannerForm) {
        bannerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bId = editBannerId.value;
            const submitBtn = document.getElementById('btnSaveBanner');
            const originalBtnText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

            const payload = {
                title: bInputTitle.value.trim(),
                desktop_image: bInputDesktopImage.value.trim(),
                mobile_image: bInputMobileImage.value.trim() || null,
                link_url: bInputLinkUrl.value.trim() || null,
                target_blank: bInputTargetBlank.checked,
                display_order: parseInt(bInputOrder.value, 10) || 1,
                is_active: bInputIsActive.checked,
                updated_at: new Date().toISOString()
            };

            try {
                if (bId) {
                    try {
                        const { error } = await sb.from('banners').update(payload).eq('id', bId);
                        if (error) console.warn('Supabase banner update warning:', error);
                    } catch(err) {
                        console.warn('Supabase direct error:', err);
                    }

                    const idx = allBanners.findIndex(x => String(x.id) === String(bId));
                    if (idx !== -1) {
                        allBanners[idx] = { ...allBanners[idx], ...payload };
                    }
                } else {
                    let newBannerId = 'banner-' + Date.now();
                    try {
                        const { data, error } = await sb.from('banners').insert([payload]).select();
                        if (error) console.warn('Supabase banner insert warning:', error);
                        if (data && data[0]) newBannerId = data[0].id;
                    } catch(err) {
                        console.warn('Supabase direct error:', err);
                    }

                    allBanners.push({ id: newBannerId, ...payload });
                }

                allBanners.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                localStorage.setItem('imbera_banners', JSON.stringify(allBanners));

                renderBannersTable(allBanners);
                bannerModal.classList.remove('active');
                alert('¡Banner guardado exitosamente!');
            } catch(err) {
                alert('Ocurrió un error al guardar: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // CHECK INITIAL SESSION
    checkAuthSession();
});
