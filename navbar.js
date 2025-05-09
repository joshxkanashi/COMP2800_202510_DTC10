// Load navbar.html and highlight the active link
fetch('navbar.html')
  .then(res => res.text())
  .then(html => {
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
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (window.supabase) {
          await supabase.auth.signOut();
        }
        window.location.href = 'login.html';
      });
    }
    // Update avatar after navbar loads (if function exists)
    if (window.updateUserAvatar) {
      window.updateUserAvatar();
    } else if (typeof updateUserAvatar === 'function') {
      updateUserAvatar();
    }
  }); 