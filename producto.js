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
                if (skuCode) skuCode.innerHTML = `Código / SKU: <span>${data.sku}</span>`;
                if (techName) techName.innerText = data.subtitle || data.model_code || '';
                if (quoteModelField) quoteModelField.value = `${data.commercial_name} (SKU: ${data.sku})`;
                if (quoteProductTitle) quoteProductTitle.innerText = data.commercial_name;

                if (data.main_image && mainImg) {
                    mainImg.src = data.main_image;
                }

                if (data.datasheet_url && pdfBtn) {
                    pdfBtn.href = data.datasheet_url;
                }

                // Update specs if available
                if (data.specifications) {
                    const specs = data.specifications;
                    if (specs.ext_height) document.getElementById('ext-height').innerText = `${specs.ext_height} mm`;
                    if (specs.ext_width) document.getElementById('ext-width').innerText = `${specs.ext_width} mm`;
                    if (specs.ext_depth) document.getElementById('ext-depth').innerText = `${specs.ext_depth} mm`;

                    if (specs.int_height) document.getElementById('int-height').innerText = `${specs.int_height} mm`;
                    if (specs.int_width) document.getElementById('int-width').innerText = `${specs.int_width} mm`;
                    if (specs.int_depth) document.getElementById('int-depth').innerText = `${specs.int_depth} mm`;
                }
            }
        } catch (e) {
            console.log('Cargando con plantilla predeterminada.');
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
