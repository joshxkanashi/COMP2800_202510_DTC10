// Add smooth scrolling for nav links
document.addEventListener('DOMContentLoaded', function() {
    // Reference elements
    const header = document.querySelector('.header');
    const sections = document.querySelectorAll('section');
    const featureCards = document.querySelectorAll('.feature-card');
    const simpleCards = document.querySelectorAll('.simple-card');
    const testimonials = document.querySelectorAll('.testimonial');
    const ctaButtons = document.querySelectorAll('.hero-cta-button');
    
    // Scroll effects for header
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    function onScroll() {
        lastScrollY = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Header effects
                if (lastScrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                
                // Auto-hide header when scrolling down, show when scrolling up
                if (lastScrollY > 200 && lastScrollY > lastScrollTop) {
                    header.classList.add('header-hidden');
                } else {
                    header.classList.remove('header-hidden');
                }
                
                // Reveal animations for sections when scrolled into view
                revealOnScroll();
                
                ticking = false;
            });
            ticking = true;
        }
    }
    
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        onScroll();
        lastScrollTop = lastScrollY <= 0 ? 0 : lastScrollY;
    });
    
    // Toast notification system
    function showToast(message, type = 'info') {
        // Remove any existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Setup close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto close after 5 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Scroll reveal animation
    function revealOnScroll() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top + scrollY;
            if (scrollY > sectionTop - windowHeight + 100) {
                section.classList.add('animate-visible');
                
                // Animate children with delay
                const animatedElements = section.querySelectorAll('.animate-on-scroll');
                animatedElements.forEach((el, index) => {
                    setTimeout(() => {
                        el.classList.add('animate-visible');
                    }, 100 * index);
                });
            }
        });
        
        // Animate feature cards
        featureCards.forEach(card => {
            const cardTop = card.getBoundingClientRect().top + scrollY;
            if (scrollY > cardTop - windowHeight + 100) {
                card.classList.add('animate-visible');
            }
        });
        
        // Animate simple cards with staggered delay
        simpleCards.forEach((card, index) => {
            const cardTop = card.getBoundingClientRect().top + scrollY;
            if (scrollY > cardTop - windowHeight + 50) {
                setTimeout(() => {
                    card.classList.add('animate-visible');
                }, 100 * index);
            }
        });
        
        // Animate testimonials with staggered delay
        testimonials.forEach((testimonial, index) => {
            const testimonialTop = testimonial.getBoundingClientRect().top + scrollY;
            if (scrollY > testimonialTop - windowHeight + 50) {
                setTimeout(() => {
                    testimonial.classList.add('animate-visible');
                }, 150 * index);
            }
        });
    }
    
    // Initialize animations
    function initAnimations() {
        // Add animation classes
        sections.forEach(section => {
            section.classList.add('animate-on-scroll');
        });
        
        featureCards.forEach(card => {
            card.classList.add('animate-on-scroll');
        });
        
        simpleCards.forEach(card => {
            card.classList.add('animate-on-scroll');
        });
        
        testimonials.forEach(testimonial => {
            testimonial.classList.add('animate-on-scroll');
        });
        
        // Trigger initial animation check
        revealOnScroll();
    }
    
    // Add smooth scrolling to navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add parallax effect to hero section
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (scrollY < 600) {
                const shapes = heroSection.querySelectorAll('.floating-shape');
                shapes.forEach(shape => {
                    const speed = shape.classList.contains('shape1') ? 0.15 : 0.1;
                    shape.style.transform = `translateY(${scrollY * speed}px)`;
                });
            }
        });
    }
    
    // Enhanced CTA button effects
    if (ctaButtons.length > 0) {
        ctaButtons.forEach(button => {
            // Add subtle pulse animation on load
            setTimeout(() => {
                button.classList.add('pulse-once');
                setTimeout(() => {
                    button.classList.remove('pulse-once');
                }, 1000);
            }, 1500);
            
            // Add hover effect
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                const svg = this.querySelector('svg');
                if (svg) {
                    svg.style.transform = 'translateX(3px)';
                }
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                const svg = this.querySelector('svg');
                if (svg) {
                    svg.style.transform = 'translateX(0)';
                }
            });
            
            // Add click effect
            button.addEventListener('mousedown', function() {
                this.style.transform = 'translateY(-2px)';
            });
            
            button.addEventListener('mouseup', function() {
                this.style.transform = 'translateY(-5px)';
            });
        });
    }
    
    // Fix portfolio image for mobile view
    function adjustPortfolioImage() {
        const portfolioImage = document.querySelector('.feature-image img');
        if (portfolioImage) {
            // If error loading the image, use fallback and ensure proper styling
            portfolioImage.onerror = function() {
                this.src = 'https://framerusercontent.com/images/AX9PukosNfGVcfXw8zSUbhYKg.jpg';
                this.style.width = '100%';
                this.style.height = 'auto';
                this.style.maxHeight = window.innerWidth < 768 ? '250px' : '450px';
                this.style.objectFit = 'contain';
            };
            
            // Ensure proper styling for the loaded image
            portfolioImage.onload = function() {
                this.style.width = '100%';
                this.style.height = 'auto';
                this.style.maxHeight = window.innerWidth < 768 ? '250px' : '450px';
                this.style.objectFit = 'contain';
            };
            
            // Trigger onload if image is already loaded
            if (portfolioImage.complete) {
                portfolioImage.onload();
            }
        }
    }
    
    // Run on page load
    adjustPortfolioImage();
    
    // Run on window resize
    window.addEventListener('resize', adjustPortfolioImage);
    
    // Initialize
    initAnimations();
}); 