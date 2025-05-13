/*
Required npm packages:
npm install @supabase/supabase-js@2

Note: The Supabase CDN is also included in login.html and register.html
via: <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
*/

// Initialize Supabase client
const supabaseUrl = 'https://pnuzpmbufbknukvfffip.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudXpwbWJ1ZmJrbnVrdmZmZmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMDY1NzMsImV4cCI6MjA2MTc4MjU3M30.pSIOLsweT1ifKE-dQCIo5zaVSe-ax-fdHQc29qvDaCo'

// Suppress console errors for Supabase requests
const originalConsoleError = console.error;
console.error = (...args) => {
    if (args[0]?.includes?.('supabase')) {
        return;
    }
    originalConsoleError.apply(console, args);
};

// Create Supabase client with fallback support for both module and script tag usage
let supabase;

// Check if we have access to the global Supabase client
if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Using global Supabase client');
} else {
    // Try to import as a module
    try {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Using module import Supabase client');
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        
        // Create an empty placeholder to prevent errors
        supabase = {
            auth: {
                getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                signIn: () => Promise.resolve({ error: new Error('Supabase not initialized') }),
                signOut: () => Promise.resolve({ error: null })
            },
            from: () => ({
                select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
                update: () => ({ eq: () => Promise.resolve({ error: null }) }),
                insert: () => Promise.resolve({ error: null })
            })
        };
    }
}

export { supabase }
