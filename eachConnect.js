import { supabase } from './supabaseAPI.js';

// Global variables to store profiles data and current filter
let allProfiles = [];
let currentFilter = 'all';
let searchTerm = '';

// Will be loaded from connectChat.js
let openChatFunction = null;

// Create a single card element
const createProfileCard = (profile) => {
	const card = document.createElement('div');
	card.className = 'connect-card';

	// Get first letter of name for avatar fallback
	const firstLetter = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';
	
	// Create a random array of skills for demo purposes
	const skillsList = ['JavaScript', 'React', 'Node.js', 'Python', 'UI/UX', 'CSS', 'HTML', 'MongoDB', 'PostgreSQL', 'TypeScript'];
	const randomSkills = [];
	const numSkills = Math.floor(Math.random() * 3) + 1; // 1-3 skills
	for (let i = 0; i < numSkills; i++) {
		const randomIndex = Math.floor(Math.random() * skillsList.length);
		randomSkills.push(skillsList[randomIndex]);
	}
	
	// Create avatar element with profile picture or fallback to first letter
	let avatarContent = '';
	let avatarClass = 'connect-avatar';
	
	if (profile.avatar_url) {
		avatarClass += ' loading'; // Add loading class until image loads
		avatarContent = `<img src="${profile.avatar_url}" alt="${profile.full_name || 'User'}" 
			onload="this.parentNode.classList.remove('loading')" 
			onerror="this.style.display='none'; this.parentNode.textContent='${firstLetter}'; this.parentNode.classList.remove('loading');">`;
	} else {
		avatarContent = firstLetter;
	}
	
	// Create card content
	card.innerHTML = `
		<div class="${avatarClass}">${avatarContent}</div>
		<div class="connect-info">
			<h3 class="connect-name">${profile.full_name || 'Anonymous User'}</h3>
			<p class="connect-role">${profile.email || ''}</p>
			${profile.city ? `
			<p class="user-location">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M12 12C13.1046 12 14 11.1046 14 10C14 8.89543 13.1046 8 12 8C10.8954 8 10 8.89543 10 10C10 11.1046 10.8954 12 12 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				${profile.city}
			</p>` : ''}
			<div class="connect-tags">
				${randomSkills.map(skill => `<span class="connect-tag">${skill}</span>`).join('')}
			</div>
			<div class="connect-actions">
                <button class="connect-message-btn" 
                    data-user-id="${profile.id}" 
                    data-name="${profile.full_name || 'User'}" 
                    data-avatar="${profile.avatar_url || ''}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 19C17.771 19 19.657 19 20.828 17.828C22 16.657 22 14.771 22 11C22 7.229 22 5.343 20.828 4.172C19.657 3 17.771 3 14 3H10C6.229 3 4.343 3 3.172 4.172C2 5.343 2 7.229 2 11C2 14.771 2 16.657 3.172 17.828C3.825 18.482 4.7 18.771 6 18.899" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 19C12.764 19 11.402 19.5 10.159 20.145C8.161 21.182 7.162 21.701 6.67 21.37C6.178 21.04 6.271 20.015 6.458 17.966L6.5 17.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Message
                </button>
                <button class="connect-open-btn">View Profile</button>
            </div>
		</div>
	`;

	// Add click event listener - but only for the main card excluding the message button
    const viewProfileBtn = card.querySelector('.connect-open-btn');
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', () => {
            // Clear any cached data to ensure fresh load
            localStorage.removeItem('profileData');
            localStorage.removeItem('cachedPortfolioData');
            localStorage.removeItem('cachedProfileData');
            
            // Store the profile ID in localStorage for the next page
            localStorage.setItem('selectedProfileId', profile.id);
            
            // Also store the timestamp to force a fresh load 
            localStorage.setItem('profileLoadTimestamp', Date.now());
            
            // Log the action for debugging
            console.log('Selected profile:', profile.id, 'Navigating to profile page...');
            
            // Navigate to the profile page with cache-busting parameter
            window.location.href = 'eachConnectLanding.html?nocache=' + Date.now();
        });
    }
    
    // Add click handler for message button
    const messageBtn = card.querySelector('.connect-message-btn');
    if (messageBtn) {
        messageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent triggering card click
            
            const userId = messageBtn.dataset.userId;
            const name = messageBtn.dataset.name;
            const avatar = messageBtn.dataset.avatar;
            
            console.log('Message button clicked for:', userId, name);
            
            if (userId) {
                try {
                    // Try multiple ways to get the openChat function
                    if (typeof window.openChat === 'function') {
                        console.log('Using window.openChat function');
                        window.openChat(userId, name, avatar);
                    } else if (openChatFunction) {
                        console.log('Using cached openChatFunction');
                        openChatFunction(userId, name, avatar);
                    } else {
                        // Direct import as a last resort
                        console.log('Attempting direct import of openChat');
                        import('./connectChat.js')
                            .then(module => {
                                if (module && module.openChat) {
                                    module.openChat(userId, name, avatar);
                                } else {
                                    throw new Error('openChat function not found in module');
                                }
                            })
                            .catch(err => {
                                console.error('Failed to import chat module:', err);
                                alert('Chat functionality is not available. Please refresh the page and try again.');
                            });
                    }
                } catch (err) {
                    console.error('Error opening chat:', err);
                    alert('Error opening chat. Please refresh the page and try again.');
                }
            }
        });
    }

	return card;
};

// Filter profiles based on current filter and search term
const filterProfiles = () => {
	if (!allProfiles.length) return [];
	
	return allProfiles.filter(profile => {
		// Apply category filter
		if (currentFilter !== 'all') {
			// This is a mock filter - in a real app, you would filter based on user skills/category
			// For demo purposes, we just filter randomly
			const random = Math.random();
			if (currentFilter === 'frontend' && random < 0.7) return false;
			if (currentFilter === 'backend' && random < 0.7) return false;
			if (currentFilter === 'fullstack' && random < 0.7) return false;
			if (currentFilter === 'mobile' && random < 0.7) return false;
		}
		
		// Apply search filter
		if (searchTerm) {
			const name = (profile.full_name || '').toLowerCase();
			const email = (profile.email || '').toLowerCase();
			const location = (profile.city || '').toLowerCase();
			
			return name.includes(searchTerm) || 
				   email.includes(searchTerm) || 
				   location.includes(searchTerm);
		}
		
		return true;
	});
};

// Render profiles to the container
const renderProfiles = () => {
	const container = document.getElementById('cardsContainer');
	if (!container) return;
	
	// Clear existing content
	container.innerHTML = '';
	
	// Get filtered profiles
	const filteredProfiles = filterProfiles();
	
	// If no profiles found, show message
	if (filteredProfiles.length === 0) {
		const noResults = document.createElement('div');
		noResults.className = 'no-results';
		noResults.innerHTML = `
			<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 16px; opacity: 0.5;">
				<path d="M15 15L21 21M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<h3 style="margin-bottom: 8px; color: var(--gray-700);">No developers found</h3>
			<p>Try adjusting your filters or search term</p>
		`;
		container.appendChild(noResults);
		return;
	}
	
	console.log(`Rendering ${filteredProfiles.length} profile cards`);
	
	// Create and append cards
	filteredProfiles.forEach(profile => {
		const card = createProfileCard(profile);
		container.appendChild(card);
	});
	
	console.log('Profile cards rendered successfully');
};

// Fetch profiles from Supabase
const getUsers = async () => {
	try {
		// Show loading state
		const container = document.getElementById('cardsContainer');
		if (container) {
			container.innerHTML = `
				<div class="loading-container" style="grid-column: 1/-1; text-align: center; padding: 40px;">
					<div class="loading"></div>
					<p style="margin-top: 16px; color: var(--gray-500);">Loading developers...</p>
				</div>
			`;
		}
		
		console.log('Fetching profiles from Supabase...');
		
		// Fetch user profiles with a timestamp to prevent caching
		const { data: profiles, error } = await supabase
			.from('profiles')
			.select('id, full_name, email, city, avatar_url, created_at')
			.order('created_at', { ascending: false });
			
		if (error) {
			console.error('Error fetching profiles:', error);
			throw error;
		}
		
		console.log(`Loaded ${profiles?.length || 0} profiles from Supabase`);
		
		// Store profiles globally for filtering
		allProfiles = profiles || [];
		
		// Render profiles
		renderProfiles();
		
	} catch (error) {
		console.error('Error fetching users:', error);
		// Show error message
		const container = document.getElementById('cardsContainer');
		if (container) {
			container.innerHTML = `
				<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
					<p>Error loading developers. Please try again later.</p>
					<p style="margin-top: 12px; font-size: 14px; color: #666;">${error.message || 'Unknown error'}</p>
					<button id="retryButton" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
				</div>
			`;
			
			// Add retry button listener
			const retryButton = document.getElementById('retryButton');
			if (retryButton) {
				retryButton.addEventListener('click', getUsers);
			}
		}
	}
};

// Set up event listeners for search and filters
const setupEventListeners = () => {
	// Filter buttons
	const filterButtons = document.querySelectorAll('.connect-filter');
	filterButtons.forEach(button => {
		button.addEventListener('click', () => {
			// Update active state
			filterButtons.forEach(btn => btn.classList.remove('active'));
			button.classList.add('active');
			
			// Update filter and re-render
			currentFilter = button.getAttribute('data-filter');
			renderProfiles();
		});
	});
	
	// Search input
	const searchInput = document.getElementById('connectSearchInput');
	const searchButton = document.getElementById('connectSearchButton');
	
	if (searchInput) {
		searchInput.addEventListener('keyup', (e) => {
			if (e.key === 'Enter') {
				searchTerm = searchInput.value.trim().toLowerCase();
				renderProfiles();
			}
		});
	}
	
	if (searchButton) {
		searchButton.addEventListener('click', () => {
			searchTerm = searchInput.value.trim().toLowerCase();
			renderProfiles();
		});
	}
};

// Initialize the page
const initPage = () => {
	console.log('Initializing Connect page...');
	
	// Clear any cached data
	localStorage.removeItem('profileData');
	
	// Try to get the openChat function
	if (typeof window.openChat === 'function') {
		console.log('openChat function already available globally');
		openChatFunction = window.openChat;
	} else {
		console.log('openChat function not yet available, will try to import');
		// Try to import the openChat function
		import('./connectChat.js')
			.then(module => {
				if (module && module.openChat) {
					console.log('Successfully imported openChat from connectChat.js');
					// Make it available both locally and globally
					openChatFunction = module.openChat;
					window.openChat = module.openChat;
				} else {
					console.warn('openChat function not found in connectChat.js');
				}
			})
			.catch(error => {
				console.error('Error importing connectChat.js:', error);
			});
	}
	
	// Fetch fresh data
	getUsers();
	setupEventListeners();
};

// Call initPage when the page loads
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initPage);
} else {
	initPage();
}