console.log('navbar.js loaded');
// Load navbar.html and highlight the active link
const intializeNavbar = () => {
  fetch('navbar.html')
    .then(res => res.text())
    .then(html => {
      console.log('navbar.html loaded, inserting into DOM');
      document.getElementById('navbar-placeholder').innerHTML = html;
      // Highlight active nav link
      const path = window.location.pathname.split('/').pop();
      document.querySelectorAll('.desktop-nav-item').forEach(link => {
        if (link.getAttribute('href') === path) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      // Attach logout event listener after navbar is loaded
      const logoutBtn = document.getElementById('logoutButton');
      console.log('Attaching logout event to', logoutBtn);
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          console.log('Logout button clicked');
          // Show logout modal
          const logoutModal = document.getElementById('logout-modal');
          if (logoutModal) logoutModal.style.display = 'flex';

          try {
            // Import and use the handleLogout function from app.js
            const { handleLogout } = await import('./app.js');
            await handleLogout();
          } catch (error) {
            console.error('Error during logout:', error);
          } finally {
            // Hide modal after a short delay
            setTimeout(() => {
              if (logoutModal) logoutModal.style.display = 'none';
            }, 300);
          }
        });
      }
      
      // Initialize profile dropdown
      initializeProfileDropdown();
    });
}

// Initialize the profile dropdown menu
const initializeProfileDropdown = () => {
  const profileButton = document.getElementById('profileButton');
  const profileDropdown = document.getElementById('profileDropdown');
  
  if (profileButton && profileDropdown) {
    // Toggle dropdown on profile button click
    profileButton.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
      
      // Add ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-effect');
      profileButton.appendChild(ripple);
      
      const rect = profileButton.getBoundingClientRect();
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
    
    // Prevent redirecting when clicking on profile items container
    profileDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (profileDropdown.classList.contains('show') && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
      }
    });
    
    // Make sure the dropdown links are working properly
    const profileLinks = profileDropdown.querySelectorAll('.profile-dropdown-item');
    profileLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
          e.stopPropagation();
          window.location.href = href;
        }
      });
    });
  }
}

// Start the initialization process
intializeNavbar();