document.addEventListener('DOMContentLoaded', () => {
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
  
  // Add event listeners for bottom nav
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(navItem => navItem.classList.remove('active'));
      item.classList.add('active');
      
      // Handle navigation - would be implemented in a real app
      const navAction = item.getAttribute('aria-label').toLowerCase();
      console.log(`Navigating to: ${navAction}`);
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