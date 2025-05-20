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

// Initialize all components after navbar is loaded
const initializeComponents = () => {
  setTimeout(() => {
    initializeProfileDropdown();
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
      const path = window.location.pathname.split('/').pop() || 'index.html';
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
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

          // Set default avatar
          const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
            <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="128" height="128" fill="#818cf8"/>
                <path d="M64 69.5833C75.2842 69.5833 84.4167 60.4508 84.4167 49.1667C84.4167 37.8825 75.2842 28.75 64 28.75C52.7158 28.75 43.5833 37.8825 43.5833 49.1667C43.5833 60.4508 52.7158 69.5833 64 69.5833Z" fill="white"/>
                <path d="M64 79.75C47.6558 79.75 34.3333 93.0725 34.3333 109.417H93.6667C93.6667 93.0725 80.3442 79.75 64 79.75Z" fill="white"/>
            </svg>
          `)}`;

          // Update user name and email in dropdown
          const userName = document.querySelector('.user-name');
          const userEmail = document.querySelector('.user-email');
          const navProfilePicture = document.getElementById('navProfilePicture');
          const dropdownProfilePicture = document.getElementById('dropdownProfilePicture');

          if (userName) {
            userName.textContent = profile?.full_name || user.email.split('@')[0];
          }
          if (userEmail) {
            userEmail.textContent = user.email;
          }

          // Set profile pictures
          if (navProfilePicture) {
            navProfilePicture.src = profile?.avatar_url || defaultAvatar;
            navProfilePicture.onerror = () => {
              navProfilePicture.src = defaultAvatar;
            };
          }

          if (dropdownProfilePicture) {
            dropdownProfilePicture.src = profile?.avatar_url || defaultAvatar;
            dropdownProfilePicture.onerror = () => {
              dropdownProfilePicture.src = defaultAvatar;
            };
          }

          // Update any other user avatars on the page
          const avatars = document.querySelectorAll('.user-avatar');
          avatars.forEach(avatar => {
            const avatarImg = avatar.querySelector('img.profile-picture');
            if (avatarImg) {
              avatarImg.src = profile?.avatar_url || defaultAvatar;
              avatarImg.onerror = () => {
                avatarImg.src = defaultAvatar;
              };
            } else {
              // Only set text content if there's no image element
              if (profile && profile.full_name) {
                avatar.textContent = profile.full_name.charAt(0).toUpperCase();
              } else {
                avatar.textContent = user.email.charAt(0).toUpperCase();
              }
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