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
let supabase;

try {
    // For browsers using the global Supabase client (script tag)
    if (typeof window !== 'undefined' && window.supabase) {
        console.log('Creating Supabase client using global createClient');
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
    } 
    // For module environments
    else if (typeof createClient !== 'undefined') {
        console.log('Creating Supabase client using direct createClient');
        supabase = createClient(supabaseUrl, supabaseKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
    }
    // Try importing as a module (for Node.js or bundlers)
    else {
        console.log('Creating Supabase client using module import');
        supabase = { auth: { /* placeholder */ } };
        
        // Dynamic import for ESM environments
        import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
            .then(module => {
                const { createClient } = module;
                supabase = createClient(supabaseUrl, supabaseKey, {
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                });
                console.log('Supabase client initialized via dynamic import');
            })
            .catch(error => {
                console.error('Error initializing Supabase client:', error);
            });
    }
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    // Provide a fallback implementation or error state
    supabase = {
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase client not initialized') }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        },
        from: () => ({ select: () => Promise.resolve({ data: null, error: new Error('Supabase client not initialized') }) }),
        channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    };
}

// Function to validate the Supabase connection
async function validateConnection() {
    try {
        // Try to make a simple query to check if connection works
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error('Supabase connection validation failed:', error);
            return false;
        }
        
        // Also check the realtime connection since we need that for chat
        const channel = supabase.channel('connection-test');
        
        return new Promise((resolve) => {
            let timeoutId;
            
            // Create a timeout to resolve with false if subscription takes too long
            timeoutId = setTimeout(() => {
                console.error('Realtime subscription timed out');
                try {
                    channel.unsubscribe();
                } catch (err) {
                    // Ignore errors on cleanup
                }
                resolve(false);
            }, 5000);
            
            // Try to subscribe to a channel as a connection test
            channel
                .subscribe((status) => {
                    clearTimeout(timeoutId);
                    
                    if (status === 'SUBSCRIBED') {
                        console.log('Realtime connection validated successfully');
                        channel.unsubscribe();
                        resolve(true);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('Realtime connection failed');
                        resolve(false);
                    }
                });
        });
    } catch (error) {
        console.error('Error validating Supabase connection:', error);
        return false;
    }
}

// Run validation immediately if in browser environment
if (typeof window !== 'undefined' && supabase) {
    // Wait for DOM to be loaded to prevent console confusion
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', validateConnection);
    } else {
        validateConnection();
    }
}

export { supabase, validateConnection };
