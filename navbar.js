import { supabase } from './supabaseAPI.js';

// Initialize the profile dropdown menu
const initializeProfileDropdown = () => {
  const profileButton = document.getElementById('profileButton');
  const profileDropdown = document.getElementById('profileDropdown');
  
  if (profileButton && profileDropdown) {
    // Toggle dropdown on profile button click
    profileButton.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileButton.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
      }
    });
  }
}

// Set up logout functionality
const setupLogout = () => {
  const logoutBtn = document.getElementById('logoutButton');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Error during logout:', error);
      }
    });
  }
}

// Initialize all components after navbar is loaded
const initializeComponents = () => {
  setTimeout(() => {
    initializeProfileDropdown();
    setupLogout();
  }, 100);
}

// Load navbar.html and initialize everything
const intializeNavbar = async () => {
  try {
    const response = await fetch('navbar.html');
    const html = await response.text();
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    
    if (navbarPlaceholder) {
      navbarPlaceholder.innerHTML = html;
      
      // Highlight active nav link
      const path = window.location.pathname.split('/').pop();
      document.querySelectorAll('.desktop-nav-item').forEach(link => {
        if (link.getAttribute('href') === path) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Load user profile data
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          // Update user name and email in dropdown
          const userName = document.querySelector('.user-name');
          const userEmail = document.querySelector('.user-email');
          const avatars = document.querySelectorAll('.user-avatar');

          if (userName) {
            userName.textContent = profile?.full_name || user.email.split('@')[0];
          }
          if (userEmail) {
            userEmail.textContent = user.email;
          }
          avatars.forEach(avatar => {
            if (profile?.full_name) {
              avatar.textContent = profile.full_name.charAt(0).toUpperCase();
            } else {
              avatar.textContent = user.email.charAt(0).toUpperCase();
            }
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }

      // Initialize components after HTML is loaded
      initializeComponents();
    }
  } catch (error) {
    console.error('Error initializing navbar:', error);
  }
}

// Start the initialization process
document.addEventListener('DOMContentLoaded', () => {
  intializeNavbar();
});