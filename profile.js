import { supabase } from './supabaseAPI.js';

// Function to update user avatar with profile data
export async function updateUserAvatar() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        // Update all user avatars on the page
        const avatars = document.querySelectorAll('.user-avatar');
        avatars.forEach(avatar => {
            if (profile && profile.full_name) {
                avatar.textContent = profile.full_name.charAt(0).toUpperCase();
            } else {
                // Fallback to email if full_name is not available
                avatar.textContent = user.email.charAt(0).toUpperCase();
            }
        });

        // Update welcome title if it exists
        const welcomeTitle = document.querySelector('.welcome-title');
        if (welcomeTitle) {
            const displayName = profile?.full_name || user.email.split('@')[0];
            welcomeTitle.textContent = `Welcome, ${displayName}`;
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to email if there's an error
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const avatars = document.querySelectorAll('.user-avatar');
            avatars.forEach(avatar => {
                avatar.textContent = user.email.charAt(0).toUpperCase();
            });
        }
    }
}

// Set up logout functionality
function setupLogout() {
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

// Call updateUserAvatar and setup logout when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateUserAvatar();
    setupLogout();
}); 