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
    });
}


const loadDropdownMenu = async () => {
  try {
    const response = await fetch('components/dropdown/dropdown.html');
    const html = await response.text();

    // Find the dropdown placeholder in the navbar
    const placeholder = document.getElementById('dropdown-placeholder');
    if (placeholder) {
      placeholder.innerHTML = html;
      const dropDownBtn = document.getElementById("dropDownMenu");
      const menu = document.getElementById("sidebar")
      var isOpen = false;

      // Toggle menu on button click
      dropDownBtn.addEventListener('click', () => {
        isOpen ? closeMenu() : openMenu();
      });

      // Close menu when clicking outside
      document.addEventListener('click', (event) => {
        if (!dropDownBtn.contains(event.target) && !menu.contains(event.target)) {
          closeMenu();
        }
      });

      console.log('Dropdown menu loaded successfully');
    } else {
      console.error('Dropdown placeholder not found');
    }
  } catch (error) {
    console.error('Error loading dropdown menu:', error);
  }
}

// drop down menu onclick functions
const openMenu = () => {
  document.getElementById('sidebar').classList.add('active');
  document.querySelector('.sidebar-backdrop').classList.add('active');
}

const closeMenu = () => {
  document.getElementById('sidebar').classList.remove('active');
  document.querySelector('.sidebar-backdrop').classList.remove('active');
}

intializeNavbar();
loadDropdownMenu();