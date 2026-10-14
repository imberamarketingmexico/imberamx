document.addEventListener('DOMContentLoaded', () => {
    // Lightweight Analytics Tracker
    if (window.imberaSupabase) {
        try {
            const sb = window.imberaSupabase.client();
            if (sb) {
                sb.from('page_views').insert([{
                    page_path: window.location.pathname || '/',
                    referrer: document.referrer || null,
                    device_type: window.innerWidth < 768 ? 'mobile' : 'desktop'
                }]).then();
            }
        } catch(e) {}
    }

    /* Carousel Logic */
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const indicators = document.querySelectorAll('.indicator');
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoPlayInterval;

    function showSlide(index) {
        // Reset all
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(ind => ind.classList.remove('active'));
        
        // Handle index bounds
        if (index >= totalSlides) currentSlide = 0;
        else if (index < 0) currentSlide = totalSlides - 1;
        else currentSlide = index;
        
        // Show current
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    // Event Listeners
    if(nextBtn) nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
    });
    
    if(prevBtn) prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoPlay();
    });

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
            resetAutoPlay();
        });
    });

    // Auto Play
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    startAutoPlay();

    /* Dropdown Hover Optimization (Optional: handled by CSS but JS can add delay for better UX) */
    const productsLink = document.querySelector('.has-dropdown');
    const dropdown = document.querySelector('.dropdown');
    
    let timeout;
    
    productsLink.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        dropdown.classList.add('visible');
    });
    
    productsLink.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
            dropdown.classList.remove('visible');
        }, 300);
    });

    /* ==========================================================================
       Search Bar: Universal Submit & Live Supabase Autocomplete
       ========================================================================== */
    const searchBoxes = document.querySelectorAll('.search-box');
    searchBoxes.forEach(box => {
        const form = box.querySelector('.search-form');
        const searchInput = form ? form.querySelector('input') : null;
        if (!form || !searchInput) return;

        // Ensure form submission targets categoria.html?q=...
        form.setAttribute('action', 'categoria.html');
        form.setAttribute('method', 'GET');
        searchInput.setAttribute('name', 'q');

        // Create or locate autocomplete container
        let dropdown = box.querySelector('.search-autocomplete-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'search-autocomplete-dropdown';
            box.appendChild(dropdown);
        }

        let debounceTimer = null;

        form.addEventListener('submit', (e) => {
            const query = searchInput.value.trim();
            if (!query) {
                e.preventDefault();
                return;
            }
            window.location.href = `categoria.html?q=${encodeURIComponent(query)}`;
            e.preventDefault();
        });

        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = searchInput.value.trim();

            if (val.length < 2) {
                dropdown.innerHTML = '';
                dropdown.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(async () => {
                if (!window.imberaSupabase) return;
                try {
                    const sb = window.imberaSupabase.client();
                    const { data, error } = await sb.from('products')
                        .select('*, categories(*)')
                        .eq('is_active', true)
                        .or(`commercial_name.ilike.%${val}%,model_code.ilike.%${val}%,sku.ilike.%${val}%,subtitle.ilike.%${val}%`)
                        .limit(5);

                    if (error || !data || data.length === 0) {
                        dropdown.innerHTML = `
                            <div style="padding: 15px; text-align: center; color: #94a3b8; font-size: 13px;">
                                No se encontraron resultados para "<strong>${val}</strong>"
                            </div>
                        `;
                        dropdown.classList.add('active');
                        return;
                    }

                    // Cache products in sessionStorage for 0ms instant loading
                    data.forEach(p => {
                        try {
                            if (p.sku) sessionStorage.setItem('imbera_prod_sku_' + p.sku, JSON.stringify(p));
                            if (p.model_code) {
                                const mSlug = p.model_code.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                                sessionStorage.setItem('imbera_prod_slug_' + mSlug, JSON.stringify(p));
                            }
                        } catch(e) {}
                    });

                    dropdown.innerHTML = data.map(p => {
                        const displayName = p.model_code || p.commercial_name;
                        const catSlug = p.categories?.slug || 'enfriadores';
                        const modelSlug = (p.model_code || p.sku).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                        const targetUrl = `/${catSlug}/equipos/${modelSlug}?sku=${encodeURIComponent(p.sku)}`;
                        const img = p.main_image || 'images/Enfriador_G3D42_Especial.jpg';

                        return `
                            <a href="${targetUrl}" class="search-result-item">
                                <img src="${img}" alt="${displayName}" class="search-result-thumb">
                                <div class="search-result-info">
                                    <span class="search-result-title">${displayName}</span>
                                    <span class="search-result-sku" style="font-size: 11px; color: #64748b;">Código: ${p.sku}</span>
                                </div>
                            </a>
                        `;
                    }).join('') + `
                        <a href="categoria.html?q=${encodeURIComponent(val)}" class="search-view-all" style="display: block; padding: 10px; text-align: center; background: #f8fafc; font-size: 12px; font-weight: 700; color: var(--primary-color); border-top: 1px solid #e2e8f0; text-decoration: none;">
                            Ver todos los resultados para "${val}" <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 4px;"></i>
                        </a>
                    `;
                    dropdown.classList.add('active');
                } catch(e) {
                    dropdown.classList.remove('active');
                }
            }, 250);
        });

        // Hide autocomplete on Escape or outside click
        document.addEventListener('click', (e) => {
            if (!box.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('active');
            }
        });
    });
    
    /* Product Slider Logic */
    const prodSlider = document.getElementById('productSlider');
    const prodPrev = document.getElementById('prodPrev');
    const prodNext = document.getElementById('prodNext');

    if (prodSlider && prodNext && prodPrev) {
        prodNext.addEventListener('click', () => {
            prodSlider.scrollBy({ left: 300, behavior: 'smooth' });
        });

        prodPrev.addEventListener('click', () => {
            prodSlider.scrollBy({ left: -300, behavior: 'smooth' });
        });
    }

    // Dynamic feed of latest uploaded products from Supabase for the carousel
    async function loadLatestProductsIntoSlider() {
        if (!prodSlider || !window.imberaSupabase) return;
        try {
            const sb = window.imberaSupabase.client();
            const { data, error } = await sb.from('products')
                .select('*, categories(*)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(8);

            if (data && data.length > 0) {
                // Cache products in sessionStorage for 0ms instant loading
                data.forEach(p => {
                    try {
                        if (p.sku) sessionStorage.setItem('imbera_prod_sku_' + p.sku, JSON.stringify(p));
                        if (p.model_code) {
                            const mSlug = p.model_code.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                            sessionStorage.setItem('imbera_prod_slug_' + mSlug, JSON.stringify(p));
                        }
                    } catch(e) {}
                });

                prodSlider.innerHTML = data.map(p => {
                    const displayName = p.model_code || p.commercial_name;
                    const catSlug = p.categories?.slug || 'enfriadores';
                    const modelSlug = (p.model_code || p.sku).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                    const targetUrl = `/${catSlug}/equipos/${modelSlug}?sku=${encodeURIComponent(p.sku)}`;
                    return `
                        <div class="product-card" onclick="window.location.href='${targetUrl}'" role="link" tabindex="0" aria-label="Ver equipo ${displayName}">
                            <div class="product-image">
                                <img src="${p.main_image || 'images/Enfriador_G3D42_Especial.jpg'}" alt="${displayName} - Imbera México" loading="lazy">
                            </div>
                            <div class="product-info">
                                <h3>${displayName}</h3>
                                <p>Código: <strong>${p.sku}</strong></p>
                            </div>
                        </div>
                    `;
                }).join('');

                // Reattach keyboard listener
                prodSlider.querySelectorAll('.product-card').forEach(card => {
                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            card.click();
                        }
                    });
                });
            }
        } catch(e) {}
    }
    loadLatestProductsIntoSlider();

    // Keyboard accessibility for product cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    /* Stats Counter Animation */
    const statsSection = document.getElementById('stats');
    const counters = document.querySelectorAll('.counter, .counter-target');
    const speed = 200;

    const animateCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                const target = +counter.getAttribute('data-target');
                const count = +counter.innerText.replace(/,/g, '');
                
                const inc = target / speed;

                if (count < target) {
                    counter.innerText = Math.ceil(count + inc).toLocaleString();
                    setTimeout(updateCount, 1);
                } else {
                    counter.innerText = target.toLocaleString();
                }
            };
            updateCount();
        });
    };

    if (statsSection) {
        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    observer.unobserve(entry.target); // Only animate once
                }
            });
        }, observerOptions);

        observer.observe(statsSection);
    }

    /* Modal Helper */
    window.showSuccessModal = (title, message) => {
        let modalBackdrop = document.getElementById('imberaSuccessModal');
        if (!modalBackdrop) {
            modalBackdrop = document.createElement('div');
            modalBackdrop.id = 'imberaSuccessModal';
            modalBackdrop.className = 'modal-backdrop';
            modalBackdrop.innerHTML = `
                <div class="modal-card">
                    <div class="modal-icon-circle">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h3 class="modal-title" id="imberaModalTitle">¡Solicitud Recibida!</h3>
                    <p class="modal-message" id="imberaModalMsg">Tu información ha sido registrada exitosamente. Un ejecutivo especializado de Imbera se pondrá en contacto contigo.</p>
                    <button type="button" class="btn-modal-close" id="btnModalClose">Aceptar</button>
                </div>
            `;
            document.body.appendChild(modalBackdrop);

            modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop || e.target.id === 'btnModalClose') {
                    modalBackdrop.classList.remove('active');
                }
            });
        }

        if (title) document.getElementById('imberaModalTitle').innerText = title;
        if (message) document.getElementById('imberaModalMsg').innerText = message;
        
        setTimeout(() => modalBackdrop.classList.add('active'), 10);
    };

    /* Supabase Form Submission (Leads) */
    /* Supabase Form Submission (Leads) */
    const contactForms = document.querySelectorAll('.main-form, #mainContactForm, #contactoPageForm');
    contactForms.forEach(contactForm => {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalBtnText = submitBtn ? submitBtn.innerText : 'Enviar';
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Enviando...';
            }

            const isContactoPage = window.location.pathname.toLowerCase().includes('contacto');

            const formData = {
                full_name: contactForm.querySelector('[name="nombre"]')?.value?.trim() || '',
                phone: contactForm.querySelector('[name="telefono"]')?.value?.trim() || '',
                email: contactForm.querySelector('[name="email"]')?.value?.trim() || '',
                units_count: parseInt(contactForm.querySelector('[name="cantidad"]')?.value, 10) || null,
                state: contactForm.querySelector('[name="estado"]')?.value || null,
                product_interest: contactForm.querySelector('[name="interes"]')?.value?.trim() || null,
                message: contactForm.querySelector('[name="mensaje"]')?.value?.trim() || null,
                source_page: isContactoPage ? 'contacto' : 'inicio'
            };

            try {
                const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
                if (!sb) {
                    throw new Error('Supabase no está inicializado.');
                }

                const { data, error } = await sb.from('leads').insert([formData]);

                if (error) {
                    throw error;
                }

                window.showSuccessModal(
                    '¡Solicitud Registrada!',
                    'Muchas gracias por tu interés en Imbera. Hemos recibido tus datos y un ejecutivo comercial te contactará a la brevedad.'
                );
                contactForm.reset();
            } catch (err) {
                console.error('Error al enviar formulario a Supabase:', err);
                alert('Hubo un inconveniente al enviar tu información. Por favor intenta de nuevo o comunícate al 427 271 8000.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            }
        });
    });

    // 5. Mobile Navigation Mega Menu & Accordion Support
    const hasMegamenu = document.querySelector('.has-megamenu');
    if (hasMegamenu) {
        const prodLink = hasMegamenu.querySelector(':scope > a');
        if (prodLink) {
            prodLink.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    e.preventDefault();
                    hasMegamenu.classList.toggle('mobile-open');
                }
            });
        }

        // Accordion toggle on mobile
        document.querySelectorAll('.mega-col-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    const col = header.closest('.mega-col');
                    const hasList = col && col.querySelector('.mega-list');
                    if (hasList) {
                        e.preventDefault();
                        col.classList.toggle('open');
                    }
                }
            });
        });

        // Close mega menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hasMegamenu.contains(e.target)) {
                hasMegamenu.classList.remove('mobile-open');
            }
        });
    }
});
