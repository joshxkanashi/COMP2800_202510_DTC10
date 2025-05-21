// connectChat.js - Real-time chat functionality for Connect page
import { supabase } from './supabaseAPI.js';

// Global variables
let currentUser = null;
let currentChatUserId = null;
let currentConversationId = null;
let messageSubscription = null;
let conversationSubscription = null;

// Make openChat function available globally right away
window.openChat = openChat;

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Chat module loaded');
    
    // Check if elements exist before trying to use them
    if (!document.getElementById('chatModal')) {
        console.error('Chat modal elements not found in DOM. Chat functionality disabled.');
        return;
    }

    // Check if user is logged in
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.log('User not logged in. Chat functionality disabled.');
            return;
        }
        
        currentUser = user;
        console.log('Chat initialized for user:', currentUser.id);
        
        // Setup chat UI elements
        setupChatUI();
        
        // Load existing conversations
        loadUserConversations();
        
        // Make sure openChat is available globally (redundant but safe)
        window.openChat = openChat;
        console.log('Chat functions exposed globally');
    } catch (err) {
        console.error('Error initializing chat:', err);
    }
});

// Setup chat UI elements and event listeners
function setupChatUI() {
    // Get DOM elements
    const chatModal = document.getElementById('chatModal');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    
    if (!chatModal || !chatClose || !chatInput || !chatSend) {
        console.error('Required chat UI elements not found');
        return;
    }
    
    // Close chat modal when clicking close button
    chatClose.addEventListener('click', () => {
        closeChat();
    });
    
    // Close chat modal when clicking outside it
    chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) {
            closeChat();
        }
    });
    
    // Send message when clicking send button
    chatSend.addEventListener('click', () => {
        sendMessage();
    });
    
    // Send message when pressing Enter in input field
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Enable/disable send button based on input
    chatInput.addEventListener('input', () => {
        chatSend.disabled = !chatInput.value.trim();
    });
    
    console.log('Chat UI setup complete');
}

// Open chat with selected user
async function openChat(userId, userName, userAvatar) {
    console.log('Opening chat with user:', userId, userName);
    
    // Check if chat modal exists
    const chatModal = document.getElementById('chatModal');
    if (!chatModal) {
        console.error('Chat modal not found in DOM');
        alert('Chat functionality is not available. Please refresh the page.');
        return;
    }
    
    if (!currentUser) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                alert('Please log in to use the chat feature');
                return;
            }
            currentUser = user;
        } catch (err) {
            console.error('Error getting current user:', err);
            alert('Unable to verify your login status. Please refresh the page and try again.');
            return;
        }
    }
    
    if (userId === currentUser.id) {
        alert('You cannot chat with yourself');
        return;
    }
    
    try {
        // Get or create conversation
        currentChatUserId = userId;
        const conversationId = await getOrCreateConversation(userId);
        
        if (!conversationId) {
            console.error('Failed to get or create conversation');
            alert('Error starting conversation. Please try again');
            return;
        }
        
        currentConversationId = conversationId;
        
        // Set chat header information
        const chatHeaderName = document.getElementById('chatHeaderName');
        const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
        
        if (chatHeaderName) {
            chatHeaderName.textContent = userName || 'User';
        }
        
        if (chatHeaderAvatar) {
            if (userAvatar) {
                // If user has avatar, show it
                chatHeaderAvatar.innerHTML = `<img src="${userAvatar}" alt="${userName || 'User'}">`;
            } else {
                // Otherwise show first letter of name
                const firstLetter = (userName || 'U').charAt(0).toUpperCase();
                chatHeaderAvatar.innerHTML = firstLetter;
            }
        }
        
        // Clear previous messages and show loading
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '<div class="chat-loading">Loading messages...</div>';
        }
        
        // Subscribe to new messages
        subscribeToMessages(conversationId);
        
        // Load existing messages
        await loadMessages(conversationId);
        
        // Open chat modal
        chatModal.classList.add('open');
            
        // Focus input field
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            setTimeout(() => {
                chatInput.focus();
            }, 300);
        }
    } catch (error) {
        console.error('Error opening chat:', error);
        alert('Error opening chat. Please try again.');
    }
}

// Close chat modal and clean up
function closeChat() {
    // Remove open class from modal
    const chatModal = document.getElementById('chatModal');
    if (chatModal) {
        chatModal.classList.remove('open');
    }
    
    // Clear input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
    }
    
    // Unsubscribe from message updates
    if (messageSubscription) {
        try {
            messageSubscription.unsubscribe();
            console.log('Unsubscribed from message updates');
        } catch (error) {
            console.error('Error unsubscribing from messages:', error);
        }
        messageSubscription = null;
    }
    
    // Reset current conversation state
    currentChatUserId = null;
    currentConversationId = null;
}

// Get or create a conversation with the specified user
async function getOrCreateConversation(otherUserId) {
    try {
        console.log('Getting or creating conversation between', currentUser.id, 'and', otherUserId);
        
        // Sort user IDs to match how they are stored in the DB (important!)
        const [user1, user2] = [currentUser.id, otherUserId].sort();
        
        // Check if conversation exists
        const { data: existingConv, error: queryError } = await supabase
            .from('conversations')
            .select('id')
            .eq('user1_id', user1)
            .eq('user2_id', user2)
            .maybeSingle();
            
        if (queryError) {
            console.error('Error querying conversations:', queryError);
            throw queryError;
        }
        
        if (existingConv) {
            console.log('Found existing conversation:', existingConv.id);
            return existingConv.id;
        }
        
        // If no existing conversation, try the RPC function approach
        try {
            console.log('No existing conversation found, trying RPC function...');
            const { data: conversationId, error } = await supabase.rpc(
                'find_or_create_conversation',
                { 
                    user1: user1,
                    user2: user2
                }
            );
            
            if (!error && conversationId) {
                console.log('Got conversation ID from RPC:', conversationId);
                return conversationId;
            }
            
            console.warn('RPC approach failed:', error);
            // Continue to fallback approach
        } catch (rpcError) {
            console.warn('RPC approach threw exception:', rpcError);
            // Continue to fallback approach
        }
        
        // Fallback approach - manual creation
        console.log('Using fallback approach for conversation creation...');
        
        // Create new conversation
        const { data: newConv, error: insertError } = await supabase
            .from('conversations')
            .insert([
                { user1_id: user1, user2_id: user2 }
            ])
            .select()
            .single();
            
        if (insertError) {
            console.error('Error creating conversation:', insertError);
            throw insertError;
        }
        
        console.log('Created new conversation:', newConv.id);
        return newConv.id;
    } catch (error) {
        console.error('Error getting/creating conversation:', error);
        return null;
    }
}

// Subscribe to new messages for the current conversation
function subscribeToMessages(conversationId) {
    try {
        console.log('Subscribing to messages for conversation:', conversationId);
        
        // Clean up any existing subscription
        if (messageSubscription) {
            messageSubscription.unsubscribe();
        }
        
        // Create new subscription
        messageSubscription = supabase
            .channel(`messages:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, handleNewMessage)
            .subscribe((status) => {
                console.log('Message subscription status:', status);
            });
            
        console.log('Subscribed to message updates');
    } catch (error) {
        console.error('Error subscribing to messages:', error);
    }
}

// Handle new message from subscription
function handleNewMessage(payload) {
    console.log('New message received:', payload);
    
    try {
        const message = payload.new;
        
        // Skip messages that we sent (they're already in the UI)
        if (message.sender_id === currentUser.id) {
            return;
        }
        
        // Add message to UI
        addMessageToUI(message, false);
        
        // Hide empty state if visible
        toggleEmptyState(false);
        
        // Scroll to bottom
        scrollToBottom();
        
        // Mark message as read
        markMessageAsRead(message.id);
    } catch (error) {
        console.error('Error handling new message:', error);
    }
}

// Load existing messages for a conversation
async function loadMessages(conversationId) {
    try {
        console.log('Loading messages for conversation:', conversationId);
        
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
        if (error) {
            throw error;
        }
        
        // Clear chat container
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }
        
        chatMessages.innerHTML = '';
        
        // Show or hide empty state
        toggleEmptyState(messages.length === 0);
        
        // Add messages to UI
        if (messages.length > 0) {
            messages.forEach(message => {
                const isMine = message.sender_id === currentUser.id;
                addMessageToUI(message, isMine);
                
                // Mark other user's unread messages as read
                if (!isMine && !message.read) {
                    markMessageAsRead(message.id);
                }
            });
            
            // Scroll to bottom
            scrollToBottom();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        
        // Show error in chat container
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '<div class="chat-error">Error loading messages. Please try again.</div>';
        }
    }
}

// Add a message to the UI
function addMessageToUI(message, isMine) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = isMine ? 'chat-message sent' : 'chat-message received';
    messageEl.setAttribute('data-id', message.id);
    
    // Format timestamp
    const date = new Date(message.created_at);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Set message content
    messageEl.innerHTML = `
        ${escapeHtml(message.content)}
        <div class="chat-message-time">${timeString}</div>
    `;
    
    // Add to container
    chatMessages.appendChild(messageEl);
}

// Toggle empty state visibility
function toggleEmptyState(show) {
    const chatEmpty = document.getElementById('chatEmpty');
    if (!chatEmpty) {
        console.warn('Chat empty element not found');
        return;
    }
    
    chatEmpty.style.display = show ? 'flex' : 'none';
}

// Scroll chat to bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Send a new message
async function sendMessage() {
    if (!currentUser || !currentConversationId) {
        console.error('Cannot send message: user or conversation not set');
        return;
    }
    
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    
    if (!chatInput || !chatSend) {
        console.error('Chat input or send button not found');
        return;
    }
    
    // Get message content
    const content = chatInput.value.trim();
    if (!content) return;
    
    // Disable input and button while sending
    chatInput.disabled = true;
    chatSend.disabled = true;
    
    try {
        console.log('Sending message to conversation:', currentConversationId);
        
        // Insert message into database
        const { data: message, error } = await supabase
            .from('messages')
            .insert([
                {
                    conversation_id: currentConversationId,
                    sender_id: currentUser.id,
                    content: content,
                    read: false
                }
            ])
            .select()
            .single();
            
        if (error) throw error;
        
        // Add message to UI
        addMessageToUI(message, true);
        
        // Hide empty state if visible
        toggleEmptyState(false);
        
        // Clear input
        chatInput.value = '';
        
        // Scroll to bottom
        scrollToBottom();
        
        console.log('Message sent successfully:', message.id);
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    } finally {
        // Re-enable input and button
        chatInput.disabled = false;
        chatSend.disabled = true; // Will be enabled once text is entered
        chatInput.focus();
    }
}

// Mark a message as read
async function markMessageAsRead(messageId) {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('id', messageId);
            
        if (error) {
            console.error('Error marking message as read:', error);
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Helper function to escape HTML for security
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Load user's existing conversations
async function loadUserConversations() {
    if (!currentUser) return;
    
    try {
        // Get all conversations where the current user is involved
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);
        
        if (error) {
            console.error('Error loading conversations:', error);
            return;
        }
        
        console.log('User conversations:', conversations);
        
        // Subscribe to new conversations
        subscribeToConversations();
    } catch (error) {
        console.error('Error in loadUserConversations:', error);
    }
}

// Subscribe to new conversations
function subscribeToConversations() {
    if (!currentUser) {
        console.error('Cannot subscribe to conversations: No user');
        return;
    }
    
    // Unsubscribe from existing subscription
    if (conversationSubscription) {
        conversationSubscription.unsubscribe();
    }
    
    try {
        // Subscribe to conversation updates
        conversationSubscription = supabase
            .channel(`conversations-${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `user1_id=eq.${currentUser.id}`
            }, (payload) => {
                console.log('Conversation update for user1:', payload);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `user2_id=eq.${currentUser.id}`
            }, (payload) => {
                console.log('Conversation update for user2:', payload);
            })
            .subscribe((status) => {
                console.log('Conversation subscription status:', status);
            });
    } catch (error) {
        console.error('Error subscribing to conversations:', error);
    }
}

// Export functions
export { openChat }; 