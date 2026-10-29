// ==============================================================================
// PRODUCTO.JS - Lógica de Detalle de Producto con Carga Instantánea (0ms) y Caché
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Gallery Thumbnail Switcher
    const mainImg = document.getElementById('mainProductImage');
    const thumbBtns = document.querySelectorAll('.thumb-btn');

    thumbBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            thumbBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetSrc = btn.getAttribute('data-src');
            if (mainImg && targetSrc) {
                mainImg.style.opacity = '0.3';
                setTimeout(() => {
                    mainImg.src = targetSrc;
                    mainImg.style.opacity = '1';
                }, 150);
            }
        });
    });

    // Helper to format bullets and strip out ANY price information
    function parseDescriptionBullets(rawDesc) {
        if (!rawDesc) return [];

        let chunks = [];
        if (rawDesc.includes('|')) {
            chunks = rawDesc.split('|');
        } else if (rawDesc.includes('\n')) {
            chunks = rawDesc.split('\n');
        } else if (rawDesc.includes('•')) {
            chunks = rawDesc.split('•');
        } else if (rawDesc.includes(';')) {
            chunks = rawDesc.split(';');
        } else {
            chunks = [rawDesc];
        }

        const priceFilterRegex = /precio|\$|mxn|usd/i;
        const cleanItemRegex = /(?:precio(?:\s+de\s+lista)?[:\s]*\$?[\d,.]+(?:\s*mxn|\s*usd)?(?:\s*\([^)]*\))?|\$[\d,.]+(?:\s*mxn|\s*usd)?)/gi;
        const pageRegex = /\(?p[aá]g\.?\s*\d+\)?/gi;

        const validBullets = [];

        chunks.forEach(c => {
            let text = c.trim();
            if (priceFilterRegex.test(text) && text.replace(cleanItemRegex, '').replace(pageRegex, '').trim().length < 4) {
                return;
            }

            text = text.replace(cleanItemRegex, '').replace(pageRegex, '').trim();
            text = text.replace(/^[•\-\*\.0-9\)]+\s*/, '').trim();
            text = text.replace(/[|;]+$/, '').trim();

            if (text && text.length > 2) {
                validBullets.push(text);
            }
        });

        return validBullets;
    }

    // Function to render complete product data and remove all skeleton loading states
    function renderProductData(data) {
        if (!data) return;

        const displayName = data.model_code || data.commercial_name;

        // Commercial Name & SKU Code
        const commName = document.getElementById('pCommercialName');
        const skuCode = document.getElementById('pSkuCode');
        const breadcrumbName = document.getElementById('breadcrumb-product-name');
        const quoteModelField = document.getElementById('quoteModelField');
        const quoteProductTitle = document.querySelector('.quote-product-name');

        if (commName) {
            commName.innerText = displayName;
            commName.classList.remove('skeleton-shimmer');
            commName.style.minWidth = '';
            commName.style.minHeight = '';
        }

        if (skuCode) {
            skuCode.innerText = data.sku;
            skuCode.classList.remove('skeleton-shimmer');
            skuCode.style.minWidth = '';
        }

        if (breadcrumbName) {
            breadcrumbName.innerText = displayName;
        }

        if (quoteModelField) {
            quoteModelField.value = `${displayName} (Código: ${data.sku})`;
        }

        if (quoteProductTitle) {
            quoteProductTitle.innerText = displayName;
        }

        // Update Page Title & SEO Meta Tags
        document.title = `${displayName} (Código: ${data.sku}) | Imbera México`;

        const cleanBullets = parseDescriptionBullets(data.description);
        const descText = cleanBullets.length > 0 
            ? cleanBullets.join('. ').slice(0, 160) 
            : `Ficha técnica oficial, dimensiones y cotización del equipo Imbera ${displayName} (Código: ${data.sku}).`;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = descText;

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = `${displayName} | Imbera México`;
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = descText;
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg && data.main_image) ogImg.content = data.main_image;

        // Main Image with smooth fade-in
        const imgLoader = document.getElementById('imageLoaderPlaceholder');
        if (mainImg) {
            const rawImg = data.main_image || 'images/Enfriador_G3D42_Especial.jpg';
            const targetImageSrc = typeof window.toProxiedStorageUrl === 'function' ? window.toProxiedStorageUrl(rawImg) : rawImg;
            mainImg.onload = () => {
                mainImg.style.opacity = '1';
                if (imgLoader) imgLoader.classList.add('hidden');
            };
            mainImg.src = targetImageSrc;
            mainImg.alt = `${displayName} - Imbera México`;

            if (mainImg.complete && mainImg.naturalWidth > 0) {
                mainImg.style.opacity = '1';
                if (imgLoader) imgLoader.classList.add('hidden');
            }
        }

        // Breadcrumb Category Links
        const subCategory = data.categories;
        const breadcrumbCat = document.getElementById('breadcrumb-cat');
        if (subCategory && breadcrumbCat) {
            breadcrumbCat.innerText = subCategory.name;
            breadcrumbCat.href = `/categoria?cat=${encodeURIComponent(subCategory.slug)}`;
        }

        // Description Bullets
        const bulletsList = document.querySelector('.product-bullets');
        if (bulletsList) {
            if (cleanBullets.length > 0) {
                bulletsList.innerHTML = cleanBullets.map(line => `<li>${line}</li>`).join('');
            } else {
                bulletsList.innerHTML = `
                    <li>Equipo de refrigeración comercial diseñado para máxima durabilidad y eficiencia energética.</li>
                    <li>Excelente retención térmica y conservación uniforme de temperatura.</li>
                    <li>Garantía oficial de 2 años con respaldo y servicio técnico en todo México.</li>
                `;
            }
        }

        // PDF Buttons
        const pdf1Btn = document.getElementById('downloadPdfBtn');
        const pdf2Btn = document.getElementById('downloadManualBtn');
        const pdf3Btn = document.getElementById('downloadPartsBtn');

        const cleanPdfUrl = (url) => {
            if (!url) return '';
            return typeof window.toProxiedStorageUrl === 'function' ? window.toProxiedStorageUrl(url) : url;
        };

        if (pdf1Btn) {
            if (data.datasheet_url) {
                pdf1Btn.href = cleanPdfUrl(data.datasheet_url);
                pdf1Btn.style.display = 'inline-flex';
            } else {
                pdf1Btn.style.display = 'none';
            }
        }

        if (pdf2Btn) {
            if (data.manual_url) {
                pdf2Btn.href = cleanPdfUrl(data.manual_url);
                pdf2Btn.style.display = 'inline-flex';
            } else {
                pdf2Btn.style.display = 'none';
            }
        }

        if (pdf3Btn) {
            if (data.parts_list_url) {
                pdf3Btn.href = cleanPdfUrl(data.parts_list_url);
                pdf3Btn.style.display = 'inline-flex';
            } else {
                pdf3Btn.style.display = 'none';
            }
        }

        // Technical Specifications
        if (data.specifications) {
            const specs = data.specifications;
            const formatMm = (val) => {
                if (!val) return '-';
                const str = String(val).trim();
                return str.toLowerCase().includes('mm') ? str : `${str} mm`;
            };

            const updateSpec = (id, val, isMm = false) => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerText = isMm ? formatMm(val) : (val || '-');
                    el.classList.remove('skeleton-shimmer');
                    el.style.minWidth = '';
                }
            };

            updateSpec('ext-height', specs.ext_height, true);
            updateSpec('ext-width', specs.ext_width, true);
            updateSpec('ext-depth', specs.ext_depth, true);
            updateSpec('int-height', specs.int_height, true);
            updateSpec('int-width', specs.int_width, true);
            updateSpec('int-depth', specs.int_depth, true);

            const specCapEl = document.getElementById('spec-capacity');
            const specCapRow = document.getElementById('spec-capacity-row');
            if (specs.capacity) {
                if (specCapEl) {
                    specCapEl.innerText = specs.capacity;
                    specCapEl.classList.remove('skeleton-shimmer');
                    specCapEl.style.minWidth = '';
                }
                if (specCapRow) specCapRow.style.display = 'flex';
            } else if (specCapRow) {
                specCapRow.style.display = 'none';
            }

            updateSpec('spec-temp', specs.temp_range);
            updateSpec('spec-refrig', specs.refrigerant);
            updateSpec('spec-volt', specs.voltage);
            updateSpec('spec-shelv', specs.shelves);
        } else {
            document.querySelectorAll('.specs-minimal-container .skeleton-shimmer').forEach(el => {
                el.classList.remove('skeleton-shimmer');
                el.style.minWidth = '';
            });
        }
    }

    function showNotFoundState() {
        const layout = document.querySelector('.product-layout-grid');
        if (layout) {
            layout.innerHTML = `
                <div style="grid-column: span 2; text-align: center; padding: 80px 20px;">
                    <i class="fa-solid fa-triangle-exclamation fa-3x" style="color: #f59e0b; margin-bottom: 16px;"></i>
                    <h2 style="font-size: 24px; color: #0f172a; margin-bottom: 10px;">Equipo no encontrado</h2>
                    <p style="color: #64748b; font-size: 15px; margin-bottom: 25px;">El modelo o código solicitado no está disponible en este momento.</p>
                    <a href="categoria.html" class="btn-view" style="display: inline-block; padding: 12px 28px; text-decoration: none;">Ver todo el catálogo</a>
                </div>
            `;
        }
    }

    function findProductMatch(productsList, identifier, idParam) {
        if (!Array.isArray(productsList) || productsList.length === 0) return null;
        const qRaw = (identifier || '').trim().toLowerCase();
        const qClean = qRaw.replace(/[^a-z0-9]/g, '');
        const idClean = (idParam || '').trim().toLowerCase();

        if (idClean) {
            const byId = productsList.find(p => String(p.id || '').toLowerCase() === idClean);
            if (byId) return byId;
        }

        if (!qClean) return null;

        // 1. Exact SKU match
        const bySku = productsList.find(p => String(p.sku || '').toLowerCase() === qRaw);
        if (bySku) return bySku;

        // 2. Exact Model Code match (e.g. VR12, VR12-B)
        const byModel = productsList.find(p => {
            const mClean = String(p.model_code || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            return mClean && mClean === qClean;
        });
        if (byModel) return byModel;

        // 3. Exact generated slug match
        const bySlug = productsList.find(p => {
            const slug = typeof window.generateProductSlug === 'function' ? window.generateProductSlug(p) : '';
            return slug && slug === qRaw;
        });
        if (bySlug) return bySlug;

        // 4. Model code contained in slug (e.g. "vitrina-cremera-phs13-n" contains "phs13n")
        const byModelInside = productsList.find(p => {
            const mClean = String(p.model_code || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (mClean && mClean.length >= 3) {
                return qClean.endsWith(mClean) || qClean.includes(mClean);
            }
            return false;
        });
        if (byModelInside) return byModelInside;

        // 5. Commercial name partial match
        const byName = productsList.find(p => {
            const cClean = String(p.commercial_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            return cClean && (cClean.includes(qClean) || qClean.includes(cClean));
        });
        if (byName) return byName;

        return null;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let skuParam = urlParams.get('sku') || urlParams.get('p') || urlParams.get('model');
    let idParam = urlParams.get('id');

    if (!skuParam && !idParam) {
        const pathSegments = window.location.pathname.split('/').filter(p => p && !p.endsWith('.html') && p !== 'producto');
        if (pathSegments.length > 0) {
            skuParam = decodeURIComponent(pathSegments[pathSegments.length - 1]);
        }
    }

    // --- INSTANT CACHE & STATIC BASELINE CHECK (0ms Render) ---
    let cached = null;
    try {
        if (skuParam) {
            cached = JSON.parse(sessionStorage.getItem('imbera_prod_sku_' + skuParam) || 'null');
            if (!cached) {
                cached = JSON.parse(sessionStorage.getItem('imbera_prod_slug_' + skuParam.toLowerCase()) || 'null');
            }
        }
    } catch(e) {}

    if (!cached && window.IMBERA_DATA && Array.isArray(window.IMBERA_DATA.products)) {
        cached = findProductMatch(window.IMBERA_DATA.products, skuParam, idParam);
    }

    if (cached) {
        renderProductData(cached);
        try {
            const cleanSlug = typeof window.generateProductSlug === 'function' ? window.generateProductSlug(cached) : '';
            if (cleanSlug && !window.location.pathname.includes(cleanSlug)) {
                window.history.replaceState({ sku: cached.sku, slug: cleanSlug }, '', `/producto/${cleanSlug}`);
            }
        } catch(e) {}
    }

    // --- ASYNC NETWORK FETCH (Supabase verification & page view) ---
    if ((skuParam || idParam) && window.imberaSupabase) {
        try {
            const sb = window.imberaSupabase.client();
            let query = sb.from('products').select('*, categories(*)');
            
            // Si el parámetro es puramente numérico (SKU)
            if (skuParam && /^\d+$/.test(skuParam.trim())) {
                query = query.eq('sku', skuParam.trim());
            } else if (idParam) {
                query = query.eq('id', idParam);
            } else {
                // Si es un slug o modelo alfanumérico
                query = query.eq('is_active', true);
            }

            const { data: rows, error } = await query;
            let data = null;
            if (rows && rows.length > 0) {
                data = rows.length === 1 && (/^\d+$/.test(skuParam || '') || idParam) 
                    ? rows[0] 
                    : findProductMatch(rows, skuParam, idParam);
            }

            if (data && !error) {
                renderProductData(data);

                // Actualizar URL limpia en navegador silenciosamente si venía por SKU o link anterior
                try {
                    const cleanSlug = typeof window.generateProductSlug === 'function' ? window.generateProductSlug(data) : '';
                    if (cleanSlug && !window.location.pathname.includes(cleanSlug)) {
                        window.history.replaceState({ sku: data.sku, slug: cleanSlug }, '', `/producto/${cleanSlug}`);
                    }
                } catch(e) {}

                // Cache in sessionStorage for subsequent instantaneous visits
                try {
                    if (data.sku) sessionStorage.setItem('imbera_prod_sku_' + data.sku, JSON.stringify(data));
                    const cleanSlug = typeof window.generateProductSlug === 'function' ? window.generateProductSlug(data) : '';
                    if (cleanSlug) sessionStorage.setItem('imbera_prod_slug_' + cleanSlug, JSON.stringify(data));
                } catch(e) {}

                // Register page view metric
                sb.from('page_views').insert([{
                    page_path: window.location.pathname + window.location.search,
                    referrer: document.referrer || null,
                    device_type: window.innerWidth < 768 ? 'mobile' : 'desktop'
                }]).then();
            } else if (!cached) {
                showNotFoundState();
            }
        } catch (e) {
            console.error('Error al consultar producto:', e);
            if (!cached) showNotFoundState();
        }
    }

    // 3. Product Specific Lead Form Submission to Supabase
    const quoteForm = document.getElementById('productQuoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('btnProductQuoteSubmit');
            const originalText = submitBtn ? submitBtn.innerHTML : 'Enviar';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando cotización...';
            }

            const payload = {
                full_name: document.getElementById('pq_name')?.value?.trim(),
                phone: document.getElementById('pq_phone')?.value?.trim(),
                email: document.getElementById('pq_email')?.value?.trim(),
                units_count: parseInt(document.getElementById('pq_units')?.value, 10) || 1,
                state: document.getElementById('pq_state')?.value || null,
                product_interest: document.getElementById('quoteModelField')?.value || 'Detalle de producto',
                message: document.getElementById('pq_notes')?.value?.trim() || null,
                source_page: 'detalle-producto'
            };

            try {
                const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
                if (!sb) throw new Error('Supabase no disponible.');

                const { data, error } = await sb.from('leads').insert([payload]);
                if (error) throw error;

                // Send automated notification via Power Automate to marketing@imberacooling.com
                if (typeof window.sendLeadNotification === 'function') {
                    window.sendLeadNotification({
                        nombre: payload.full_name,
                        email: payload.email,
                        telefono: payload.phone,
                        estado: payload.state,
                        modelo: payload.product_interest,
                        sku: document.getElementById('pSkuCode')?.innerText?.trim() || '',
                        mensaje: payload.message || '',
                        units_count: payload.units_count
                    });
                }

                if (window.showSuccessModal) {
                    window.showSuccessModal(
                        '¡Cotización Solicitada!',
                        `Tu solicitud para ${payload.product_interest} ha sido recibida con éxito. Un ejecutivo comercial se comunicará contigo hoy mismo.`
                    );
                } else {
                    alert('¡Muchas gracias! Tu cotización ha sido recibida.');
                }
                quoteForm.reset();
            } catch (err) {
                console.error('Error al guardar lead:', err);
                alert('Hubo un inconveniente al registrar tu cotización. Por favor contáctanos al 427 271 8000.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }

    // Scroll suave al formulario de cotización evitando la redirección a la raíz
    document.querySelectorAll('.btn-quote-now, a[href="#cotizar-equipo"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = document.getElementById('cotizar-equipo');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => {
                    const nameField = document.getElementById('pq_name');
                    if (nameField) nameField.focus();
                }, 400);
            }
        });
    });
});
