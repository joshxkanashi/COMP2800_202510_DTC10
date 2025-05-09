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

// Create Supabase client
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

export { supabase }
