import { supabase } from './supabaseAPI.js';

const button = document.querySelectorAll("#openCard")

button.forEach((card) => {
	card.addEventListener("click", () => {
		window.location.href = 'eachConnectLanding.html';
	})
})

const getUsers = async () => {
	try {
		const { data: profiles, error } = await supabase
			.from('profiles')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) throw error;

		// Get the container where cards will be added
		const container = document.getElementById('cardsContainer');
		if (!container) return;

		// Clear existing cards if any
		container.innerHTML = '';

		// Create cards for each profile
		profiles.forEach(profile => {
			const card = document.createElement('div');
			card.className = 'connect-card';
			card.id = 'openCard';

			// Create card content
			card.innerHTML = `
				<div class="connect-avatar">${profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}</div>
				<div class="connect-info">
					<h3 class="connect-name">${profile.full_name || 'Anonymous User'}</h3>
					<p class="connect-role">${profile.email || ''}</p>
					${profile.city ? `<p class="user-location">${profile.city}</p>` : ''}
				</div>
				<button id="openCard" class="connect-open-btn">Open</button>
			`;


			// Add click event listener
			card.addEventListener('click', () => {
				// Only allow navigation if screen width is 1024px or larger
				if (window.innerWidth <= 1024) {
					// Store the profile ID in localStorage for the next page
					localStorage.setItem('selectedProfileId', profile.id);
					window.location.href = 'eachConnectLanding.html';
				}
			});

			// Add window resize listener to handle responsive behavior
			window.addEventListener('resize', () => {
				const openBtn = card.querySelector('.connect-open-btn');
				if (openBtn) {
					if (window.innerWidth <= 1024) {
						openBtn.style.display = 'none';
					} else {
						openBtn.style.display = 'block';
					}
				}
			});

			// Initial check for button visibility
			const openBtn = card.querySelector('.connect-open-btn');
			if (openBtn) {
				openBtn.style.display = window.innerWidth <= 1024 ? 'none' : 'block';
			}

			container.appendChild(card);
		});
	} catch (error) {
		console.error('Error fetching users:', error);
	}
};

// Call getUsers when the page loads
document.addEventListener('DOMContentLoaded', getUsers);