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
            fetchAnalytics()
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

            return `
                <tr>
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
                        <span class="badge-status ${p.is_active ? 'status-cerrado' : 'status-descartado'}">
                            ${p.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
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

    function applyProductFilters() {
        const query = (searchProductsInput?.value || '').toLowerCase();
        const catId = filterProductCategory?.value || 'all';

        const filtered = allProducts.filter(p => {
            const matchesQuery = (
                (p.commercial_name && p.commercial_name.toLowerCase().includes(query)) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.model_code && p.model_code.toLowerCase().includes(query))
            );
            const matchesCat = (catId === 'all' || p.category_id === catId);
            return matchesQuery && matchesCat;
        });

        renderProductsTable(filtered);
    }

    // PRODUCT MODAL OPEN & CLOSE
    if (btnOpenNewProductModal) {
        btnOpenNewProductModal.addEventListener('click', () => {
            productForm.reset();
            editProductId.value = '';
            productModalTitle.innerText = 'Agregar Nuevo Equipo';
            productModal.classList.add('active');
        });
    }

    function openProductModalForEdit(p) {
        productForm.reset();
        editProductId.value = p.id;
        productModalTitle.innerText = `Editar Equipo: ${p.commercial_name}`;

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
                description: document.getElementById('pInputDescription').value.trim() || null,
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
            complete: function(results) {
                parsedCsvData = results.data;
                renderCsvPreview(parsedCsvData);
            },
            error: function(err) {
                alert('Error al leer el archivo CSV: ' + err.message);
            }
        });
    }

    function renderCsvPreview(rows) {
        if (!csvPreviewSection || !csvPreviewTbody) return;
        csvRowsCount.innerText = rows.length;
        csvPreviewSection.style.display = 'block';

        csvPreviewTbody.innerHTML = rows.slice(0, 10).map(r => `
            <tr>
                <td><code>${r.sku || 'N/A'}</code></td>
                <td><strong>${r.commercial_name || 'N/A'}</strong></td>
                <td>${r.category_slug || 'N/A'}</td>
                <td><small>${r.datasheet_url ? '✓ Ficha adjunta' : 'Sin ficha'}</small></td>
                <td><small>${r.manual_url ? '✓ Manual' : '-'}</small></td>
                <td><small>${r.parts_list_url ? '✓ Partes' : '-'}</small></td>
                <td>${r.ext_height || 0}x${r.ext_width || 0}x${r.ext_depth || 0}mm</td>
            </tr>
        `).join('');

        if (rows.length > 10) {
            csvPreviewTbody.innerHTML += `<tr><td colspan="7" class="text-center py-2 text-muted">... y ${rows.length - 10} productos más listos para importar.</td></tr>`;
        }
    }

    if (btnConfirmBulkImport) {
        btnConfirmBulkImport.addEventListener('click', async () => {
            if (parsedCsvData.length === 0) return;

            btnConfirmBulkImport.disabled = true;
            btnConfirmBulkImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importando a Supabase...';

            const categoryMap = {};
            allCategories.forEach(c => { categoryMap[c.slug.toLowerCase()] = c.id; });

            const payloadRows = parsedCsvData.map(r => {
                const catSlug = (r.category_slug || '').toLowerCase().trim();
                const codeRaw = (r.codigo || r.sku || '').toString().trim();
                return {
                    sku: codeRaw,
                    commercial_name: (r.commercial_name || 'Equipo Imbera').trim(),
                    model_code: r.model_code || null,
                    subtitle: r.subtitle || null,
                    description: r.description || null,
                    category_id: categoryMap[catSlug] || null,
                    main_image: r.main_image || null,
                    datasheet_url: r.datasheet_url || null,
                    manual_url: r.manual_url || null,
                    parts_list_url: r.parts_list_url || null,
                    specifications: {
                        capacity: r.capacity || null,
                        ext_height: r.ext_height || null,
                        ext_width: r.ext_width || null,
                        ext_depth: r.ext_depth || null,
                        int_height: r.int_height || null,
                        int_width: r.int_width || null,
                        int_depth: r.int_depth || null,
                        temp_range: r.temp_range || null,
                        refrigerant: r.refrigerant || null,
                        voltage: r.voltage || null,
                        shelves: r.shelves || null
                    }
                };
            });

            try {
                const { data, error } = await sb.from('products').upsert(payloadRows, { onConflict: 'sku' });
                if (error) throw error;

                alert(`¡Éxito! Se han importado / actualizado ${payloadRows.length} equipos en la base de datos.`);
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

    // CHECK INITIAL SESSION
    checkAuthSession();
});
