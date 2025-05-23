/*
Required npm packages:
npm install @supabase/supabase-js@2

Note: This file uses ES modules, so make sure your HTML files include:
<script type="module" src="auth.js"></script>
*/

import { supabase } from './supabaseAPI.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
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

// Handle Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showMessage('Email or password is incorrect', 'error');
            return;
        }

        showMessage('Login successful!', 'success');
        window.location.href = 'index.html';
    } catch (error) {
        showMessage('Email or password is incorrect', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = 'index.html';
        }
    }).catch(() => {
        // Silently handle any session check errors
    });
}); 