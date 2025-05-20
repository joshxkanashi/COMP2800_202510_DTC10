import { supabase } from './supabaseAPI.js';

// Check if user is authenticated
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!user) {
        // Redirect to login page if not authenticated
        window.location.href = 'login.html';
    } else {
        // Get user's profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

        // Update UI with user info
        const welcomeProfilePicture = document.getElementById('welcomeProfilePicture');
        const welcomeTitle = document.querySelector('.welcome-title');
        
        if (welcomeProfilePicture) {
            const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
                <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="128" height="128" fill="#818cf8"/>
                    <path d="M64 69.5833C75.2842 69.5833 84.4167 60.4508 84.4167 49.1667C84.4167 37.8825 75.2842 28.75 64 28.75C52.7158 28.75 43.5833 37.8825 43.5833 49.1667C43.5833 60.4508 52.7158 69.5833 64 69.5833Z" fill="white"/>
                    <path d="M64 79.75C47.6558 79.75 34.3333 93.0725 34.3333 109.417H93.6667C93.6667 93.0725 80.3442 79.75 64 79.75Z" fill="white"/>
                </svg>
            `)}`;
            welcomeProfilePicture.src = profile?.avatar_url || defaultAvatar;
            welcomeProfilePicture.onerror = () => {
                welcomeProfilePicture.src = defaultAvatar;
            };
        }
        
        if (welcomeTitle) {
            // Use full name if available, otherwise use email
            const displayName = profile?.full_name || user.email.split('@')[0];
            welcomeTitle.textContent = `Welcome, ${displayName}`;
        }
    }
}

// Handle logout
export async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('Error logging out:', error.message);
    } else {
        // Redirect to login page after successful logout
        window.location.href = 'login.html';
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuth();
    
    // Add logout button event listener
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Add event listeners
    setupEventListeners();
});

function setupEventListeners() {
  // Add event listener for search
  const searchInput = document.querySelector('.search-input');
  const searchButton = document.querySelector('.search-button');
  
  if (searchInput && searchButton) {
    searchButton.addEventListener('click', () => {
      performSearch(searchInput.value);
    });
    
    searchInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        performSearch(searchInput.value);
      }
    });
  }
  
  // Add event listeners for skill tags
  const skillTags = document.querySelectorAll('.skill-tag');
  skillTags.forEach(tag => {
    tag.addEventListener('click', () => {
      // Get the skill name from the tag (excluding the icon)
      const skillName = tag.textContent.trim();
      performSearch(skillName);
      
      // Visual feedback
      skillTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
    });
  });

  // Project card interactions
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('click', () => {
      // In a real app, this would navigate to the project details
      const projectTitle = card.querySelector('.project-title').textContent;
      console.log(`Viewing project: ${projectTitle}`);
    });
  });
  
  // Connect button smooth scrolling
  const connectButtons = document.querySelectorAll('.connect-button, .floating-connect-btn, a[href="#contact"]');
  connectButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        scrollToElement(contactSection);
      }
    });
  });
}

// Helper function for smooth scrolling
function scrollToElement(element) {
  window.scrollTo({
    top: element.offsetTop - 100,
    behavior: 'smooth'
  });
}

function performSearch(searchTerm) {
  console.log(`Searching for: ${searchTerm}`);
  // In a real app, this would trigger an API call or filtering
  
  // Provide visual feedback
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.value = searchTerm;
    searchInput.classList.add('searching');
    
    // Simulate search delay
    setTimeout(() => {
      searchInput.classList.remove('searching');
      // Here you would update the UI with search results
    }, 800);
  }
}

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
        window.scrollTo({
          top: targetSection.offsetTop - 100,
          behavior: 'smooth'
        });
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
  
  // Handle form submission
  const contactForm = document.querySelector('.contact-form');
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
      // Simple validation
      if (name && email && message) {
        // In a real application, you would send this data to a server
        // For demo purposes, we'll just log it and show a success message
        console.log({
          name,
          email,
          subject,
          message
        });
        
        // Show success message (in a real app, this would be more sophisticated)
        alert('Message sent successfully! We will get back to you soon.');
        
        // Reset form
        contactForm.reset();
      } else {
        alert('Please fill in all required fields.');
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
  
  // Run animation check on scroll
  window.addEventListener('scroll', animateSkillBars);
  
  // Run once on page load
  animateSkillBars();
}); 