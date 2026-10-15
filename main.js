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

    /* Carousel Logic with Dynamic Banners & Responsive Picture Support */
    const carouselTrack = document.querySelector('.carousel-track');
    const carouselIndicators = document.querySelector('.carousel-indicators');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    let currentSlide = 0;
    let autoPlayInterval = null;

    function bindCarouselControls() {
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.indicator');
        const totalSlides = slides.length;
        if (totalSlides === 0) return;

        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            indicators.forEach(ind => ind.classList.remove('active'));
            
            if (index >= totalSlides) currentSlide = 0;
            else if (index < 0) currentSlide = totalSlides - 1;
            else currentSlide = index;
            
            if (slides[currentSlide]) slides[currentSlide].classList.add('active');
            if (indicators[currentSlide]) indicators[currentSlide].classList.add('active');
        }

        function nextSlide() {
            showSlide(currentSlide + 1);
        }

        function prevSlide() {
            showSlide(currentSlide - 1);
        }

        function startAutoPlay() {
            clearInterval(autoPlayInterval);
            if (totalSlides > 1) {
                autoPlayInterval = setInterval(nextSlide, 5000);
            }
        }

        function resetAutoPlay() {
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }

        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                nextSlide();
                resetAutoPlay();
            };
        }
        
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                prevSlide();
                resetAutoPlay();
            };
        }

        indicators.forEach((indicator, index) => {
            indicator.onclick = (e) => {
                e.preventDefault();
                showSlide(index);
                resetAutoPlay();
            };
        });

        startAutoPlay();
    }

    // Dynamic Loader for Hero Banners from Supabase or Cache
    async function loadHeroBanners() {
        if (!carouselTrack) return;
        try {
            let banners = [];
            // Check Supabase first
            if (window.imberaSupabase) {
                try {
                    const sb = window.imberaSupabase.client();
                    const { data, error } = await sb.from('banners')
                        .select('*')
                        .eq('is_active', true)
                        .order('display_order', { ascending: true });
                    if (data && !error && data.length > 0) {
                        banners = data;
                    }
                } catch(e) {
                    // Fallback silently
                }
            }

            // Fallback to localStorage if no Supabase response
            if (!banners || banners.length === 0) {
                const cached = localStorage.getItem('imbera_banners');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    banners = parsed.filter(b => b.is_active !== false);
                }
            }

            // If we have custom active banners, inject them dynamically
            if (banners && banners.length > 0) {
                carouselTrack.innerHTML = banners.map((b, idx) => `
                    <div class="carousel-slide ${idx === 0 ? 'active' : ''}">
                        <a href="${b.link_url || 'javascript:void(0)'}" 
                           ${b.link_url && b.target_blank ? 'target="_blank" rel="noopener noreferrer"' : ''} 
                           class="carousel-slide-link ${!b.link_url ? 'no-click' : ''}" 
                           aria-label="${b.title || 'Banner Imbera'}">
                            <picture>
                                ${b.mobile_image ? `<source media="(max-width: 768px)" srcset="${b.mobile_image}">` : ''}
                                <img src="${b.desktop_image}" alt="${b.title || 'Banner Imbera'}" ${idx > 0 ? 'loading="lazy"' : ''}>
                            </picture>
                        </a>
                    </div>
                `).join('');

                if (carouselIndicators) {
                    carouselIndicators.innerHTML = banners.map((_, idx) => `
                        <span class="indicator ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
                    `).join('');
                }
            }
        } catch(err) {
            console.warn('Hero banner dynamic load error:', err);
        } finally {
            bindCarouselControls();
        }
    }

    if (carouselTrack) {
        loadHeroBanners();
    }

    /* Dropdown Hover Optimization (Optional: handled by CSS but JS can add delay for better UX) */
    const productsLink = document.querySelector('.has-dropdown');
    const dropdown = document.querySelector('.dropdown');
    
    let timeout;
    if (productsLink && dropdown) {
        productsLink.addEventListener('mouseenter', () => {
            clearTimeout(timeout);
            dropdown.classList.add('visible');
        });
        
        productsLink.addEventListener('mouseleave', () => {
            timeout = setTimeout(() => {
                dropdown.classList.remove('visible');
            }, 300);
        });
    }

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
            const firstCard = prodSlider.querySelector('.product-card');
            const scrollDistance = firstCard ? (firstCard.offsetWidth + 22) : 280;
            prodSlider.scrollBy({ left: scrollDistance, behavior: 'smooth' });
        });

        prodPrev.addEventListener('click', () => {
            const firstCard = prodSlider.querySelector('.product-card');
            const scrollDistance = firstCard ? (firstCard.offsetWidth + 22) : 280;
            prodSlider.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
        });
    }

    // Dynamic feed of latest uploaded products from Supabase for the carousel (Last 6, randomly shuffled)
    async function loadLatestProductsIntoSlider() {
        if (!prodSlider || !window.imberaSupabase) return;
        try {
            const sb = window.imberaSupabase.client();
            // Fetch the last 6 products entered into database
            const { data, error } = await sb.from('products')
                .select('*, categories(*)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(6);

            if (data && data.length > 0) {
                // Shuffle the last 6 products randomly so they display in random order
                const shuffled = [...data].sort(() => Math.random() - 0.5);

                // Cache products in sessionStorage for 0ms instant loading
                shuffled.forEach(p => {
                    try {
                        if (p.sku) sessionStorage.setItem('imbera_prod_sku_' + p.sku, JSON.stringify(p));
                        if (p.model_code) {
                            const mSlug = p.model_code.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                            sessionStorage.setItem('imbera_prod_slug_' + mSlug, JSON.stringify(p));
                        }
                    } catch(e) {}
                });

                prodSlider.innerHTML = shuffled.map(p => {
                    const displayName = p.model_code || p.commercial_name;
                    const catSlug = p.categories?.slug || 'enfriadores';
                    const modelSlug = (p.model_code || p.sku).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                    const targetUrl = `/${catSlug}/equipos/${modelSlug}?sku=${encodeURIComponent(p.sku)}`;
                    const imgUrl = p.main_image || 'images/Enfriador_G3D42_Especial.jpg';
                    const subtitle = p.subtitle ? `<p class="product-subtitle">${p.subtitle}</p>` : '';
                    return `
                        <div class="product-card" onclick="window.location.href='${targetUrl}'" role="link" tabindex="0" aria-label="Ver equipo ${displayName}">
                            <div class="product-image">
                                <img src="${imgUrl}" alt="${displayName} - Imbera México" loading="lazy">
                            </div>
                            <div class="product-info">
                                <h3>${displayName}</h3>
                                ${subtitle}
                                <p class="product-sku">Código: <strong>${p.sku}</strong></p>
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
        } catch(e) {
            console.error('Error loading latest products into slider:', e);
        }
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

    /* Stats Counter Animation (Smooth requestAnimationFrame & Robust Observers) */
    const statsSection = document.getElementById('stats');
    const counters = document.querySelectorAll('.counter, .counter-target');
    let hasAnimatedStats = false;

    const animateCounters = () => {
        if (hasAnimatedStats) return;
        hasAnimatedStats = true;

        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
            const duration = 1600;
            const startTime = performance.now();

            const updateCount = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(ease * target);

                counter.textContent = current.toLocaleString('es-MX');

                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    counter.textContent = target.toLocaleString('es-MX');
                }
            };

            requestAnimationFrame(updateCount);
        });
    };

    if (statsSection) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animateCounters();
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

            observer.observe(statsSection);
        } else {
            animateCounters();
        }

        // Failsafe: check immediately and after 350ms if already in view
        const checkVisibility = () => {
            const rect = statsSection.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                animateCounters();
            }
        };
        checkVisibility();
        setTimeout(checkVisibility, 350);
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
                alert('Hubo un inconveniente al enviar tu información. Por favor intenta de nuevo o contáctanos a marketing@imberacooling.com');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            }
        });
    });

    // 5. Mobile Fullscreen Navigation Drawer & Accordions
    const mobileHamburgerBtn = document.getElementById('mobileHamburgerBtn');
    const mobileDrawerClose = document.getElementById('mobileDrawerClose');
    const navbar = document.getElementById('navbar');

    function openMobileDrawer() {
        if (!navbar) return;
        navbar.classList.add('mobile-active');
        document.body.classList.add('mobile-menu-active');
    }

    function closeMobileDrawer() {
        if (!navbar) return;
        navbar.classList.remove('mobile-active');
        document.body.classList.remove('mobile-menu-active');
    }

    if (mobileHamburgerBtn) {
        mobileHamburgerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openMobileDrawer();
        });
    }

    if (mobileDrawerClose) {
        mobileDrawerClose.addEventListener('click', (e) => {
            e.preventDefault();
            closeMobileDrawer();
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navbar && navbar.classList.contains('mobile-active')) {
            closeMobileDrawer();
        }
    });

    // Mobile Mega Menu Accordion
    const hasMegamenu = document.querySelector('.has-megamenu');
    const mobileAccordionToggle = document.querySelector('.mobile-accordion-toggle');
    const prodLink = document.getElementById('link-productos');

    if (mobileAccordionToggle && hasMegamenu) {
        mobileAccordionToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hasMegamenu.classList.toggle('mobile-open');
        });
    }

    if (prodLink) {
        prodLink.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                e.preventDefault();
                if (hasMegamenu) hasMegamenu.classList.toggle('mobile-open');
            }
        });
    }

    // Accordion toggle for subcategories on mobile
    document.querySelectorAll('.mega-col-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                const col = header.closest('.mega-col');
                if (col) {
                    e.preventDefault();
                    col.classList.toggle('open');
                }
            }
        });
    });

    // Close mobile drawer when clicking any page link
    document.querySelectorAll('#navbar a:not(#link-productos)').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992 && !link.classList.contains('mega-title')) {
                closeMobileDrawer();
            }
        });
    });

    /* ==========================================================================
       6. ENTERPRISE COOKIE CONSENT & PRIVACY POLICY MANAGER (LFPDPPP & OWASP COMPLIANT)
       ========================================================================== */
    function initCookieConsent() {
        const STORAGE_KEY = 'imbera_cookie_consent';
        const hasConsent = localStorage.getItem(STORAGE_KEY);

        function setSecureCookie(name, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax; Secure`;
        }

        function saveConsent(type) {
            const consentData = {
                status: 'accepted',
                type: type, // 'all' or 'essential'
                analytics: type === 'all',
                functional: type === 'all',
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
            setSecureCookie('imbera_cookie_consent', type, 365);
            setSecureCookie('imbera_session_secure', '1', 30);

            const banner = document.getElementById('imberaCookieBanner');
            if (banner) {
                banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(40px)';
                setTimeout(() => banner.remove(), 350);
            }

            const modal = document.getElementById('cookieSettingsModal');
            if (modal) modal.classList.remove('active');
        }

        // Show banner if not previously configured
        if (!hasConsent) {
            setTimeout(() => {
                if (document.getElementById('imberaCookieBanner')) return;

                const banner = document.createElement('div');
                banner.id = 'imberaCookieBanner';
                banner.className = 'imbera-cookie-banner';
                banner.setAttribute('role', 'dialog');
                banner.setAttribute('aria-label', 'Aviso de Cookies y Privacidad');
                banner.innerHTML = `
                    <div class="cookie-content">
                        <div class="cookie-title"><i class="fa-solid fa-cookie-bite"></i> Privacidad y Uso de Cookies</div>
                        <p class="cookie-text">
                            En Imbera utilizamos cookies esenciales para asegurar el correcto funcionamiento del portal, así como cookies analíticas para mejorar tu experiencia y optimizar nuestro catálogo de refrigeración comercial B2B. Consulta nuestro <a href="#" id="linkOpenPrivacyNotice">Aviso de Privacidad</a>.
                        </p>
                    </div>
                    <div class="cookie-actions">
                        <button type="button" class="btn-cookie-accept" id="btnAcceptAllCookies">Aceptar Todas</button>
                        <button type="button" class="btn-cookie-essential" id="btnEssentialOnlyCookies">Solo Necesarias</button>
                        <button type="button" class="btn-cookie-settings" id="btnOpenCookieSettings">Configurar</button>
                    </div>
                `;
                document.body.appendChild(banner);

                document.getElementById('btnAcceptAllCookies')?.addEventListener('click', () => saveConsent('all'));
                document.getElementById('btnEssentialOnlyCookies')?.addEventListener('click', () => saveConsent('essential'));
                document.getElementById('btnOpenCookieSettings')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openCookieSettings();
                });
                document.getElementById('linkOpenPrivacyNotice')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openPrivacyModal();
                });
            }, 750);
        }

        window.openCookieSettings = () => {
            let modal = document.getElementById('cookieSettingsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'cookieSettingsModal';
                modal.className = 'cookie-modal-backdrop';
                modal.innerHTML = `
                    <div class="cookie-modal-card">
                        <div class="cookie-modal-header">
                            <h3><i class="fa-solid fa-sliders text-green"></i> Preferencias de Cookies</h3>
                            <button type="button" class="btn-cookie-modal-close" id="btnCloseCookieSettings" aria-label="Cerrar">&times;</button>
                        </div>
                        <div class="cookie-modal-body">
                            <p style="font-size: 13px; color: #64748b; margin-bottom: 18px;">
                                Puedes elegir qué tipo de cookies autorizas en este dispositivo. Las cookies técnicas son indispensables para el funcionamiento y seguridad de la plataforma.
                            </p>

                            <div class="cookie-pref-group">
                                <div class="cookie-pref-header">
                                    <span class="cookie-pref-title">1. Cookies Técnicas y de Seguridad</span>
                                    <span class="cookie-badge-required">Siempre Activas</span>
                                </div>
                                <p class="cookie-pref-desc">Permiten la navegación segura con cifrado TLS, autenticación de sesión de administradores, cotización de equipos y prevención de vulnerabilidades XSS/CSRF.</p>
                            </div>

                            <div class="cookie-pref-group">
                                <div class="cookie-pref-header">
                                    <span class="cookie-pref-title">2. Cookies de Análisis y Rendimiento</span>
                                    <label class="switch-toggle" style="margin: 0;">
                                        <input type="checkbox" id="prefAnalyticsCookies" checked>
                                        <span class="slider-toggle"></span>
                                    </label>
                                </div>
                                <p class="cookie-pref-desc">Nos ayudan a recopilar información anónima sobre las visitas a fichas técnicas y modelos para mejorar el catálogo.</p>
                            </div>

                            <div class="cookie-pref-group">
                                <div class="cookie-pref-header">
                                    <span class="cookie-pref-title">3. Cookies de Personalización</span>
                                    <label class="switch-toggle" style="margin: 0;">
                                        <input type="checkbox" id="prefFunctionalCookies" checked>
                                        <span class="slider-toggle"></span>
                                    </label>
                                </div>
                                <p class="cookie-pref-desc">Guardan tu selección de país/región y filtros de categorías para una navegación fluida.</p>
                            </div>

                            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; flex-wrap: wrap;">
                                <button type="button" class="btn-cookie-essential" id="btnSaveCustomCookies" style="color: #002D62; border-color: #cbd5e1; background: #f1f5f9;">Guardar Preferencias</button>
                                <button type="button" class="btn-cookie-accept" id="btnAcceptAllFromModal">Aceptar Todas</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                document.getElementById('btnCloseCookieSettings').onclick = () => modal.classList.remove('active');
                modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
                document.getElementById('btnAcceptAllFromModal').onclick = () => saveConsent('all');
                document.getElementById('btnSaveCustomCookies').onclick = () => {
                    const analyticsOn = document.getElementById('prefAnalyticsCookies').checked;
                    saveConsent(analyticsOn ? 'all' : 'essential');
                };
            }
            setTimeout(() => modal.classList.add('active'), 10);
        };

        window.openPrivacyModal = () => {
            let pModal = document.getElementById('imberaPrivacyModal');
            if (!pModal) {
                pModal = document.createElement('div');
                pModal.id = 'imberaPrivacyModal';
                pModal.className = 'cookie-modal-backdrop';
                pModal.innerHTML = `
                    <div class="cookie-modal-card" style="max-width: 780px;">
                        <div class="cookie-modal-header">
                            <h3><i class="fa-solid fa-shield-halved text-primary"></i> Aviso de Privacidad Integral</h3>
                            <button type="button" class="btn-cookie-modal-close" id="btnClosePrivacyModal" aria-label="Cerrar">&times;</button>
                        </div>
                        <div class="cookie-modal-body" style="font-size: 13.5px; color: #475569; line-height: 1.65; max-height: 65vh; overflow-y: auto; padding-right: 10px;">
                            <p><strong>IMBERA S.A. DE C.V.</strong>, con domicilio en México, en estricto cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y los más rigurosos estándares de seguridad informática corporativa, es responsable del tratamiento legítimo, controlado y transparente de sus datos personales.</p>
                            
                            <h4 style="color: #002D62; margin: 18px 0 6px; font-size: 14.5px;">1. Finalidades del Tratamiento de Datos</h4>
                            <p>Los datos recabados mediante formularios de cotización, contacto y canales oficiales (nombre completo, correo corporativo, teléfono, estado y volumen de unidades) se emplearán con las siguientes finalidades primarias:</p>
                            <ul style="padding-left: 20px; margin-bottom: 12px;">
                                <li>Atención y cotización especializada de equipos de refrigeración comercial B2B.</li>
                                <li>Envío de fichas técnicas, manuales de usuario y asesoría de ingeniería de frío.</li>
                                <li>Canalización con la red de distribuidores autorizados en la República Mexicana.</li>
                            </ul>

                            <h4 style="color: #002D62; margin: 18px 0 6px; font-size: 14.5px;">2. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)</h4>
                            <p>Usted o su representante legal debidamente acreditado podrán ejercer en todo momento sus derechos ARCO enviando una solicitud formal a nuestro departamento de cumplimiento en: <strong>contacto@imberacooling.com</strong>.</p>

                            <h4 style="color: #002D62; margin: 18px 0 6px; font-size: 14.5px;">3. Seguridad de la Información, Cifrado y Cookies</h4>
                            <p>Imbera cuenta con medidas de seguridad electrónicas de grado empresarial: transporte cifrado obligatorio HTTPS con TLS 1.3, encabezados HSTS, políticas de restricción de orígenes (CSP), cookies con atributos <code>Secure</code> y <code>SameSite=Lax</code>, protegiendo en todo momento la confidencialidad de las comunicaciones y previniendo accesos no autorizados.</p>
                        </div>
                        <div style="text-align: right; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                            <button type="button" class="btn-cookie-accept" id="btnAcceptPrivacyModal" style="padding: 9px 24px;">Entendido</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(pModal);

                document.getElementById('btnClosePrivacyModal').onclick = () => pModal.classList.remove('active');
                document.getElementById('btnAcceptPrivacyModal').onclick = () => pModal.classList.remove('active');
                pModal.onclick = (e) => { if (e.target === pModal) pModal.classList.remove('active'); };
            }
            setTimeout(() => pModal.classList.add('active'), 10);
        };

        // Attach to all footer links referencing "Avisos de privacidad" or "Cookies"
        document.querySelectorAll('a').forEach(a => {
            const text = a.textContent.toLowerCase().trim();
            if (text.includes('aviso de privacidad') || text.includes('avisos de privacidad')) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openPrivacyModal();
                });
            }
            if (text.includes('cookies') || text.includes('preferencias de cookies')) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openCookieSettings();
                });
            }
        });
    }

    initCookieConsent();
});
