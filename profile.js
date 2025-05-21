import { supabase } from './supabaseAPI.js';

// Default avatar SVG as a data URL
const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(`
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" fill="#818cf8"/>
    <path d="M64 69.5833C75.2842 69.5833 84.4167 60.4508 84.4167 49.1667C84.4167 37.8825 75.2842 28.75 64 28.75C52.7158 28.75 43.5833 37.8825 43.5833 49.1667C43.5833 60.4508 52.7158 69.5833 64 69.5833Z" fill="white"/>
    <path d="M64 79.75C47.6558 79.75 34.3333 93.0725 34.3333 109.417H93.6667C93.6667 93.0725 80.3442 79.75 64 79.75Z" fill="white"/>
</svg>
`)}`;

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

        // Update profile picture if it exists
        const profilePicture = document.getElementById('profilePicture');
        if (profilePicture) {
            profilePicture.src = profile?.avatar_url || defaultAvatar;
            profilePicture.onerror = () => {
                profilePicture.src = defaultAvatar;
            };
        }

        // Update all user avatars on the page
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
                const avatarImg = avatar.querySelector('img.profile-picture');
                if (!avatarImg) {
                    avatar.textContent = user.email.charAt(0).toUpperCase();
                }
            });
        }
    }
}

// Function to handle profile picture upload
async function handleProfilePictureUpload(file) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Add loading state
        const container = document.querySelector('.profile-picture-container');
        container.classList.add('loading');

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('File size must be less than 2MB');
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Please upload an image file');
        }

        // Generate a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                avatar_url: publicUrl
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Update the profile picture
        const profilePicture = document.getElementById('profilePicture');
        if (profilePicture) {
            profilePicture.src = publicUrl;
            profilePicture.onerror = () => {
                profilePicture.src = DEFAULT_AVATAR;
            };
        }

        // Show success message
        alert('Profile picture updated successfully!');

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert(error.message || 'Error uploading profile picture. Please try again.');
    } finally {
        // Remove loading state
        const container = document.querySelector('.profile-picture-container');
        container.classList.remove('loading');
    }
}

// Function to load profile data
async function loadProfileData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Update form fields
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const dobInput = document.getElementById('dateOfBirth');

        if (fullNameInput) fullNameInput.value = profile?.full_name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (dobInput) dobInput.value = profile?.date_of_birth || '';

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Function to update profile
async function updateProfile(event) {
    event.preventDefault();
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fullName = document.getElementById('fullName').value;
        const dateOfBirth = document.getElementById('dateOfBirth').value;

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                date_of_birth: dateOfBirth
            })
            .eq('id', user.id);

        if (error) throw error;

        // Update the avatar and show success message
        await updateUserAvatar();
        alert('Profile updated successfully!');

    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
    }
}

// Function to change password
async function changePassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        alert('Password updated successfully!');
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

    } catch (error) {
        console.error('Error changing password:', error);
        alert('Error changing password. Please try again.');
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

// Initialize all functionality when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateUserAvatar();
    loadProfileData();
    setupLogout();

    // Set up form submission handlers
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const pictureInput = document.getElementById('pictureInput');
    const profilePictureContainer = document.querySelector('.profile-picture-container');

    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', changePassword);
    }

    if (pictureInput && profilePictureContainer) {
        // Handle click on profile picture container
        profilePictureContainer.addEventListener('click', () => {
            pictureInput.click();
        });

        // Handle file selection
        pictureInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleProfilePictureUpload(file);
            }
        });
    }
}); 