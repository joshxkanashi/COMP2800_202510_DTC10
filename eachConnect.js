import { supabase } from './supabaseAPI.js';

// Global variables to store profiles data and current filter
let allProfiles = [];
let currentFilter = 'all';
let searchTerm = '';

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
		</div>
		<button class="connect-open-btn">View Profile</button>
	`;

	// Add click event listener
	card.addEventListener('click', () => {
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
	
	// Create and append cards
	filteredProfiles.forEach(profile => {
		const card = createProfileCard(profile);
		container.appendChild(card);
	});
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
		
		// Use a cache-busting query parameter to prevent Supabase from returning cached data
		const timestamp = new Date().getTime();
		
		// Fetch user profiles with a timestamp to prevent caching
		// Make sure to specifically select avatar_url field
		const { data: profiles, error } = await supabase
			.from('profiles')
			.select('id, full_name, email, city, avatar_url, created_at')
			.order('created_at', { ascending: false });
			
		if (error) throw error;
		
		console.log('Loaded profiles:', profiles); // For debugging
		
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
				</div>
			`;
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
	// Clear any cached data
	localStorage.removeItem('profileData');
	
	// Fetch fresh data
	getUsers();
	setupEventListeners();
};

// Call initPage when the page loads
document.addEventListener('DOMContentLoaded', initPage);