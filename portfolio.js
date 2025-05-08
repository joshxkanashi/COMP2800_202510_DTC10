// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Portfolio navigation smooth scrolling
  const portfolioNavLinks = document.querySelectorAll('.portfolio-nav-item');
  
  portfolioNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all links
      portfolioNavLinks.forEach(item => item.classList.remove('active'));
      
      // Add active class to clicked link
      this.classList.add('active');
      
      // Get the target section id from the href attribute
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      // Smooth scroll to target section
      if (targetSection) {
        scrollToElement(targetSection);
      }
    });
  });
  
  // Handle skill tag clicks
  const skillTags = document.querySelectorAll('.skill-tag');
  
  skillTags.forEach(tag => {
    tag.addEventListener('click', function() {
      // Toggle active class
      this.classList.toggle('active');
    });
  });
  
  // Connect button smooth scrolling
  const connectButtons = document.querySelectorAll('.connect-button, .floating-connect-btn, a[href="#contact"]');
  
  connectButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        scrollToElement(contactSection);
      }
    });
  });
  
  // Handle form submission with improved validation
  const contactForm = document.querySelector('.contact-form');
  
  if (contactForm) {
    // Create feedback elements for form validation
    const createFeedbackElement = (inputId) => {
      const input = document.getElementById(inputId);
      const feedbackEl = document.createElement('div');
      feedbackEl.className = 'form-feedback';
      feedbackEl.setAttribute('aria-live', 'polite');
      input.parentNode.appendChild(feedbackEl);
      return feedbackEl;
    };
    
    // Create feedback elements for each required field
    const nameFeedback = createFeedbackElement('name');
    const emailFeedback = createFeedbackElement('email');
    const messageFeedback = createFeedbackElement('message');
    
    // Add input validation as user types
    const validateInput = (input, feedbackEl, validationFn) => {
      input.addEventListener('blur', function() {
        const isValid = validationFn(input.value);
        if (!isValid && input.value.trim() !== '') {
          feedbackEl.textContent = `Please enter a valid ${input.placeholder.toLowerCase()}`;
          feedbackEl.className = 'form-feedback error';
          input.setAttribute('aria-invalid', 'true');
        } else {
          feedbackEl.textContent = '';
          feedbackEl.className = 'form-feedback';
          input.removeAttribute('aria-invalid');
        }
      });
      
      // Clear error on input
      input.addEventListener('input', function() {
        feedbackEl.textContent = '';
        feedbackEl.className = 'form-feedback';
        input.removeAttribute('aria-invalid');
      });
    };
    
    // Validation functions
    const validateName = (name) => name.trim().length >= 2;
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateMessage = (message) => message.trim().length >= 10;
    
    // Set up validation for each field
    validateInput(document.getElementById('name'), nameFeedback, validateName);
    validateInput(document.getElementById('email'), emailFeedback, validateEmail);
    validateInput(document.getElementById('message'), messageFeedback, validateMessage);
    
    // Handle form submission
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
      // Validate all fields
      let isValid = true;
      
      if (!validateName(name)) {
        nameFeedback.textContent = 'Please enter your name (min 2 characters)';
        nameFeedback.className = 'form-feedback error';
        document.getElementById('name').setAttribute('aria-invalid', 'true');
        isValid = false;
      }
      
      if (!validateEmail(email)) {
        emailFeedback.textContent = 'Please enter a valid email address';
        emailFeedback.className = 'form-feedback error';
        document.getElementById('email').setAttribute('aria-invalid', 'true');
        isValid = false;
      }
      
      if (!validateMessage(message)) {
        messageFeedback.textContent = 'Please enter a message (min 10 characters)';
        messageFeedback.className = 'form-feedback error';
        document.getElementById('message').setAttribute('aria-invalid', 'true');
        isValid = false;
      }
      
      if (isValid) {
        // Create success notification
        const successNotification = document.createElement('div');
        successNotification.className = 'form-notification success';
        successNotification.setAttribute('role', 'alert');
        successNotification.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Message sent successfully!</span>
        `;
        contactForm.appendChild(successNotification);
        
        // Reset form
        contactForm.reset();
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          successNotification.classList.add('fade-out');
          setTimeout(() => {
            contactForm.removeChild(successNotification);
          }, 500);
        }, 5000);
        
        // In a real app, this would send data to the server
        console.log({
          name,
          email,
          subject,
          message
        });
      } else {
        // Scroll to the first error
        const firstError = document.querySelector('.form-feedback.error');
        if (firstError) {
          const inputWithError = firstError.previousElementSibling;
          inputWithError.focus();
          window.scrollTo({
            top: firstError.offsetTop - 100,
            behavior: 'smooth'
          });
        }
      }
    });
  }
  
  // Animate skill bars on scroll
  const animateSkillBars = () => {
    const skillBars = document.querySelectorAll('.skill-progress-bar');
    
    skillBars.forEach(bar => {
      const parent = bar.parentElement;
      const progress = parent.getAttribute('data-progress');
      
      if (isElementInViewport(parent)) {
        bar.style.width = progress + '%';
        bar.style.opacity = '1';
      }
    });
  };
  
  // Check if element is in viewport
  const isElementInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };
  
  // Helper function for smooth scrolling
  function scrollToElement(element) {
    window.scrollTo({
      top: element.offsetTop - 100,
      behavior: 'smooth'
    });
  }
  
  // Run animation check on scroll
  window.addEventListener('scroll', animateSkillBars);
  
  // Run once on page load
  animateSkillBars();
  
  // Handle mobile navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      if (item.getAttribute('aria-label').toLowerCase() === 'connect') {
        e.preventDefault();
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          scrollToElement(contactSection);
        }
      }
      
      // Visual feedback
      navItems.forEach(navItem => navItem.classList.remove('active'));
      item.classList.add('active');
    });
  });
  
  // Enable intersection observer for scroll animations
  if ('IntersectionObserver' in window) {
    // Create observers for elements that should animate on scroll
    const fadeInElements = document.querySelectorAll('.portfolio-section');
    
    const fadeInObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-visible');
          fadeInObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    fadeInElements.forEach(element => {
      element.classList.add('fade-in');
      fadeInObserver.observe(element);
    });
  }
}); 