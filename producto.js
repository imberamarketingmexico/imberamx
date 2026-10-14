// Product Detail Page Logic (Interactive gallery & dynamic Supabase load)
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

    // 2. Load Product Dynamically from Supabase using Query Params or Clean URL Path
    const urlParams = new URLSearchParams(window.location.search);
    let skuParam = urlParams.get('sku');
    let idParam = urlParams.get('id');

    // If no query param, extract model or sku from permalink path: /cat/sub/model or /producto/cat/sub/model
    if (!skuParam && !idParam) {
        const pathSegments = window.location.pathname.split('/').filter(p => p && !p.endsWith('.html') && p !== 'producto');
        if (pathSegments.length > 0) {
            skuParam = pathSegments[pathSegments.length - 1];
        }
    }

    if ((skuParam || idParam) && window.imberaSupabase) {
        try {
            const sb = window.imberaSupabase.client();
            let query = sb.from('products').select('*, categories(*)');
            if (skuParam) {
                // Support exact 7-digit SKU or case-insensitive model code search
                query = query.or(`sku.eq.${skuParam},model_code.ilike.${skuParam}`);
            } else if (idParam) {
                query = query.eq('id', idParam);
            }

            const { data, error } = await query.single();
            if (data && !error) {
                // Short model version preferred as requested by user
                const displayName = data.model_code || data.commercial_name;

                // Resolve Parent Category for clean 3-level Hierarchy & Permalinks
                let parentCategory = null;
                const subCategory = data.categories;

                if (subCategory && subCategory.parent_id) {
                    try {
                        const { data: pCat } = await sb.from('categories').select('*').eq('id', subCategory.parent_id).single();
                        if (pCat) parentCategory = pCat;
                    } catch(err) {}
                }

                const parentSlug = parentCategory ? parentCategory.slug : (subCategory ? subCategory.slug : 'enfriadores');
                const subSlug = (parentCategory && subCategory) ? subCategory.slug : (parentCategory ? '' : 'equipos');
                const modelSlug = (data.model_code || data.sku).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

                // Clean Hierarchical Permalink: /parent/sub/model (e.g. /refrigeradores/refrigeradores-verticales/bvc01)
                const permalinkPath = subSlug ? `/${parentSlug}/${subSlug}/${modelSlug}` : `/${parentSlug}/${modelSlug}`;
                if (window.history && window.history.replaceState && !window.location.pathname.includes('/admin')) {
                    window.history.replaceState(null, '', permalinkPath);
                }

                // Update Breadcrumb Trail
                const breadcrumbCat = document.getElementById('breadcrumb-cat');
                const breadcrumbSub = document.getElementById('breadcrumb-sub');
                const breadcrumbSubItem = document.getElementById('breadcrumb-sub-item');
                const breadcrumbSubSep = document.getElementById('breadcrumb-sub-sep');
                const breadcrumbName = document.getElementById('breadcrumb-product-name');

                if (parentCategory && breadcrumbCat) {
                    breadcrumbCat.innerText = parentCategory.name;
                    breadcrumbCat.href = `/categoria/${parentCategory.slug}`;
                } else if (subCategory && breadcrumbCat) {
                    breadcrumbCat.innerText = subCategory.name;
                    breadcrumbCat.href = `/categoria/${subCategory.slug}`;
                }

                if (parentCategory && subCategory && breadcrumbSub && breadcrumbSubItem && breadcrumbSubSep) {
                    breadcrumbSub.innerText = subCategory.name;
                    breadcrumbSub.href = `/categoria/${parentCategory.slug}/${subCategory.slug}`;
                    breadcrumbSubItem.style.display = 'inline';
                    breadcrumbSubSep.style.display = 'inline';
                }

                // Update DOM elements dynamically
                document.title = `${displayName} (Código: ${data.sku}) | Imbera México`;
                const commName = document.getElementById('pCommercialName');
                const skuCode = document.getElementById('pSkuCode');
                const quoteModelField = document.getElementById('quoteModelField');
                const quoteProductTitle = document.querySelector('.quote-product-name');

                if (breadcrumbName) breadcrumbName.innerText = displayName;
                if (commName) commName.innerText = displayName;
                if (skuCode) skuCode.innerText = data.sku;
                if (quoteModelField) quoteModelField.value = `${displayName} (Código: ${data.sku})`;
                if (quoteProductTitle) quoteProductTitle.innerText = displayName;

                if (mainImg) {
                    if (data.main_image) mainImg.src = data.main_image;
                    mainImg.alt = `${displayName} - Imbera México`;
                }

                // Render Description bullets if provided
                if (data.description) {
                    const bulletsList = document.querySelector('.product-bullets');
                    if (bulletsList) {
                        const lines = data.description.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
                        if (lines.length > 0) {
                            bulletsList.innerHTML = lines.map(line => `<li>${line}</li>`).join('');
                        }
                    }
                }

                // Dynamic SEO Tags
                const descText = data.description ? data.description.replace(/\n/g, ' ').slice(0, 160) : `Ficha técnica oficial, dimensiones y cotización del equipo Imbera ${displayName} (Código: ${data.sku}).`;
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) metaDesc.content = descText;

                const ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) ogTitle.content = `${displayName} | Imbera México`;
                const ogDesc = document.querySelector('meta[property="og:description"]');
                if (ogDesc) ogDesc.content = descText;
                const ogImg = document.querySelector('meta[property="og:image"]');
                if (ogImg && data.main_image) ogImg.content = data.main_image;
                const ogUrl = document.querySelector('meta[property="og:url"]');
                if (ogUrl) ogUrl.content = window.location.href;

                // Dynamic Schema.org Product JSON-LD
                let productSchemaScript = document.getElementById('schema-product');
                if (!productSchemaScript) {
                    productSchemaScript = document.createElement('script');
                    productSchemaScript.id = 'schema-product';
                    productSchemaScript.type = 'application/ld+json';
                    document.head.appendChild(productSchemaScript);
                }
                productSchemaScript.text = JSON.stringify({
                    "@context": "https://schema.org/",
                    "@type": "Product",
                    "name": displayName,
                    "image": [data.main_image || (window.location.origin + "/images/Enfriador_G3D42_Especial.jpg")],
                    "description": descText,
                    "sku": data.sku,
                    "mpn": data.model_code || data.sku,
                    "brand": {
                        "@type": "Brand",
                        "name": "Imbera"
                    },
                    "offers": {
                        "@type": "Offer",
                        "url": window.location.href,
                        "priceCurrency": "MXN",
                        "availability": "https://schema.org/InStock",
                        "itemCondition": "https://schema.org/NewCondition"
                    }
                });

                // Handle 3 PDF buttons: only show if URL exists
                const pdf1Btn = document.getElementById('downloadPdfBtn');
                const pdf2Btn = document.getElementById('downloadManualBtn');
                const pdf3Btn = document.getElementById('downloadPartsBtn');

                if (pdf1Btn) {
                    if (data.datasheet_url) {
                        pdf1Btn.href = data.datasheet_url;
                        pdf1Btn.style.display = 'inline-flex';
                    } else {
                        pdf1Btn.style.display = 'none';
                    }
                }

                if (pdf2Btn) {
                    if (data.manual_url) {
                        pdf2Btn.href = data.manual_url;
                        pdf2Btn.style.display = 'inline-flex';
                    } else {
                        pdf2Btn.style.display = 'none';
                    }
                }

                if (pdf3Btn) {
                    if (data.parts_list_url) {
                        pdf3Btn.href = data.parts_list_url;
                        pdf3Btn.style.display = 'inline-flex';
                    } else {
                        pdf3Btn.style.display = 'none';
                    }
                }

                // If default template fallback has datasheet
                if (!skuParam && !idParam && pdf1Btn) {
                    pdf1Btn.style.display = 'inline-flex';
                }

                // Update specs if available
                if (data.specifications) {
                    const specs = data.specifications;
                    const formatMm = (val) => {
                        if (!val) return '-';
                        const str = String(val).trim();
                        return str.toLowerCase().includes('mm') ? str : `${str} mm`;
                    };

                    if (specs.ext_height && document.getElementById('ext-height')) document.getElementById('ext-height').innerText = formatMm(specs.ext_height);
                    if (specs.ext_width && document.getElementById('ext-width')) document.getElementById('ext-width').innerText = formatMm(specs.ext_width);
                    if (specs.ext_depth && document.getElementById('ext-depth')) document.getElementById('ext-depth').innerText = formatMm(specs.ext_depth);

                    if (specs.int_height && document.getElementById('int-height')) document.getElementById('int-height').innerText = formatMm(specs.int_height);
                    if (specs.int_width && document.getElementById('int-width')) document.getElementById('int-width').innerText = formatMm(specs.int_width);
                    if (specs.int_depth && document.getElementById('int-depth')) document.getElementById('int-depth').innerText = formatMm(specs.int_depth);

                    // Capacity in Technical Specs
                    const specCapEl = document.getElementById('spec-capacity');
                    const specCapRow = document.getElementById('spec-capacity-row');
                    if (specs.capacity) {
                        if (specCapEl) specCapEl.innerText = specs.capacity;
                        if (specCapRow) specCapRow.style.display = 'flex';
                    } else if (specCapRow) {
                        specCapRow.style.display = 'none';
                    }

                    if (specs.temp_range && document.getElementById('spec-temp')) document.getElementById('spec-temp').innerText = specs.temp_range;
                    if (specs.refrigerant && document.getElementById('spec-refrig')) document.getElementById('spec-refrig').innerText = specs.refrigerant;
                    if (specs.voltage && document.getElementById('spec-volt')) document.getElementById('spec-volt').innerText = specs.voltage;
                    if (specs.shelves && document.getElementById('spec-shelv')) document.getElementById('spec-shelv').innerText = specs.shelves;
                }

                // Register page view metric
                sb.from('page_views').insert([{
                    page_path: window.location.pathname + window.location.search,
                    referrer: document.referrer || null,
                    device_type: window.innerWidth < 768 ? 'mobile' : 'desktop'
                }]).then();
            }
        } catch (e) {
            console.log('Cargando con plantilla predeterminada.');
        }
    } else {
        // Fallback default sample view
        const defaultPdf = document.getElementById('downloadPdfBtn');
        if (defaultPdf) defaultPdf.style.display = 'inline-flex';
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
                if (!sb) {
                    throw new Error('Supabase no conectado');
                }

                const { data, error } = await sb.from('leads').insert([payload]);

                if (window.showSuccessModal) {
                    window.showSuccessModal(
                        '¡Cotización Solicitada!',
                        'Hemos registrado tu solicitud para este equipo. Un asesor comercial especializado de Imbera se pondrá en contacto contigo a la brevedad con la cotización formal.'
                    );
                } else {
                    alert('¡Solicitud de cotización enviada con éxito!');
                }
                quoteForm.reset();
            } catch (err) {
                console.error('Error enviando cotización:', err);
                alert('No se pudo enviar en este momento. Por favor comunícate a marketing@imberacooling.com o al 427 271 8000.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }
});
