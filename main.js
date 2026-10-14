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
});
