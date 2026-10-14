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

    // 2. Load Product Dynamically from Supabase if SKU or ID is in URL (?sku=... or ?id=...)
    const urlParams = new URLSearchParams(window.location.search);
    const skuParam = urlParams.get('sku');
    const idParam = urlParams.get('id');

    if ((skuParam || idParam) && window.imberaSupabase) {
        try {
            const sb = window.imberaSupabase.client();
            let query = sb.from('products').select('*');
            if (skuParam) {
                query = query.eq('sku', skuParam);
            } else if (idParam) {
                query = query.eq('id', idParam);
            }

            const { data, error } = await query.single();
            if (data && !error) {
                // Update DOM elements dynamically
                document.title = `${data.commercial_name} | Imbera`;
                const breadcrumbName = document.getElementById('breadcrumb-product-name');
                const commName = document.getElementById('pCommercialName');
                const skuCode = document.getElementById('pSkuCode');
                const techName = document.getElementById('pTechName');
                const quoteModelField = document.getElementById('quoteModelField');
                const quoteProductTitle = document.querySelector('.quote-product-name');
                const pdfBtn = document.getElementById('downloadPdfBtn');

                if (breadcrumbName) breadcrumbName.innerText = data.commercial_name;
                if (commName) commName.innerText = data.commercial_name;
                if (skuCode) skuCode.innerText = data.sku;
                if (techName) techName.innerText = data.subtitle || data.model_code || '';
                if (quoteModelField) quoteModelField.value = `${data.commercial_name} (Código: ${data.sku})`;
                if (quoteProductTitle) quoteProductTitle.innerText = data.commercial_name;

                if (data.main_image && mainImg) {
                    mainImg.src = data.main_image;
                }

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
