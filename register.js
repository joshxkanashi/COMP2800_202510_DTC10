import { supabase } from './supabaseAPI.js';

// DOM Elements
const registerForm = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');

// Show message to user
function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const dateOfBirth = document.getElementById('dateOfBirth').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }

    try {
        // Register user in auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    date_of_birth: dateOfBirth
                }
            }
        });

        if (authError) throw authError;

        // Create profile in profiles table
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    date_of_birth: dateOfBirth,
                    created_at: new Date().toISOString()
                }
            ]);

        if (profileError) throw profileError;

        showMessage('Registration successful! Please check your email for verification.', 'success');
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Register form submission
    registerForm.addEventListener('submit', handleRegister);

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = 'index.html';
        }
    });
}); 