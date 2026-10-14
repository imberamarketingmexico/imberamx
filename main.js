document.addEventListener('DOMContentLoaded', () => {
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

    /* Search Bar Interaction */
    const searchInput = document.querySelector('.search-form input');
    searchInput.addEventListener('focus', () => {
        document.querySelector('.search-form').style.boxShadow = '0 0 0 2px rgba(0, 51, 102, 0.2)';
    });
    searchInput.addEventListener('blur', () => {
        document.querySelector('.search-form').style.boxShadow = 'none';
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
    const contactForm = document.querySelector('.main-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalBtnText = submitBtn ? submitBtn.innerText : 'Enviar';
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Enviando...';
            }

            const formData = {
                full_name: document.getElementById('nombre')?.value?.trim(),
                phone: document.getElementById('telefono')?.value?.trim(),
                email: document.getElementById('email')?.value?.trim(),
                units_count: parseInt(document.getElementById('cantidad')?.value, 10) || null,
                state: document.getElementById('estado')?.value || null,
                product_interest: document.getElementById('interes')?.value?.trim() || null,
                message: document.getElementById('mensaje')?.value?.trim() || null,
                source_page: 'inicio'
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
    }
});
