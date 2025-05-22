// connectChat.js - Real-time chat functionality for Connect page
import { supabase } from './supabaseAPI.js';

// Global variables
let currentUser = null;
let currentChatUserId = null;
let currentConversationId = null;
let messageSubscription = null;
let conversationSubscription = null;
let globalPresenceChannel = null;
let presenceChannel = null;
let isTyping = false;
let typingTimeout = null;
const MESSAGES_PER_PAGE = 20;
let currentPage = 1;
let allMessagesLoaded = false;
let chatRequestStatus = null;
let onlineUsers = new Set();

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
        
        // Subscribe to global presence
        subscribeToGlobalPresence();
        
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
    const chatMessages = document.getElementById('chatMessages');
    const acceptRequest = document.getElementById('acceptRequest');
    const declineRequest = document.getElementById('declineRequest');
    
    if (!chatModal || !chatClose || !chatInput || !chatSend || !chatMessages || !acceptRequest || !declineRequest) {
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
    
    // Handle typing indicator
    chatInput.addEventListener('input', () => {
        chatSend.disabled = !chatInput.value.trim();
        handleTypingIndicator();
    });

    // Accept chat request
    acceptRequest.addEventListener('click', async () => {
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ status: 'accepted' })
                .eq('id', currentConversationId);
                
            if (error) throw error;
            
            chatRequestStatus = 'accepted';
            
            // Update UI elements
            const chatEmpty = document.getElementById('chatEmpty');
            const chatRequest = document.getElementById('chatRequest');
            const chatMessages = document.getElementById('chatMessages');
            const chatInput = document.getElementById('chatInput');
            
            if (chatEmpty) chatEmpty.style.display = 'none';
            if (chatRequest) chatRequest.style.display = 'none';
            if (chatMessages) {
                chatMessages.style.display = 'flex';
                chatMessages.innerHTML = ''; // Clear any existing content
            }
            if (chatInput) {
                chatInput.disabled = false;
                chatInput.placeholder = 'Type a message...';
                chatInput.focus();
            }
            
            // Reload messages to show the initial message
            await loadMessages(currentConversationId);
        } catch (error) {
            console.error('Error accepting chat request:', error);
            alert('Error accepting chat request. Please try again.');
        }
    });
    
    // Decline chat request
    declineRequest.addEventListener('click', async () => {
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ status: 'declined' })
                .eq('id', currentConversationId);
                
            if (error) throw error;
            
            closeChat();
        } catch (error) {
            console.error('Error declining chat request:', error);
            alert('Error declining chat request. Please try again.');
        }
    });

    // Subscribe to conversation status changes
    subscribeToConversationChanges();
}

// Handle conversation status change
async function handleConversationStatusChange(newStatus) {
    console.log('Handling conversation status change:', newStatus);
    chatRequestStatus = newStatus;
    
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const chatRequest = document.getElementById('chatRequest');
    const chatEmpty = document.getElementById('chatEmpty');
    
    if (!chatInput || !chatMessages || !chatRequest || !chatEmpty) {
        console.error('Required chat elements not found');
        return;
    }

    if (newStatus === 'accepted') {
        // Hide request UI and empty state
        chatRequest.style.display = 'none';
        chatEmpty.style.display = 'none';
        
        // Show messages container
        chatMessages.style.display = 'flex';
        chatMessages.innerHTML = ''; // Clear any existing content
        
        // Enable input
        chatInput.disabled = false;
        chatInput.placeholder = 'Type a message...';
        
        // Load messages
        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', currentConversationId)
                .order('created_at', { ascending: true });
                
            if (error) throw error;
            
            if (messages && messages.length > 0) {
                messages.forEach(message => {
                    const isMine = message.sender_id === currentUser.id;
                    addMessageToUI(message, isMine);
                });
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages after accept:', error);
        }
    } else if (newStatus === 'declined') {
        // Close the chat and clean up
        closeChat();
        
        // Delete the conversation and messages
        if (currentConversationId) {
            supabase
                .from('conversations')
                .delete()
                .eq('id', currentConversationId)
                .then(() => {
                    console.log('Conversation deleted');
                })
                .catch(error => {
                    console.error('Error deleting conversation:', error);
                });
        }
    }
}

// Subscribe to conversation status changes
function subscribeToConversationChanges() {
    if (conversationSubscription) {
        conversationSubscription.unsubscribe();
    }

    const channelName = `conversation_changes_${currentConversationId}_${Date.now()}`;
    console.log('Setting up conversation subscription:', channelName);

    conversationSubscription = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${currentConversationId}`
            },
            async (payload) => {
                console.log('Conversation change detected:', payload.new.status);
                
                // Update local status
                chatRequestStatus = payload.new.status;
                
                if (payload.new.status === 'accepted') {
                    // Hide waiting message
                    const chatEmpty = document.getElementById('chatEmpty');
                    const chatMessages = document.getElementById('chatMessages');
                    const chatInput = document.getElementById('chatInput');
                    
                    if (chatEmpty) chatEmpty.style.display = 'none';
                    if (chatMessages) {
                        chatMessages.style.display = 'flex';
                        chatMessages.innerHTML = ''; // Clear any existing content
                    }
                    if (chatInput) {
                        chatInput.disabled = false;
                        chatInput.placeholder = 'Type a message...';
                    }
                    
                    // Load initial messages
                    try {
                        const { data: messages, error } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('conversation_id', currentConversationId)
                            .order('created_at', { ascending: true });
                            
                        if (error) throw error;
                        
                        if (messages && messages.length > 0) {
                            messages.forEach(message => {
                                const isMine = message.sender_id === currentUser.id;
                                addMessageToUI(message, isMine);
                            });
                            scrollToBottom();
                        }
                    } catch (error) {
                        console.error('Error loading initial messages:', error);
                    }
                    
                    // Subscribe to new messages
                    subscribeToMessages(currentConversationId);
                } else if (payload.new.status === 'declined') {
                    closeChat();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to conversation updates');
        }
    });
}

// Handle typing indicator
function handleTypingIndicator() {
    if (!isTyping) {
        isTyping = true;
        broadcastTypingStatus(true);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Set new timeout
    typingTimeout = setTimeout(() => {
        isTyping = false;
        broadcastTypingStatus(false);
    }, 2000);
}

// Broadcast typing status
function broadcastTypingStatus(isTyping) {
    if (presenceChannel && currentConversationId) {
        presenceChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { isTyping, userId: currentUser.id }
        });
    }
}

// Load more messages (pagination)
async function loadMoreMessages() {
    if (!currentConversationId) return;
    
    try {
        currentPage++;
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', currentConversationId)
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * MESSAGES_PER_PAGE, currentPage * MESSAGES_PER_PAGE - 1);
            
        if (error) throw error;
        
        // Preserve scroll position
        const chatMessages = document.getElementById('chatMessages');
        const oldHeight = chatMessages.scrollHeight;
        
        // Add messages to top of container
        messages.reverse().forEach(message => {
            const isMine = message.sender_id === currentUser.id;
            prependMessageToUI(message, isMine);
        });
        
        // Maintain scroll position
        chatMessages.scrollTop = chatMessages.scrollHeight - oldHeight;
    } catch (error) {
        console.error('Error loading more messages:', error);
    }
}

// Prepend a message to the UI (for loading history)
function prependMessageToUI(message, isMine) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageEl = createMessageElement(message, isMine);
    chatMessages.insertBefore(messageEl, chatMessages.firstChild);
}

// Create message element
function createMessageElement(message, isMine) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isMine ? 'sent' : 'received'}`;
    messageEl.setAttribute('data-id', message.id);
    
    const date = new Date(message.created_at);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageEl.innerHTML = `
        <div class="chat-message-content">${escapeHtml(message.content)}</div>
        <div class="chat-message-time">${timeString}</div>
    `;
    
    return messageEl;
}

// Subscribe to presence channel
function subscribeToPresence(conversationId) {
    if (presenceChannel) {
        presenceChannel.unsubscribe();
    }
    
    presenceChannel = supabase.channel(`presence-${conversationId}`);
    
    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            updateOnlineStatus(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', newPresences[0]);
            updateOnlineStatus(presenceChannel.presenceState());
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left:', leftPresences[0]);
            updateOnlineStatus(presenceChannel.presenceState());
        })
        .on('broadcast', { event: 'typing' }, payload => {
            handleTypingEvent(payload);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ 
                    user_id: currentUser.id,
                    online_at: new Date().toISOString()
                });
            }
        });
}

// Update online status in UI
function updateOnlineStatus(state) {
    const statusEl = document.querySelector('.chat-header-status');
    if (!statusEl || !currentChatUserId) return;
    
    const otherUserPresence = Object.values(state).flat()
        .find(presence => presence.user_id === currentChatUserId);
    
    statusEl.textContent = otherUserPresence ? 'Online' : 'Offline';
}

// Handle typing event
function handleTypingEvent(payload) {
    if (payload.payload.userId === currentChatUserId) {
        const statusEl = document.querySelector('.chat-header-status');
        if (statusEl) {
            if (payload.payload.isTyping) {
                statusEl.textContent = 'Typing...';
            } else {
                // Revert to online status
                updateOnlineStatus(presenceChannel.presenceState());
            }
        }
    }
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
        // Check if conversation exists and its status
        const [user1, user2] = [currentUser.id, userId].sort();
        console.log('Checking for existing conversation between users:', user1, user2);
        
        const { data: existingConv, error: queryError } = await supabase
            .from('conversations')
            .select('id, status, initiator_id')
            .eq('user1_id', user1)
            .eq('user2_id', user2)
            .maybeSingle();
            
        if (queryError) throw queryError;
        
        console.log('Existing conversation:', existingConv);
        let conversationId;
        
        if (existingConv) {
            // If conversation exists and is accepted, open it directly
            if (existingConv.status === 'accepted') {
                console.log('Opening existing accepted conversation');
                conversationId = existingConv.id;
                chatRequestStatus = 'accepted';
            } else if (existingConv.status === 'pending') {
                console.log('Found pending conversation');
                // If pending and user is initiator, just open the chat
                if (existingConv.initiator_id === currentUser.id) {
                    console.log('Current user is initiator, showing waiting state');
                    conversationId = existingConv.id;
                    chatRequestStatus = 'pending';
                } else {
                    console.log('Current user is recipient, showing accept/decline UI');
                    // If user is recipient, show accept/decline UI
                    conversationId = existingConv.id;
                    chatRequestStatus = 'pending';
                }
            }
        } else {
            console.log('Creating new conversation');
            // New conversation - need initial message
            const initialMessage = await promptForInitialMessage();
            if (!initialMessage) {
                console.log('User cancelled initial message');
                return; // User cancelled
            }
            
            // Create new conversation with pending status
            const { data: newConv, error: insertError } = await supabase
                .from('conversations')
                .insert([{
                    user1_id: user1,
                    user2_id: user2,
                    status: 'pending',
                    initiator_id: currentUser.id
                }])
                .select()
                .single();
                
            if (insertError) throw insertError;
            
            console.log('Created new conversation:', newConv);
            
            // Create initial message
            const { error: messageError } = await supabase
                .from('messages')
                .insert([{
                    conversation_id: newConv.id,
                    sender_id: currentUser.id,
                    content: initialMessage,
                    read: false
                }]);
                
            if (messageError) throw messageError;
            
            conversationId = newConv.id;
            chatRequestStatus = 'pending';
        }
        
        if (!conversationId) {
            throw new Error('Failed to get or create conversation');
        }
        
        console.log('Final conversation state:', {
            conversationId,
            chatRequestStatus,
            currentUser: currentUser.id
        });
        
        currentChatUserId = userId;
        currentConversationId = conversationId;
        currentPage = 1;
        allMessagesLoaded = false;
        
        // Set chat header information
        const chatHeaderName = document.getElementById('chatHeaderName');
        const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
        
        if (chatHeaderName) {
            chatHeaderName.textContent = userName || 'User';
        }
        
        if (chatHeaderAvatar) {
            if (userAvatar) {
                chatHeaderAvatar.innerHTML = `<img src="${userAvatar}" alt="${userName || 'User'}">`;
            } else {
                const firstLetter = (userName || 'U').charAt(0).toUpperCase();
                chatHeaderAvatar.innerHTML = firstLetter;
            }
        }
        
        // Clear previous messages and show loading
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '<div class="chat-loading">Loading messages...</div>';
        }
        
        // Set up subscriptions before opening the modal
        subscribeToConversationChanges();
        subscribeToPresence(conversationId);
        
        // Only subscribe to messages if the chat is already accepted
        if (chatRequestStatus === 'accepted') {
        subscribeToMessages(conversationId);
        }
        
        // Load initial messages
        await loadMessages(conversationId);
        
        // Open chat modal
        chatModal.classList.add('open');
            
        // Ensure chat is scrolled to bottom after a short delay
            setTimeout(() => {
            scrollToBottom();
            // Focus input field if chat is accepted
            const chatInput = document.getElementById('chatInput');
            if (chatInput && chatRequestStatus === 'accepted') {
                chatInput.focus();
        }
        }, 100);
    } catch (error) {
        console.error('Error opening chat:', error);
        alert('Error opening chat. Please try again.');
    }
}

// Prompt user for initial message
function promptForInitialMessage() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
        `;

        content.innerHTML = `
            <h3 style="margin: 0 0 16px; font-size: 18px;">Start Conversation</h3>
            <p style="margin: 0 0 16px; color: #666;">Send a message to start this conversation:</p>
            <textarea id="initialMessageInput" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; min-height: 100px; resize: none;" placeholder="Type your message..."></textarea>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelInitialMessage" style="padding: 8px 16px; border: none; border-radius: 6px; background: #f3f4f6; cursor: pointer;">Cancel</button>
                <button id="sendInitialMessage" style="padding: 8px 16px; border: none; border-radius: 6px; background: #6366f1; color: white; cursor: pointer;">Send</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const input = content.querySelector('#initialMessageInput');
        const sendBtn = content.querySelector('#sendInitialMessage');
        const cancelBtn = content.querySelector('#cancelInitialMessage');

        input.focus();

        sendBtn.addEventListener('click', () => {
            const message = input.value.trim();
            if (message) {
                document.body.removeChild(modal);
                resolve(message);
            }
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = input.value.trim();
                if (message) {
                    document.body.removeChild(modal);
                    resolve(message);
                }
            }
        });
    });
}

// Close chat modal and clean up
function closeChat() {
    console.log('Closing chat...');
    
    // Remove open class from modal
    const chatModal = document.getElementById('chatModal');
    if (chatModal) {
        chatModal.classList.remove('open');
    }
    
    // Clear input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
        chatInput.disabled = false;
    }
    
    // Clear messages
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Clean up chat-specific subscriptions
    if (messageSubscription) {
        messageSubscription.unsubscribe();
        messageSubscription = null;
    }
    
    if (presenceChannel) {
        presenceChannel.unsubscribe();
        presenceChannel = null;
    }
    
    if (conversationSubscription) {
        conversationSubscription.unsubscribe();
        conversationSubscription = null;
    }
    
    // Reset chat-specific state
    currentChatUserId = null;
    currentConversationId = null;
    currentPage = 1;
    allMessagesLoaded = false;
    isTyping = false;
    chatRequestStatus = null;
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
}

// Get or create a conversation with the specified user
async function getOrCreateConversation(otherUserId, initialMessage = null) {
    try {
        console.log('Getting or creating conversation between', currentUser.id, 'and', otherUserId);
        
        // Sort user IDs to match how they are stored in the DB
        const [user1, user2] = [currentUser.id, otherUserId].sort();
        
        // Check if conversation exists
        const { data: existingConv, error: queryError } = await supabase
            .from('conversations')
            .select('id, status')
            .eq('user1_id', user1)
            .eq('user2_id', user2)
            .maybeSingle();
            
        if (queryError) throw queryError;
        
        if (existingConv) {
            console.log('Found existing conversation:', existingConv.id);
            chatRequestStatus = existingConv.status;
            return existingConv.id;
        }
        
        // Create new conversation with pending status
        const { data: newConv, error: insertError } = await supabase
            .from('conversations')
            .insert([{
                user1_id: user1,
                user2_id: user2,
                status: 'pending',
                initiator_id: currentUser.id
            }])
            .select()
            .single();
            
        if (insertError) throw insertError;
        
        // If we have an initial message, create it
        if (initialMessage && newConv.id) {
            const { error: messageError } = await supabase
                .from('messages')
                .insert([{
                    conversation_id: newConv.id,
                    sender_id: currentUser.id,
                    content: initialMessage,
                    read: false
                }]);
                
            if (messageError) throw messageError;
        }
        
        console.log('Created new conversation:', newConv.id);
        chatRequestStatus = 'pending';
        return newConv.id;
    } catch (error) {
        console.error('Error getting/creating conversation:', error);
        return null;
    }
}

// Subscribe to new messages for the current conversation
function subscribeToMessages(conversationId) {
    try {
        console.log('Setting up message subscription for conversation:', conversationId);
        
        // Clean up any existing subscription
        if (messageSubscription) {
            console.log('Cleaning up existing message subscription');
            messageSubscription.unsubscribe();
        }
        
        // Create new subscription with a unique channel name
        const channelName = `messages_${conversationId}_${Date.now()}`;
        console.log('Creating new message subscription on channel:', channelName);
        
        messageSubscription = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    console.log('Message change received:', payload);
                    if (payload.eventType === 'INSERT') {
                        const message = payload.new;
                        const isMine = message.sender_id === currentUser.id;
                        console.log('New message:', message, 'Is mine:', isMine);
                        
                        // Only handle messages from the other user
                        if (!isMine) {
                            console.log('Adding received message to UI');
                            addMessageToUI(message, false);
                            scrollToBottom();
                            markMessageAsRead(message.id);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('Message subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to message updates');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to message updates');
                    // Try to resubscribe after a delay
                    setTimeout(() => subscribeToMessages(conversationId), 5000);
                }
            });
    } catch (error) {
        console.error('Error setting up message subscription:', error);
        setTimeout(() => subscribeToMessages(conversationId), 5000);
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
            .order('created_at', { ascending: true })
            .limit(MESSAGES_PER_PAGE);
            
        if (error) throw error;
        
        // Get all UI elements
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const chatRequest = document.getElementById('chatRequest');
        const chatEmpty = document.getElementById('chatEmpty');
        
        if (!chatMessages || !chatInput || !chatRequest || !chatEmpty) {
            console.error('Chat elements not found:', {
                chatMessages: !!chatMessages,
                chatInput: !!chatInput,
                chatRequest: !!chatRequest,
                chatEmpty: !!chatEmpty
            });
            return;
        }
        
        // Clear existing messages
        chatMessages.innerHTML = '';
        
        // Hide all containers initially
        chatEmpty.style.display = 'none';
        chatRequest.style.display = 'none';
        chatMessages.style.display = 'flex';
        
        console.log('Chat request status:', chatRequestStatus, 'Messages:', messages?.length);
        
        if (chatRequestStatus === 'pending') {
            console.log('Handling pending chat request...');
            const { data: conv } = await supabase
                .from('conversations')
                .select('initiator_id')
                .eq('id', conversationId)
                .single();
                
            if (conv) {
                const isRecipient = conv.initiator_id !== currentUser.id;
                console.log('Is recipient:', isRecipient);
                
                if (isRecipient) {
                    // Show accept/decline UI for recipient
                    chatRequest.style.display = 'flex';
                    chatMessages.style.display = 'none';
                    chatEmpty.style.display = 'none';
                    chatInput.disabled = true;
                    chatInput.placeholder = 'Accept the chat request to start messaging...';
                    
                    // Show initial message in request screen
                    if (messages && messages.length > 0) {
                        const chatRequestMessage = document.getElementById('chatRequestMessage');
                        if (chatRequestMessage) {
                            chatRequestMessage.textContent = messages[0].content;
                        }
                    }
                } else {
                    // Show waiting message for sender
                    chatMessages.style.display = 'none';
                    chatRequest.style.display = 'none';
                    chatEmpty.style.display = 'flex';
                    chatEmpty.innerHTML = `
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <p>Waiting for response...</p>
                        <p class="chat-empty-subtitle">The other user needs to accept your chat request</p>
                    `;
                    chatInput.disabled = true;
                    chatInput.placeholder = 'Waiting for user to accept your chat request...';
                }
            }
        } else {
            // Handle accepted conversation
            chatRequest.style.display = 'none';
            
            if (messages && messages.length > 0) {
                // Show messages if we have any
                chatEmpty.style.display = 'none';
                chatMessages.style.display = 'flex';
                
                messages.forEach(message => {
                const isMine = message.sender_id === currentUser.id;
                addMessageToUI(message, isMine);
                
                // Mark other user's unread messages as read
                if (!isMine && !message.read) {
                    markMessageAsRead(message.id);
                }
            });
            
                // Scroll to bottom after messages are loaded
                setTimeout(scrollToBottom, 100);
            } else {
                // Show empty state if no messages
                chatEmpty.style.display = 'flex';
                chatMessages.style.display = 'none';
                chatEmpty.innerHTML = `
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>No messages yet</p>
                    <p class="chat-empty-subtitle">Start the conversation by sending a message</p>
                `;
            }
            
            // Enable input for accepted conversations
            chatInput.disabled = false;
            chatInput.placeholder = 'Type a message...';
        }
        
        if (messages && messages.length < MESSAGES_PER_PAGE) {
            allMessagesLoaded = true;
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
    const chatEmpty = document.getElementById('chatEmpty');
    
    if (!chatMessages || !chatEmpty) {
        console.error('Chat messages container or empty state not found');
        return;
    }
    
    // Hide empty state and show messages container
    chatEmpty.style.display = 'none';
    chatMessages.style.display = 'flex';
    
    // Create message element
    const messageEl = createMessageElement(message, isMine);
    
    // Add to container
    chatMessages.appendChild(messageEl);
    
    // Scroll to bottom
    scrollToBottom();
}

// Toggle empty state visibility
function toggleEmptyState(show) {
    console.log('Toggling empty state:', show, 'Status:', chatRequestStatus);
    
    const chatEmpty = document.getElementById('chatEmpty');
    const chatRequest = document.getElementById('chatRequest');
    const chatMessages = document.getElementById('chatMessages');
    const chatRequestMessage = document.getElementById('chatRequestMessage');
    const chatInput = document.getElementById('chatInput');
    
    if (!chatEmpty || !chatRequest || !chatMessages || !chatInput) {
        console.warn('Chat elements not found');
        return;
    }
    
    // First hide all elements
    chatEmpty.style.display = 'none';
    chatRequest.style.display = 'none';
    chatMessages.style.display = 'flex';
    
    if (show) {
        if (chatRequestStatus === 'pending') {
            // Get the conversation to check if user is recipient
            supabase
                .from('conversations')
                .select('initiator_id')
                .eq('id', currentConversationId)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        const isRecipient = data.initiator_id !== currentUser.id;
                        
                        // Get and show the initial message
                        supabase
                            .from('messages')
                            .select('content')
                            .eq('conversation_id', currentConversationId)
                            .order('created_at', { ascending: true })
                            .limit(1)
                            .single()
                            .then(({ data: messageData, error: messageError }) => {
                                if (!messageError && messageData && chatRequestMessage) {
                                    // Show the initial message in both chat request and messages
                                    chatRequestMessage.textContent = messageData.content;
                                    
                                    // If showing messages, make sure the initial message is there
                                    if (chatMessages.style.display === 'flex' && chatMessages.children.length === 0) {
                                        const message = {
                                            id: 'initial',
                                            content: messageData.content,
                                            sender_id: data.initiator_id,
                                            created_at: new Date().toISOString()
                                        };
                                        addMessageToUI(message, data.initiator_id === currentUser.id);
                                    }
                                }
                            });
                        
                        if (isRecipient) {
                            // Show request UI with accept/decline buttons for recipient
                            chatRequest.style.display = 'flex';
                            chatMessages.style.display = 'none';
                            chatInput.disabled = true;
                            chatInput.placeholder = 'Accept the chat request to start messaging...';
                        } else {
                            // Show waiting message for sender
                            chatMessages.style.display = 'none';
                            chatEmpty.style.display = 'flex';
                            chatEmpty.innerHTML = `
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <p>Waiting for response...</p>
                                <p class="chat-empty-subtitle">The other user needs to accept your chat request</p>
                            `;
                            chatInput.disabled = true;
                            chatInput.placeholder = 'Waiting for user to accept your chat request...';
                        }
                    }
                });
        } else {
            // Show empty state for accepted chats with no messages
            chatEmpty.style.display = 'flex';
            chatMessages.style.display = 'none';
            chatInput.disabled = false;
            chatInput.placeholder = 'Type a message...';
        }
    }
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
    if (!currentUser || !currentConversationId || chatRequestStatus !== 'accepted') {
        console.error('Cannot send message: user or conversation not set or not accepted');
        return;
    }
    
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    
    if (!chatInput || !chatSend) {
        console.error('Chat input or send button not found');
        return;
    }
    
    const content = chatInput.value.trim();
    if (!content) return;
    
    try {
        console.log('Sending message to conversation:', currentConversationId);
    
        // Send message to server
        const { data: message, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: currentConversationId,
                sender_id: currentUser.id,
                content: content,
                read: false
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        console.log('Message sent successfully:', message);
        
        // Add message to UI
        addMessageToUI(message, true);
        
        // Clear input and scroll
        chatInput.value = '';
        chatSend.disabled = true;
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
    
    chatInput.focus();
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

// Subscribe to global presence
function subscribeToGlobalPresence() {
    if (globalPresenceChannel) {
        globalPresenceChannel.unsubscribe();
    }

    globalPresenceChannel = supabase.channel('global_presence');
    
    globalPresenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = globalPresenceChannel.presenceState();
            updateOnlineUsers(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            const state = globalPresenceChannel.presenceState();
            updateOnlineUsers(state);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            const state = globalPresenceChannel.presenceState();
            updateOnlineUsers(state);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await globalPresenceChannel.track({
                    user_id: currentUser.id,
                    online_at: new Date().toISOString()
                });
            }
        });
}

// Update online users set and UI
function updateOnlineUsers(state) {
    onlineUsers.clear();
    
    // Collect all online user IDs
    Object.values(state).forEach(presences => {
        presences.forEach(presence => {
            onlineUsers.add(presence.user_id);
        });
    });
    
    // Update status in chat header if chat is open
    updateChatHeaderStatus();
}

// Update chat header status
function updateChatHeaderStatus() {
    const statusEl = document.querySelector('.chat-header-status');
    if (!statusEl || !currentChatUserId) return;
    
    const isOnline = onlineUsers.has(currentChatUserId);
    const isTypingUser = isTyping && currentChatUserId;
    
    if (isTypingUser) {
        statusEl.textContent = 'Typing...';
    } else {
        statusEl.textContent = isOnline ? 'Online' : 'Offline';
    }
}

// Clean up function for page unload
window.addEventListener('beforeunload', () => {
    if (globalPresenceChannel) {
        globalPresenceChannel.unsubscribe();
    }
    if (presenceChannel) {
        presenceChannel.unsubscribe();
    }
});

// Export functions
export { openChat }; 