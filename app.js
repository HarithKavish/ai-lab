// ===== Configuration =====
const GOOGLE_USER_STORAGE_KEY = 'harith_google_user';
const CHATS_STORAGE_KEY = 'ai_chats_data';
const GOOGLE_ACCESS_TOKEN_KEY = 'google_access_token';
const GOOGLE_DRIVE_FOLDER_ID_KEY = 'google_drive_ai_folder_id';
const SYSTEM_PROMPT = "You are a helpful, friendly AI assistant. Provide concise and thoughtful answers.";
const GOOGLE_DRIVE_API_KEY = 'AIzaSyDvZ1uDqzNqpKGV3v8gVm_1Y2K3-Z4a5b6'; // Replace with your API key

// ===== Global State =====
let pipeline = null;
let modelReady = false;
let chats = [];
let currentChatId = null;
let googleAccessToken = null;
let driveFolderId = null;

// ===== Chat Management =====
function loadChatsFromStorage() {
    try {
        const raw = localStorage.getItem(CHATS_STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : { chats: [], currentChatId: null };
        chats = data.chats || [];
        currentChatId = data.currentChatId;
        return data;
    } catch (err) {
        console.error('Load chats error:', err);
        return { chats: [], currentChatId: null };
    }
}

function saveChatsToStorage() {
    const data = { chats, currentChatId };
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(data));
    // Sync to Google Drive if user is logged in
    if (googleAccessToken) {
        saveChatsToDrive();
    }
}

function createNewChat() {
    const id = Date.now().toString();
    const newChat = {
        id,
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    chats.unshift(newChat);
    currentChatId = id;
    saveChatsToStorage();
    return newChat;
}

function getCurrentChat() {
    return chats.find(chat => chat.id === currentChatId);
}

function switchChat(chatId) {
    currentChatId = chatId;
    saveChatsToStorage();
    renderChatUI();
}

function openNewBlankChat() {
    currentChatId = null;  // Set to null - this means a new unsaved chat
    renderChatUI();
}

function deleteChat(chatId) {
    chats = chats.filter(chat => chat.id !== chatId);
    if (currentChatId === chatId) {
        if (chats.length > 0) {
            currentChatId = chats[0].id;
        } else {
            currentChatId = null;  // No chat, just show blank
        }
    }
    saveChatsToStorage();
    renderChatUI();
}

function renameChat(chatId, newTitle) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.title = newTitle;
        chat.updatedAt = new Date().toISOString();
        saveChatsToStorage();
        renderSidebar();
    }
}

function generateChatTitle(messages) {
    if (messages.length === 0) return 'New Chat';
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
        let title = firstUserMsg.content.substring(0, 30);
        if (firstUserMsg.content.length > 30) title += '...';
        return title;
    }
    return 'New Chat';
}

// ===== Google Drive Sync =====
function getGoogleAccessToken() {
    try {
        return localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
    } catch (err) {
        return null;
    }
}

function setGoogleAccessToken(token) {
    try {
        if (token) {
            localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, token);
            googleAccessToken = token;
        }
    } catch (err) {
        console.error('Error saving access token:', err);
    }
}

async function createDriveFolder(folderName = 'AI Chat Backups') {
    const token = getGoogleAccessToken();
    if (!token) return null;

    try {
        const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&q=name%3D"AI%20Chat%20Backups"%20and%20trashed%3Dfalse', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            driveFolderId = data.files[0].id;
            localStorage.setItem(GOOGLE_DRIVE_FOLDER_ID_KEY, driveFolderId);
            return driveFolderId;
        }

        // Create new folder if doesn't exist
        const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });

        const newFolder = await createResp.json();
        if (newFolder.id) {
            driveFolderId = newFolder.id;
            localStorage.setItem(GOOGLE_DRIVE_FOLDER_ID_KEY, driveFolderId);
            return driveFolderId;
        }
    } catch (err) {
        console.error('Error creating Drive folder:', err);
    }
    return null;
}

async function saveChatsToDrive() {
    const token = getGoogleAccessToken();
    if (!token || chats.length === 0) return;

    if (!driveFolderId) {
        await createDriveFolder();
    }
    if (!driveFolderId) return;

    try {
        const chatsData = {
            chats,
            currentChatId,
            savedAt: new Date().toISOString(),
            version: '1.0'
        };

        const fileName = `ai-chats-${new Date().toISOString().split('T')[0]}.json`;

        // Check if file exists
        const searchResp = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=1&q=name%3D"${fileName}"%20and%20parent%3D"${driveFolderId}"%20and%20trashed%3Dfalse`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const searchData = await searchResp.json();
        const fileId = searchData.files?.[0]?.id;

        if (fileId) {
            // Update existing file
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chatsData)
            });
        } else {
            // Create new file
            const metadata = {
                name: fileName,
                parents: [driveFolderId],
                mimeType: 'application/json'
            };

            const multipartBody = new FormData();
            multipartBody.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            multipartBody.append('file', new Blob([JSON.stringify(chatsData)], { type: 'application/json' }));

            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: multipartBody
            });
        }

        console.log('✅ Chats synced to Google Drive');
    } catch (err) {
        console.error('Error saving to Drive:', err);
    }
}

// ===== UI Rendering =====
function renderSidebar() {
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '';

    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;

        item.innerHTML = `
            <div class="chat-item-title">${escapeHtml(chat.title)}</div>
            <div class="chat-item-actions">
                <button class="chat-item-btn delete-btn" data-id="${chat.id}" title="Delete">✕</button>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                switchChat(chat.id);
            }
        });

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this chat?')) {
                deleteChat(chat.id);
            }
        });

        // Double-click to rename
        item.addEventListener('dblclick', (e) => {
            if (!e.target.closest('.delete-btn')) {
                const newTitle = prompt('Rename chat:', chat.title);
                if (newTitle && newTitle.trim()) {
                    renameChat(chat.id, newTitle.trim());
                }
            }
        });

        chatList.appendChild(item);
    });
}

function renderChatUI() {
    const messagesEl = document.getElementById('messages');
    const chat = getCurrentChat();

    if (!chat) {
        // Show welcome screen for new blank chat
        messagesEl.innerHTML = `
            <div class="welcome">
                <h2>Welcome to AI Chat</h2>
                <p>Ask me anything! I'll respond with thoughtful answers.</p>
            </div>
        `;
        renderSidebar();
        return;
    }

    if (chat.messages.length === 0) {
        messagesEl.innerHTML = `
            <div class="welcome">
                <h2>Welcome to AI Chat</h2>
                <p>Ask me anything! I'll respond with thoughtful answers.</p>
            </div>
        `;
    } else {
        messagesEl.innerHTML = '';
        chat.messages.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`;
            msgEl.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
            messagesEl.appendChild(msgEl);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    renderSidebar();
}

// ===== Google Auth Helpers =====
function getStoredGoogleUser() {
    try {
        const raw = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
}

function storeGoogleUser(user) {
    if (!user) return;
    localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredGoogleUser() {
    localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
}

function extractProfileFromCredential(credential) {
    if (!credential) return null;
    try {
        const payload = credential.split('.')[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = decodeURIComponent(atob(base64)
            .split('')
            .map(char => `%${('00' + char.charCodeAt(0).toString(16)).slice(-2)}`)
            .join(''));
        return JSON.parse(decoded);
    } catch (err) {
        return null;
    }
}

function updateAuthStatus(user) {
    const status = document.getElementById('auth-status') || document.querySelector('[id*="auth"]');
    if (status && user) {
        status.textContent = `Signed in • ${user.name}`;
        status.style.color = 'var(--accent)';
    } else if (status) {
        status.textContent = 'Signed out';
        status.style.color = 'var(--muted)';
    }
}

// ===== Model Loading =====
async function initializeModel() {
    const statusEl = document.getElementById('model-status');
    try {
        statusEl.textContent = '⏳ Downloading model (first time only)...';

        const { pipeline: transformersPipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');

        pipeline = await transformersPipeline('text-generation', 'Xenova/distilgpt2', {
            quantized: true,
        });

        modelReady = true;
        statusEl.textContent = '✅ Model ready! Start chatting.';
        statusEl.style.color = 'var(--accent)';

        // Enable input
        document.getElementById('message-input').disabled = false;
        document.getElementById('send-button').disabled = false;
    } catch (error) {
        console.error('Model load error:', error);
        statusEl.textContent = '❌ Error loading model. Please refresh.';
        statusEl.style.color = 'var(--danger)';
    }
}

// ===== Message Handling =====
async function sendMessage(text) {
    if (!modelReady || !text.trim()) return;

    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-button');

    // Create new chat if this is the first message
    if (!currentChatId) {
        createNewChat();
        renderChatUI();
    }

    const chat = getCurrentChat();
    if (!chat) return;

    // Remove welcome message on first message
    const welcome = messagesEl.querySelector('.welcome');
    if (welcome) welcome.remove();

    // Add user message to DOM
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'message user-message';
    userMsgEl.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(userMsgEl);

    // Add to chat
    chat.messages.push({
        role: 'user',
        content: text
    });

    // Auto-rename chat on first message if still "New Chat"
    if (chat.messages.length === 1) {
        chat.title = generateChatTitle(chat.messages);
    }

    chat.updatedAt = new Date().toISOString();
    saveChatsToStorage();

    // Disable input while generating
    inputEl.disabled = true;
    sendBtn.disabled = true;

    try {
        // Build context from last 5 message pairs
        const relevantMessages = chat.messages.slice(-10);
        const context = relevantMessages
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const prompt = `${SYSTEM_PROMPT}\n\n${context}\nAssistant:`;

        // Generate response
        const result = await pipeline(prompt, {
            max_new_tokens: 100,
            temperature: 0.7,
            top_k: 50,
            top_p: 0.95,
            repetition_penalty: 1.2,
            num_beams: 1,
            do_sample: true,
        });

        let aiResponse = result[0].generated_text
            .substring(prompt.length)
            .trim()
            .split('\n')[0];

        // Clean up response
        aiResponse = aiResponse
            .replace(/User:.*$/s, '')
            .replace(/Assistant:.*$/s, '')
            .trim();

        if (aiResponse.length > 200) {
            aiResponse = aiResponse.substring(0, 200) + '...';
        }

        // Add AI message to DOM
        const aiMsgEl = document.createElement('div');
        aiMsgEl.className = 'message ai-message';
        aiMsgEl.innerHTML = `<div class="message-content">${escapeHtml(aiResponse)}</div>`;
        messagesEl.appendChild(aiMsgEl);

        // Add to chat
        chat.messages.push({
            role: 'assistant',
            content: aiResponse
        });

        chat.updatedAt = new Date().toISOString();
        saveChatsToStorage();

        // Scroll to bottom
        messagesEl.scrollTop = messagesEl.scrollHeight;

    } catch (error) {
        console.error('Generation error:', error);
        const errMsgEl = document.createElement('div');
        errMsgEl.className = 'message ai-message error';
        errMsgEl.innerHTML = `<div class="message-content">Sorry, I encountered an error. Please try again.</div>`;
        messagesEl.appendChild(errMsgEl);
    } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.value = '';
        inputEl.focus();
        renderSidebar();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Load chats from storage
    loadChatsFromStorage();
    renderChatUI();

    // Initialize model
    initializeModel();

    // Render header and footer from HarithShell
    if (window.HarithShell) {
        HarithShell.renderHeader({
            target: '#sharedHeader',
            navLinks: [
                { label: 'Home', href: '/' },
                { label: 'Chat', href: '/chat/' },
                { label: 'AI', href: '/ai/' }
            ]
        });

        HarithShell.renderFooter({
            target: '#sharedFooter',
            links: [
                { label: 'Privacy Policy', href: '/privacy/' },
                { label: 'Terms of Service', href: '/terms/' }
            ]
        });
    }

    // New chat button
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        openNewBlankChat();
        document.getElementById('message-input').focus();
    });

    // Form submission
    document.getElementById('message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('message-input').value;
        if (text.trim()) {
            sendMessage(text);
        }
    });

    // Handle Google Sign In from header
    window.handleGoogleSignIn = function (credential) {
        const profile = extractProfileFromCredential(credential);
        if (profile) {
            storeGoogleUser(profile);
            updateAuthStatus(profile);
            
            // Initialize Google Drive access
            initializeGoogleDriveAccess();
        }
    };

    // Initialize Google API and request Drive access
    window.initializeGoogleDriveAccess = async function () {
        try {
            // Use gapi.client to get access token
            if (window.gapi && window.gapi.auth2) {
                const auth2 = window.gapi.auth2.getAuthInstance();
                if (auth2 && auth2.isSignedIn.get()) {
                    const user = auth2.currentUser.get();
                    const authResponse = user.getAuthResponse();
                    if (authResponse.access_token) {
                        setGoogleAccessToken(authResponse.access_token);
                        driveFolderId = localStorage.getItem(GOOGLE_DRIVE_FOLDER_ID_KEY);
                        console.log('✅ Google Drive access authorized');
                    }
                }
            }
        } catch (err) {
            console.log('Drive access not available, using localStorage only');
        }
    };

    // Handle logout from header
    window.addEventListener('harith-logout', () => {
        clearStoredGoogleUser();
        googleAccessToken = null;
        updateAuthStatus(null);
    });

    // Restore auth status on page load
    const user = getStoredGoogleUser();
    if (user) {
        updateAuthStatus(user);
        // Try to restore Drive access
        googleAccessToken = getGoogleAccessToken();
        driveFolderId = localStorage.getItem(GOOGLE_DRIVE_FOLDER_ID_KEY);
    }
});
