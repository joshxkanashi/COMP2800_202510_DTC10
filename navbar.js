console.log('navbar.js loaded');
// Load navbar.html and highlight the active link
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
  }); 