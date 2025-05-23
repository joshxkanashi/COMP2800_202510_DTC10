import { supabase } from './supabaseAPI.js';

// Check if user is authenticated - run this immediately on import
const authPromise = checkAuth();

// Check if user is authenticated
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user) {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
            return null;
        } 
        
        // Get user's profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

        updateUserInterface(user, profile);
        return { user, profile };
    } catch (err) {
        console.error("Error checking authentication:", err);
        // Only redirect on actual auth errors, not network errors
        if (err.message?.includes('auth')) {
            window.location.href = 'login.html';
        }
        return null;
    }
}

// Update UI elements with user data
function updateUserInterface(user, profile) {
    // Update UI with user info
    const welcomeProfilePicture = document.getElementById('welcomeProfilePicture');
    const welcomeTitle = document.querySelector('.welcome-title');
    
    if (welcomeProfilePicture) {
        const avatarElement = welcomeProfilePicture.parentElement;
        
        const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
            <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="128" height="128" fill="#818cf8"/>
                <path d="M64 69.5833C75.2842 69.5833 84.4167 60.4508 84.4167 49.1667C84.4167 37.8825 75.2842 28.75 64 28.75C52.7158 28.75 43.5833 37.8825 43.5833 49.1667C43.5833 60.4508 52.7158 69.5833 64 69.5833Z" fill="white"/>
                <path d="M64 79.75C47.6558 79.75 34.3333 93.0725 34.3333 109.417H93.6667C93.6667 93.0725 80.3442 79.75 64 79.75Z" fill="white"/>
            </svg>
        `)}`;
        welcomeProfilePicture.src = profile?.avatar_url || defaultAvatar;
        
        welcomeProfilePicture.onload = () => {
            // Remove loading class when image loads
            avatarElement.classList.remove('loading');
        };
        
        welcomeProfilePicture.onerror = () => {
            welcomeProfilePicture.src = defaultAvatar;
            avatarElement.classList.remove('loading');
        };
    }
    
    if (welcomeTitle) {
        // Use full name if available, otherwise use email
        const displayName = profile?.full_name || user.email.split('@')[0];
        welcomeTitle.textContent = `Welcome, ${displayName}`;
    }

    // Load stats data
    loadStats(user.id);
    
    // Increment view count once per session, but only if viewing someone else's profile
    if (window.location.pathname.includes('eachConnectLanding.html')) {
        // This is on the profile view page
        incrementProfileViewCount(user.id);
    }
}

// Increment profile view count
async function incrementProfileViewCount(userId) {
    // Check if this profile has been viewed in the current session
    const viewedProfiles = JSON.parse(sessionStorage.getItem('viewedProfiles') || '[]');
    
    if (!viewedProfiles.includes(userId)) {
        try {
            // Get current view count
            const { data: profile, error: getError } = await supabase
                .from('profiles')
                .select('view_count')
                .eq('id', userId)
                .single();
                
            if (getError) throw getError;
            
            // Increment view count
            const currentCount = profile?.view_count || 0;
            const newCount = currentCount + 1;
            
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ view_count: newCount })
                .eq('id', userId);
                
            if (updateError) throw updateError;
            
            // Add to viewed profiles for this session
            viewedProfiles.push(userId);
            sessionStorage.setItem('viewedProfiles', JSON.stringify(viewedProfiles));
            
            console.log(`Incremented view count for profile ${userId} to ${newCount}`);
        } catch (error) {
            console.error('Error incrementing view count:', error);
        }
    }
}

// Load and display stats data
async function loadStats(userId) {
    try {
        // Get project count
        const { data: projects, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('user_id', userId);

        // Get or create portfolio
        let { data: portfolioData, error: portfolioError } = await supabase
            .from('portfolios')
            .select('view_count')
            .eq('user_id', userId)
            .single();

        // If portfolio doesn't exist, create one with default values
        if (!portfolioData) {
            const defaultPortfolioData = {
                title: "Enter Your Professional Title",
                about1: "Write a brief introduction about yourself...",
                about2: "Share more about your interests and expertise...",
                skills: [
                    {
                        id: "skill1",
                        name: "Enter Skill",
                        level: "Select Level",
                        progress: "0"
                    }
                ],
                sections: [
                    { id: "about", type: "about", title: "About Me", visible: true },
                    { id: "education", type: "education", title: "Education", visible: true },
                    { id: "skills", type: "skills", title: "Technical Skills", visible: true },
                    { id: "experience", type: "experience", title: "Work Experience", visible: true },
                    { id: "projects", type: "projects", title: "Featured Projects", visible: true }
                ],
                education: [
                    {
                        id: "edu1",
                        date: "Enter Date",
                        degree: "Enter Degree/Certificate",
                        school: "Enter Institution Name",
                        description: "Describe your education..."
                    }
                ],
                experience: [
                    {
                        id: "exp1",
                        date: "Enter Date",
                        title: "Enter Job Title",
                        company: "Enter Company Name",
                        description: "Describe your role and responsibilities..."
                    }
                ],
                skill_cat1: "Enter Skill Category",
                skill_cat2: "Enter Another Category",
                education_summary: "Enter your latest education",
                project_new1_title: "Enter Project Title",
                project_new1_description: "Enter project description...",
                project_new1_link: "Project URL",
                project_new1_github: "GitHub URL"
            };

            const { data: newPortfolio, error: createError } = await supabase
                .from('portfolios')
                .insert([
                    { 
                        user_id: userId,
                        view_count: 0,
                        data: defaultPortfolioData
                    }
                ])
                .select()
                .single();

            if (!createError) {
                portfolioData = newPortfolio;
            }
        }

        // Update project stats
        const projectCount = projects?.length || 0;
        const projectStatValue = document.querySelector('.stat-card:nth-of-type(1) .stat-value');
        const projectStatChange = document.querySelector('.stat-card:nth-of-type(1) .stat-change');
        
        if (projectStatValue) {
            projectStatValue.textContent = projectCount;
            projectStatValue.classList.remove('stat-loading');
        }
        
        if (projectStatChange) {
            projectStatChange.textContent = '';
        }

        // Update portfolio view stats
        const viewCount = portfolioData?.view_count || 0;
        const viewStatValue = document.querySelector('.stat-card:nth-of-type(2) .stat-value');
        const viewStatChange = document.querySelector('.stat-card:nth-of-type(2) .stat-change');
        
        if (viewStatValue) {
            viewStatValue.textContent = viewCount;
            viewStatValue.classList.remove('stat-loading');
        }
        
        if (viewStatChange) {
            viewStatChange.textContent = '';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        
        // Show fallback values in case of error
        const statValues = document.querySelectorAll('.stat-value');
        const statChanges = document.querySelectorAll('.stat-change');
        
        statValues.forEach(value => {
            value.textContent = '0';
            value.classList.remove('stat-loading');
        });
        
        statChanges.forEach(change => {
            change.textContent = 'No data available';
        });
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
    // Add logout button event listener
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Add event listeners
    setupEventListeners();
});

// Debounce function to limit API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Search history management
const searchHistory = {
  get: () => {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
  },
  add: (term) => {
    const history = searchHistory.get();
    // Remove if exists and add to front
    const filtered = history.filter(item => item !== term);
    filtered.unshift(term);
    // Keep only last 10 searches
    const trimmed = filtered.slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(trimmed));
  },
  clear: () => {
    localStorage.removeItem('searchHistory');
  }
};

// Search suggestions
async function getSearchSuggestions(term) {
  if (!term.trim()) return [];
  
  try {
    // Get unique languages from projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('languages');
      
    if (error) throw error;
    
    // Extract and flatten all languages
    const allLanguages = projects
      .flatMap(p => p.languages || [])
      .filter(Boolean);
      
    // Get unique languages
    const uniqueLanguages = [...new Set(allLanguages)];
    
    // Filter languages that match the search term
    return uniqueLanguages
      .filter(lang => lang.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 5); // Limit to 5 suggestions
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

// Create and show search suggestions dropdown
function showSearchSuggestions(term, inputElement) {
  const existingDropdown = document.querySelector('.search-suggestions');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  
  if (!term.trim()) {
    // Show search history if no term
    const history = searchHistory.get();
    if (history.length > 0) {
      const dropdown = document.createElement('div');
      dropdown.className = 'search-suggestions';
      
      const historyTitle = document.createElement('div');
      historyTitle.className = 'search-suggestions-title';
      historyTitle.textContent = 'Recent Searches';
      dropdown.appendChild(historyTitle);
      
      history.forEach(item => {
        const suggestion = document.createElement('div');
        suggestion.className = 'search-suggestion-item';
        suggestion.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
          </svg>
          ${item}
        `;
        suggestion.onclick = () => {
          inputElement.value = item;
          performSearch(item);
          dropdown.remove();
        };
        dropdown.appendChild(suggestion);
      });
      
      const clearButton = document.createElement('button');
      clearButton.className = 'clear-history-button';
      clearButton.textContent = 'Clear History';
      clearButton.onclick = () => {
        searchHistory.clear();
        dropdown.remove();
      };
      dropdown.appendChild(clearButton);
      
      inputElement.parentElement.appendChild(dropdown);
    }
    return;
  }
  
  // Get and show suggestions
  getSearchSuggestions(term).then(suggestions => {
    if (suggestions.length > 0) {
      const dropdown = document.createElement('div');
      dropdown.className = 'search-suggestions';
      
      const suggestionsTitle = document.createElement('div');
      suggestionsTitle.className = 'search-suggestions-title';
      suggestionsTitle.textContent = 'Suggestions';
      dropdown.appendChild(suggestionsTitle);
      
      suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'search-suggestion-item';
        item.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${suggestion}
        `;
        item.onclick = () => {
          inputElement.value = suggestion;
          performSearch(suggestion);
          dropdown.remove();
        };
        dropdown.appendChild(item);
      });
      
      inputElement.parentElement.appendChild(dropdown);
    }
  });
}

// Advanced search filters
function createSearchFilters() {
  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'search-filters';
  filtersDiv.innerHTML = `
    <div class="filter-group">
      <label>Sort By:</label>
      <select id="sortFilter" class="filter-select">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="title">Title A-Z</option>
      </select>
    </div>
  `;
  // Only add sortFilter event listener
  const sortFilter = filtersDiv.querySelector('#sortFilter');
  sortFilter.addEventListener('change', () => {
    const currentSearch = document.querySelector('.search-input').value;
    if (currentSearch) {
      performSearch(currentSearch);
    }
  });
  return filtersDiv;
}

// Add this at the top of the file after imports
let currentSearchTerm = '';

// Modify the setupEventListeners function
function setupEventListeners() {
  // Add event listener for search
  const searchInput = document.querySelector('.search-input');
  const searchButton = document.querySelector('.search-button');
  const searchContainer = document.querySelector('.search-container');
  
  if (searchInput && searchButton && searchContainer) {
    // Add filters after search input
    const filters = createSearchFilters();
    searchContainer.appendChild(filters);
    
    // Function to handle search
    const handleSearch = () => {
      const term = searchInput.value.trim();
      if (term) {
        currentSearchTerm = term;
        searchHistory.add(term);
        performSearch(term);
      }
    };
    
    // Debounced suggestions function
    const debouncedSuggestions = debounce((term) => {
      showSearchSuggestions(term, searchInput);
    }, 200);
    
    // Search button click
    searchButton.addEventListener('click', handleSearch);
    
    // Input field events
    searchInput.addEventListener('input', (event) => {
      const term = event.target.value.trim();
      currentSearchTerm = term;
      debouncedSuggestions(term);
      
      // If search is cleared, show recommended projects
      if (!term) {
        performSearch('');
      }
    });
    
    searchInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        handleSearch();
      }
    });
    
    // Show suggestions on focus if input is empty
    searchInput.addEventListener('focus', () => {
      if (!searchInput.value.trim()) {
        showSearchSuggestions('', searchInput);
      }
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (event) => {
      if (!searchContainer.contains(event.target)) {
        const dropdown = document.querySelector('.search-suggestions');
        if (dropdown) {
          dropdown.remove();
        }
      }
    });

    // Add filter change handlers
    const sortFilter = document.getElementById('sortFilter');
    
    if (sortFilter) {
      sortFilter.addEventListener('change', () => {
        if (currentSearchTerm) {
          performSearch(currentSearchTerm);
        }
      });
    }
  }
  
  // Add event listeners for skill tags
  const skillTags = document.querySelectorAll('.skill-tag');
  skillTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const skillName = tag.textContent.trim();
      searchInput.value = skillName;
      searchHistory.add(skillName);
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

async function performSearch(searchTerm) {
  // Show recommended projects if search term is empty
  if (!searchTerm?.trim()) {
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
      sectionTitle.textContent = 'Recommended Projects';
    }
    await loadRecommendedProjects();
    return;
  }

  // Show loading state
  const searchInput = document.querySelector('.search-input');
  const projectsContainer = document.getElementById('recommendedProjectsContainer');
  if (searchInput) {
    searchInput.classList.add('searching');
  }
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current filter values
    const sortFilter = document.getElementById('sortFilter')?.value || 'newest';

    // Update section title with search term and filters
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
      let titleText = `Search Results for "${searchTerm}"`;
      sectionTitle.textContent = titleText;
    }

    // First, get profiles that match the search term
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${searchTerm}%`);

    const matchingUserIds = matchingProfiles?.map(profile => profile.id) || [];

    // Search for projects
    let query = supabase
      .from('projects')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%${matchingUserIds.length ? `,user_id.in.(${matchingUserIds.join(',')})` : ''}`);

    // Apply sorting
    switch (sortFilter) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'title':
        query = query.order('title', { ascending: true });
        break;
      default: // newest
        query = query.order('created_at', { ascending: false });
    }

    // Execute query
    const { data: projects, error } = await query;

    // Also search for projects with matching languages/technologies
    const { data: techProjects, error: techError } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .contains('languages', [searchTerm]);

    if (error || techError) throw error || techError;

    // Combine and deduplicate results
    const allProjects = [...(projects || []), ...(techProjects || [])];
    const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());

    // Sort the combined results according to the filter
    if (sortFilter === 'title') {
      uniqueProjects.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortFilter === 'oldest') {
      uniqueProjects.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else { // newest
      uniqueProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Update UI with results
    if (projectsContainer) {
      if (uniqueProjects.length === 0) {
        projectsContainer.innerHTML = `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>No projects found matching "${searchTerm}"</p>
          </div>
        `;
      } else {
        projectsContainer.innerHTML = '';
        uniqueProjects.forEach(project => {
          const card = createProjectCard(project);
          projectsContainer.appendChild(card);
        });
      }
    }

  } catch (error) {
    console.error('Search error:', error);
    if (projectsContainer) {
      projectsContainer.innerHTML = `
        <div class="empty-state">
          <p>An error occurred while searching. Please try again.</p>
        </div>
      `;
    }
  } finally {
    // Remove loading state
    if (searchInput) {
      searchInput.classList.remove('searching');
    }
  }
}

// Helper function to create project cards
function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'portfolio-project-card';

  // Project image
  const photoDiv = document.createElement('div');
  photoDiv.className = 'portfolio-project-photo';
  if (project.photo_url) {
    const img = document.createElement('img');
    img.src = project.photo_url;
    img.alt = project.title;
    photoDiv.appendChild(img);
  } else {
    photoDiv.innerHTML = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  card.appendChild(photoDiv);

  // Info
  const infoDiv = document.createElement('div');
  infoDiv.className = 'portfolio-project-info';
  
  const title = document.createElement('h3');
  title.className = 'portfolio-project-title';
  title.textContent = project.title || 'Untitled';
  infoDiv.appendChild(title);

  // Add creator info
  const creatorDiv = document.createElement('div');
  creatorDiv.className = 'project-creator';
  const creatorName = project.profiles?.full_name || 'Unknown User';
  creatorDiv.innerHTML = `<span class="creator-name">by ${creatorName}</span>`;
  creatorDiv.querySelector('.creator-name').onclick = () => {
    localStorage.setItem('selectedProfileId', project.user_id);
    window.location.href = 'eachConnectLanding.html';
  };
  infoDiv.appendChild(creatorDiv);

  // Add language tags
  if (project.languages && project.languages.length > 0) {
    const langs = document.createElement('div');
    langs.className = 'portfolio-project-languages';
    project.languages.forEach(lang => {
      const tag = document.createElement('span');
      tag.className = 'tech-tag';
      tag.textContent = lang;
      langs.appendChild(tag);
    });
    infoDiv.appendChild(langs);
  }

  // Buttons
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'portfolio-project-links';

  const viewProjectBtn = document.createElement('button');
  viewProjectBtn.className = 'portfolio-project-view-btn';
  viewProjectBtn.textContent = 'View Project';
  viewProjectBtn.onclick = () => window.openProjectModal(project);
  buttonsDiv.appendChild(viewProjectBtn);

  const viewPortfolioBtn = document.createElement('button');
  viewPortfolioBtn.className = 'view-portfolio-btn';
  viewPortfolioBtn.textContent = 'View Portfolio';
  viewPortfolioBtn.onclick = () => {
    localStorage.setItem('selectedProfileId', project.user_id);
    window.location.href = 'eachConnectLanding.html';
  };
  buttonsDiv.appendChild(viewPortfolioBtn);

  infoDiv.appendChild(buttonsDiv);
  card.appendChild(infoDiv);

  return card;
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

// Function to open project modal
window.openProjectModal = function(project) {
    const modalBackdrop = document.getElementById('projectModalBackdrop');
    const modalTitle = document.getElementById('projectModalTitle');
    const modalImages = document.getElementById('projectModalImages');
    const modalDescription = document.getElementById('projectModalDescription');
    const modalTech = document.getElementById('projectModalTech');
    const modalLinks = document.getElementById('projectModalLinks');
    const modalDots = document.getElementById('projectModalDots');
    const prevButton = document.getElementById('projectModalPrev');
    const nextButton = document.getElementById('projectModalNext');
    const closeBtn = document.getElementById('projectModalClose');

    // Set title
    modalTitle.textContent = project.title || 'Project Details';

    // Set description
    modalDescription.textContent = project.description || 'No description available.';

    // Handle images
    modalImages.innerHTML = '';
    modalDots.innerHTML = ''; // Clear existing dots
    const photoUrls = project.photo_urls || (project.photo_url ? [project.photo_url] : []);
    let currentImageIndex = 0;

    // Function to navigate to specific image
    function navigateToImage(index) {
        const images = modalImages.querySelectorAll('.project-modal-image');
        const dots = modalDots.querySelectorAll('.project-modal-dot');
        
        images.forEach((img, i) => {
            img.style.display = i === index ? 'block' : 'none';
        });
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        currentImageIndex = index;
    }

    // Keyboard navigation handler
    function handleKeyPress(e) {
        if (e.key === 'ArrowLeft' && prevButton.style.display !== 'none') {
            prevButton.click();
        } else if (e.key === 'ArrowRight' && nextButton.style.display !== 'none') {
            nextButton.click();
        } else if (e.key === 'Escape') {
            closeModal();
        }
    }

    // Close modal function
    const closeModal = () => {
        modalBackdrop.classList.remove('active');
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', handleKeyPress);
    };
    
    if (photoUrls.length > 0) {
        photoUrls.forEach((url, index) => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'project-modal-image';
            imageDiv.style.display = index === 0 ? 'block' : 'none';
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${project.title} - Image ${index + 1}`;
            imageDiv.appendChild(img);
            modalImages.appendChild(imageDiv);
        });

        // Set up navigation if there are multiple images
        if (photoUrls.length > 1) {
            // Show navigation buttons
            prevButton.style.display = 'flex';
            nextButton.style.display = 'flex';
            modalDots.style.display = 'flex';

            // Clear and create dots
            modalDots.innerHTML = '';
            photoUrls.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.className = `project-modal-dot ${index === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => navigateToImage(index));
                modalDots.appendChild(dot);
            });

            // Set up navigation button click handlers
            prevButton.onclick = () => {
                currentImageIndex = (currentImageIndex - 1 + photoUrls.length) % photoUrls.length;
                navigateToImage(currentImageIndex);
            };

            nextButton.onclick = () => {
                currentImageIndex = (currentImageIndex + 1) % photoUrls.length;
                navigateToImage(currentImageIndex);
            };

            // Add keyboard navigation
            document.addEventListener('keydown', handleKeyPress);
        } else {
            // Hide navigation for single image
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
            modalDots.style.display = 'none';
        }
    } else {
        // Show placeholder for no images
        const placeholder = document.createElement('div');
        placeholder.className = 'project-modal-image';
        placeholder.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        modalImages.appendChild(placeholder);
        
        // Hide navigation
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
        modalDots.style.display = 'none';
    }

    // Set tech stack
    modalTech.innerHTML = '';
    if (project.languages && project.languages.length > 0) {
        project.languages.forEach(lang => {
            const tag = document.createElement('span');
            tag.className = 'tech-tag';
            tag.textContent = lang;
            modalTech.appendChild(tag);
        });
    }

    // Set links
    modalLinks.innerHTML = '';
    if (project.project_url) {
        const demoLink = document.createElement('a');
        demoLink.href = project.project_url;
        demoLink.className = 'project-modal-link';
        demoLink.textContent = 'Link';
        demoLink.target = '_blank';
        modalLinks.appendChild(demoLink);
    }
    if (project.github_url) {
        const githubLink = document.createElement('a');
        githubLink.href = project.github_url;
        githubLink.className = 'project-modal-link';
        githubLink.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14.3333 19V17.137C14.3583 16.8275 14.3154 16.5163 14.2073 16.2242C14.0993 15.9321 13.9286 15.6657 13.7067 15.4428C15.8 15.2156 18 14.4431 18 10.8989C17.9998 9.99256 17.6418 9.12101 17 8.46461C17.3039 7.67171 17.2824 6.79528 16.94 6.01739C16.94 6.01739 16.1533 5.7902 14.3333 6.97433C12.8053 6.57853 11.1947 6.57853 9.66666 6.97433C7.84666 5.7902 7.05999 6.01739 7.05999 6.01739C6.71757 6.79528 6.69609 7.67171 6.99999 8.46461C6.35341 9.12588 5.99501 10.0053 5.99999 10.9183C5.99999 14.4366 8.19999 15.2091 10.2933 15.4622C10.074 15.6829 9.90483 15.9461 9.79686 16.2347C9.68889 16.5232 9.64453 16.8306 9.66666 17.137V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            GitHub
        `;
        githubLink.target = '_blank';
        modalLinks.appendChild(githubLink);
    }

    // Set up View Portfolio button
    const viewPortfolioBtn = document.createElement('button');
    viewPortfolioBtn.className = 'view-portfolio-btn';
    viewPortfolioBtn.textContent = 'View Portfolio';
    viewPortfolioBtn.onclick = () => {
        localStorage.setItem('selectedProfileId', project.user_id);
        window.location.href = 'eachConnectLanding.html';
    };
    modalLinks.appendChild(viewPortfolioBtn);

    // Set up close functionality
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    // Click outside modal
    modalBackdrop.onclick = (event) => {
        if (event.target === modalBackdrop) {
            closeModal();
        }
    };

    // Show modal
    modalBackdrop.classList.add('active');
    document.body.classList.add('modal-open');
};

// Update loadRecommendedProjects function
async function loadRecommendedProjects() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First get user's profile and skills
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        // Get or create user's portfolio
        let { data: portfolioData, error: portfolioError } = await supabase
            .from('portfolios')
            .select('data')
            .eq('user_id', user.id)
            .single();

        // If portfolio doesn't exist, create one with default values
        if (!portfolioData) {
            const defaultPortfolioData = {
                title: "Enter Your Professional Title",
                about1: "Write a brief introduction about yourself...",
                about2: "Share more about your interests and expertise...",
                skills: [
                    {
                        id: "skill1",
                        name: "Enter Skill",
                        level: "Select Level",
                        progress: "0"
                    }
                ],
                sections: [
                    { id: "about", type: "about", title: "About Me", visible: true },
                    { id: "education", type: "education", title: "Education", visible: true },
                    { id: "skills", type: "skills", title: "Technical Skills", visible: true },
                    { id: "experience", type: "experience", title: "Work Experience", visible: true },
                    { id: "projects", type: "projects", title: "Featured Projects", visible: true }
                ],
                education: [
                    {
                        id: "edu1",
                        date: "Enter Date",
                        degree: "Enter Degree/Certificate",
                        school: "Enter Institution Name",
                        description: "Describe your education..."
                    }
                ],
                experience: [
                    {
                        id: "exp1",
                        date: "Enter Date",
                        title: "Enter Job Title",
                        company: "Enter Company Name",
                        description: "Describe your role and responsibilities..."
                    }
                ],
                skill_cat1: "Enter Skill Category",
                skill_cat2: "Enter Another Category",
                education_summary: "Enter your latest education",
                project_new1_title: "Enter Project Title",
                project_new1_description: "Enter project description...",
                project_new1_link: "Project URL",
                project_new1_github: "GitHub URL"
            };

            const { data: newPortfolio, error: createError } = await supabase
                .from('portfolios')
                .insert([
                    { 
                        user_id: user.id,
                        view_count: 0,
                        data: defaultPortfolioData
                    }
                ])
                .select()
                .single();

            if (!createError) {
                portfolioData = newPortfolio;
            }
        }

        // Extract user's skills from portfolio data (handle case where portfolio might not exist)
        let userSkills = [];
        if (portfolioData?.data?.skills) {
            userSkills = portfolioData.data.skills.map(skill => skill.name.toLowerCase());
        }

        // Fetch all projects from other users with their creator's profile info
        const { data: allProjects, error: projectsError } = await supabase
            .from('projects')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
            .neq('user_id', user.id);

        if (projectsError) throw projectsError;

        if (!allProjects || allProjects.length === 0) {
            const container = document.getElementById('recommendedProjectsContainer');
            if (container) {
                container.innerHTML = `<div class="empty-state"><p>No recommendations yet. Check back later!</p></div>`;
            }
            return;
        }

        // Score and sort projects based on relevance
        const scoredProjects = allProjects.map(project => {
            let score = 0;

            // 1. Match with user's skills
            if (project.languages) {
                const projectLangs = project.languages.map(lang => lang.toLowerCase());
                const skillMatches = projectLangs.filter(lang => userSkills.includes(lang)).length;
                score += skillMatches * 2; // Give more weight to skill matches
            }

            // 2. Project popularity (view count)
            score += (project.view_count || 0) * 0.1;

            // 3. Recent projects get a small boost
            const projectAge = new Date() - new Date(project.created_at);
            const daysOld = projectAge / (1000 * 60 * 60 * 24);
            score += Math.max(0, 10 - daysOld * 0.1); // Small boost for newer projects

            return { ...project, relevanceScore: score };
        });

        // Sort by score and take top 8
        const recommendedProjects = scoredProjects
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 8);

        // Update UI
        const container = document.getElementById('recommendedProjectsContainer');
        if (!container) return;
        container.innerHTML = '';

        recommendedProjects.forEach(project => {
            const card = createProjectCard(project);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading recommended projects:', error);
    }
}

// Only call on home page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
    document.addEventListener('DOMContentLoaded', loadRecommendedProjects);
} 