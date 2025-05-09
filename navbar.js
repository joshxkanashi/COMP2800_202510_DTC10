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
    // Update avatar after navbar loads (if function exists)
    if (window.updateUserAvatar) {
      window.updateUserAvatar();
    } else if (typeof updateUserAvatar === 'function') {
      updateUserAvatar();
    }
  }); 