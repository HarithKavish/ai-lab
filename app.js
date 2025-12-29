// ===== Configuration =====
const GOOGLE_CLIENT_ID = '59648450302-sqkk4pdujkt4hrm0uuhq95pq55b4jg2k.apps.googleusercontent.com';
const GOOGLE_USER_STORAGE_KEY = 'harith_google_user';
const CHATS_STORAGE_KEY = 'ai_chats_data';
const GOOGLE_ACCESS_TOKEN_KEY = 'google_access_token';
const GOOGLE_DRIVE_FOLDER_ID_KEY = 'google_drive_ai_folder_id';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const SYSTEM_PROMPT = "You are a helpful, friendly AI assistant. Provide concise and thoughtful answers.";

// ===== Global State =====
let pipeline = null;
let modelReady = false;
let chats = [];
let currentChatId = null;
let googleAccessToken = null;
let driveFolderId = null;
let driveStatus = 'idle'; // idle, syncing, online, error
let googleButtonRetries = 0;

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
}

async function createNewChat() {
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
    // Sync to Drive if logged in - AWAIT to prevent data loss on logout
    if (googleAccessToken) {
        await syncChatsToDrive().catch(err => console.warn('Drive sync failed:', err));
    }
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
    currentChatId = null;
    renderChatUI();
    renderSidebar();
}

async function deleteChat(chatId) {
    chats = chats.filter(chat => chat.id !== chatId);
    if (currentChatId === chatId) {
        if (chats.length > 0) {
            currentChatId = chats[0].id;
        } else {
            currentChatId = null;
        }
    }
    saveChatsToStorage();
    // Await sync to prevent data loss on logout
    if (googleAccessToken) {
        await syncChatsToDrive().catch(err => console.warn('Drive sync failed:', err));
    }
    renderChatUI();
}

async function renameChat(chatId, newTitle) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.title = newTitle;
        chat.updatedAt = new Date().toISOString();
        saveChatsToStorage();
        // Await sync to prevent data loss on logout
        if (googleAccessToken) {
            await syncChatsToDrive().catch(err => console.warn('Drive sync failed:', err));
        }
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
function getStoredGoogleUser() {
    try {
        const raw = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.warn('Failed to parse stored Google user', err);
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

function renderSignedInButton(user) {
    const googleButtonTarget = document.getElementById('googleSignInButton');
    if (!googleButtonTarget) return;
    googleButtonTarget.innerHTML = `
        <button type="button" class="signed-in-button" aria-label="Signed in as ${user.name}">
            <img src="${user.picture || 'https://www.gravatar.com/avatar/?d=mp'}" alt="${user.name} avatar"
                class="signed-in-button__avatar" loading="lazy" />
            <span class="signed-in-button__name">${user.name}</span>
        </button>`;
    const signInBtn = googleButtonTarget.querySelector('button');
    signInBtn?.addEventListener('click', () => {
        clearStoredGoogleUser();
        initGoogleSignInButton();
    });
}

function handleGoogleCredentialResponse(credentialResponse) {
    console.log('Google OAuth credential response', credentialResponse);
    const profile = extractProfileFromCredential(credentialResponse?.credential);
    const user = {
        name: profile?.name || 'Signed in',
        picture: profile?.picture || '',
        email: profile?.email || ''
    };
    storeGoogleUser(user);
    renderSignedInButton(user);
    updateAuthStatus(user);
    // Initialize Drive sync after sign in
    initializeGoogleDriveAccess(user);
}

function initGoogleSignInButton() {
    const googleButtonTarget = document.getElementById('googleSignInButton');
    if (!googleButtonTarget) {
        return;
    }
    const storedProfile = getStoredGoogleUser();
    if (storedProfile) {
        renderSignedInButton(storedProfile);
        return;
    }
    if (!window.google?.accounts?.id) {
        if (googleButtonRetries < 6) {
            googleButtonRetries += 1;
            window.setTimeout(initGoogleSignInButton, 250);
        }
        return;
    }
    googleButtonTarget.innerHTML = '';
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse
    });
    google.accounts.id.renderButton(
        googleButtonTarget,
        {
            theme: 'outline',
            size: 'medium',
            type: 'standard',
            shape: 'pill'
        }
    );
    googleButtonTarget.dataset.initialized = 'true';
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
        console.warn('Failed to decode Google credential', err);
        return null;
    }
}

async function getGoogleAccessToken() {
    if (googleAccessToken) return googleAccessToken;
    const stored = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
    if (stored) {
        googleAccessToken = stored;
        return stored;
    }
    return null;
}

function setGoogleAccessToken(token) {
    googleAccessToken = token;
    if (token) {
        localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    }
}

async function createDriveFolder() {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('No access token');

    // First, try to find existing folder
    try {
        const searchResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="AI Chat Backups"&fields=files(id)',
            {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
            driveFolderId = searchData.files[0].id;
            localStorage.setItem(GOOGLE_DRIVE_FOLDER_ID_KEY, driveFolderId);
            return driveFolderId;
        }
    } catch (err) {
        console.warn('Failed to search for existing folder:', err);
    }

    // Create new folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'AI Chat Backups',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['appDataFolder']
        })
    });

    const createData = await createResponse.json();
    if (createData.id) {
        driveFolderId = createData.id;
        localStorage.setItem(GOOGLE_DRIVE_FOLDER_ID_KEY, driveFolderId);
        return driveFolderId;
    }
    throw new Error('Failed to create Drive folder');
}

async function syncChatsToDrive() {
    if (!googleAccessToken) return;

    try {
        setDriveStatus('syncing');
        const token = await getGoogleAccessToken();
        if (!token) {
            setDriveStatus('error');
            return;
        }

        // Ensure folder exists
        if (!driveFolderId) {
            driveFolderId = localStorage.getItem(GOOGLE_DRIVE_FOLDER_ID_KEY);
            if (!driveFolderId) {
                await createDriveFolder();
            }
        }

        const fileName = `ai-chats-${new Date().toISOString().split('T')[0]}.json`;
        const fileContent = {
            chats,
            currentChatId,
            savedAt: new Date().toISOString(),
            version: 1
        };

        // Search for today's file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="${fileName}"&fields=files(id)`,
            {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        const searchData = await searchResponse.json();
        let fileId = searchData.files?.[0]?.id;

        if (fileId) {
            // Update existing file
            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fileContent)
            });
        } else {
            // Create new file
            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: createMultipartBody({
                    name: fileName,
                    parents: [driveFolderId]
                }, fileContent)
            });

            const createData = await createResponse.json();
            fileId = createData.id;
        }

        setDriveStatus('online');
    } catch (err) {
        console.error('Drive sync failed:', err);
        setDriveStatus('error');
    }
}

function createMultipartBody(metadata, content) {
    const boundary = '===============7330845974216740156==';
    const crlf = '\r\n';
    const parts = [];

    parts.push(`--${boundary}${crlf}`);
    parts.push(`Content-Type: application/json; charset=UTF-8${crlf}${crlf}`);
    parts.push(JSON.stringify(metadata));
    parts.push(`${crlf}--${boundary}${crlf}`);
    parts.push(`Content-Type: application/json${crlf}${crlf}`);
    parts.push(JSON.stringify(content));
    parts.push(`${crlf}--${boundary}--${crlf}`);

    return parts.join('');
}

async function loadChatsFromDrive() {
    if (!googleAccessToken) return null;

    try {
        const token = await getGoogleAccessToken();
        const today = new Date().toISOString().split('T')[0];
        const fileName = `ai-chats-${today}.json`;

        // Ensure folder exists
        if (!driveFolderId) {
            driveFolderId = localStorage.getItem(GOOGLE_DRIVE_FOLDER_ID_KEY);
            if (!driveFolderId) {
                await createDriveFolder();
            }
        }

        // Search for today's file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="${fileName}"&fields=files(id)`,
            {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        const searchData = await searchResponse.json();
        const fileId = searchData.files?.[0]?.id;

        if (!fileId) return null;

        // Download file
        const downloadResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (downloadResponse.ok) {
            return await downloadResponse.json();
        }
        return null;
    } catch (err) {
        console.error('Failed to load chats from Drive:', err);
        return null;
    }
}

function setDriveStatus(status) {
    driveStatus = status;
    updateAuthStatus();
}

// ===== UI Rendering =====
function renderSidebar() {
    const sidebarEl = document.getElementById('chat-list');
    if (!sidebarEl) return;

    sidebarEl.innerHTML = '';
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `
            <span class="chat-title">${escapeHtml(chat.title)}</span>
            <button class="delete-btn" data-chat-id="${chat.id}">✕</button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            switchChat(chat.id);
        });

        // Double-click to rename
        item.addEventListener('dblclick', () => {
            const newTitle = prompt('Rename chat:', chat.title);
            if (newTitle && newTitle.trim()) {
                renameChat(chat.id, newTitle.trim());
            }
        });

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${chat.title}"?`)) {
                deleteChat(chat.id);
            }
        });

        sidebarEl.appendChild(item);
    });
}

function renderChatUI() {
    const messagesEl = document.getElementById('messages');
    const formEl = document.getElementById('message-form');
    if (!messagesEl) return;

    messagesEl.innerHTML = '';

    const chat = getCurrentChat();
    if (!chat) {
        messagesEl.innerHTML = `
            <div class="welcome">
                <h2>Welcome to AI Chat</h2>
                <p>Start a new conversation to begin chatting with AI Assistant!</p>
            </div>
        `;
        return;
    }

    if (chat.messages.length === 0) {
        messagesEl.innerHTML = `
            <div class="welcome">
                <h2>Start chatting</h2>
                <p>Ask me anything!</p>
            </div>
        `;
    } else {
        chat.messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `message ${msg.role}`;
            bubble.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
            messagesEl.appendChild(bubble);
        });
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
    renderSidebar();
}

function updateAuthStatus(user) {
    const authStatusEl = document.getElementById('auth-status');
    const syncStatusEl = document.getElementById('sync-status');
    if (!authStatusEl) return;

    const storedUser = getStoredGoogleUser();
    if (!storedUser) {
        authStatusEl.textContent = 'Not signed in';
        if (syncStatusEl) syncStatusEl.style.display = 'none';
    } else {
        if (!googleAccessToken) {
            authStatusEl.textContent = `Signed in • Drive idle`;
        } else {
            const statusText = driveStatus === 'syncing' ? 'syncing...' :
                driveStatus === 'online' ? 'synced' :
                    driveStatus === 'error' ? 'sync error' : 'idle';
            authStatusEl.textContent = `Signed in • Drive ${statusText}`;
            if (syncStatusEl && driveStatus === 'syncing') {
                syncStatusEl.style.display = 'inline';
            } else if (syncStatusEl) {
                syncStatusEl.style.display = 'none';
            }
        }
    }
}

// ===== Google Drive Access =====
async function initializeGoogleDriveAccess(user) {
    try {
        if (!window.google?.accounts?.oauth2) {
            console.debug('Google OAuth2 not available');
            setDriveStatus('idle');
            return;
        }

        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: DRIVE_SCOPE,
            callback: async (tokenResponse) => {
                if (tokenResponse.access_token) {
                    setGoogleAccessToken(tokenResponse.access_token);
                    setDriveStatus('syncing');
                    localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, tokenResponse.access_token);

                    try {
                        // Load chats from Drive
                        const driveData = await loadChatsFromDrive();
                        if (driveData && driveData.chats && driveData.chats.length > 0) {
                            console.log('Loaded chats from Drive:', driveData.chats.length);
                            chats = driveData.chats;
                            currentChatId = driveData.currentChatId;
                            saveChatsToStorage();
                            renderChatUI();
                            renderSidebar();
                            setDriveStatus('online');
                        } else {
                            console.log('No chats found on Drive, keeping local data');
                            setDriveStatus('online');
                        }
                    } catch (driveErr) {
                        console.warn('Failed to load from Drive, using local storage:', driveErr);
                        loadChatsFromStorage();
                        renderChatUI();
                        renderSidebar();
                        setDriveStatus('online');
                    }
                    updateAuthStatus(user);
                }
            }
        });

        // Request token with consent
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
        console.debug('Drive access error:', err);
        setDriveStatus('idle');
    }
}

// ===== Model Loading =====
async function initializeModel() {
    const statusEl = document.getElementById('model-status');
    if (!statusEl) return;

    try {
        statusEl.textContent = 'Downloading model...';
        const { pipeline: p } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');

        pipeline = await p('text-generation', 'Xenova/distilgpt2', {
            progress_callback: (status) => {
                if (status.status === 'downloading') {
                    const percent = Math.round((status.progress || 0) * 100);
                    statusEl.textContent = `Loading... ${percent}%`;
                }
            }
        });

        modelReady = true;
        statusEl.textContent = 'Ready';
        setTimeout(() => statusEl.style.display = 'none', 2000);
    } catch (err) {
        console.error('Model init failed:', err);
        statusEl.textContent = 'Model failed to load';
    }
}

// ===== Message Handling =====
async function sendMessage(text) {
    if (!modelReady) {
        alert('AI model is still loading...');
        return;
    }

    // Create chat if this is the first message
    if (!currentChatId) {
        createNewChat();
    }

    const chat = getCurrentChat();
    if (!chat) return;

    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('message-input');
    const sendBtn = document.querySelector('#message-form button[type="submit"]');

    // Add user message
    chat.messages.push({ role: 'user', content: text });

    // Render user message
    const userBubble = document.createElement('div');
    userBubble.className = 'message user';
    userBubble.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(userBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Auto-name chat from first message
    if (chat.messages.length === 1) {
        chat.title = generateChatTitle([{ role: 'user', content: text }]);
    }

    // Save to storage - await sync to prevent data loss on logout
    saveChatsToStorage();
    if (googleAccessToken) {
        await syncChatsToDrive().catch(err => console.warn('Drive sync failed:', err));
    }

    inputEl.disabled = true;
    sendBtn.disabled = true;

    try {
        // Build context from last 10 messages
        const contextMessages = chat.messages.slice(-10);
        const contextText = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        const prompt = `${SYSTEM_PROMPT}\n\nContext:\n${contextText}\n\nAssistant:`;

        // Generate response
        const results = await pipeline(prompt, {
            max_new_tokens: 100,
            temperature: 0.7,
            do_sample: true
        });

        let aiResponse = results[0]?.generated_text || 'Sorry, I could not generate a response.';

        // Extract only the new generated text (remove prompt)
        if (aiResponse.includes('Assistant:')) {
            aiResponse = aiResponse.split('Assistant:').pop().trim();
        }

        // Add AI message
        chat.messages.push({ role: 'assistant', content: aiResponse });

        // Render AI message
        const aiBubble = document.createElement('div');
        aiBubble.className = 'message assistant';
        aiBubble.innerHTML = `<div class="message-content">${escapeHtml(aiResponse)}</div>`;
        messagesEl.appendChild(aiBubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Save to storage - await sync to prevent data loss on logout
        saveChatsToStorage();
        if (googleAccessToken) {
            await syncChatsToDrive().catch(err => console.warn('Drive sync failed:', err));
        }
        renderSidebar();

    } catch (err) {
        console.error('AI generation error:', err);
        const errMsgEl = document.createElement('div');
        errMsgEl.className = 'message error';
        errMsgEl.innerHTML = `<div class="message-content">Sorry, I encountered an error. Please try again.</div>`;
        messagesEl.appendChild(errMsgEl);
    } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.value = '';
        inputEl.focus();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Restore user session
    const storedUser = getStoredGoogleUser();
    if (storedUser) {
        // User is signed in - load their chats
        googleAccessToken = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
        driveFolderId = localStorage.getItem(GOOGLE_DRIVE_FOLDER_ID_KEY);
        if (googleAccessToken) {
            setDriveStatus('online');
            loadChatsFromDrive().then(driveData => {
                if (driveData && driveData.chats) {
                    chats = driveData.chats;
                    currentChatId = driveData.currentChatId;
                } else {
                    loadChatsFromStorage();
                }
                renderChatUI();
                renderSidebar();
                updateAuthStatus(storedUser);
            }).catch(() => {
                loadChatsFromStorage();
                renderChatUI();
                renderSidebar();
                updateAuthStatus(storedUser);
            });
        } else {
            loadChatsFromStorage();
            renderChatUI();
            renderSidebar();
            updateAuthStatus(storedUser);
        }
    } else {
        // User is NOT signed in - clear all chats and show welcome
        chats = [];
        currentChatId = null;
        localStorage.removeItem(CHATS_STORAGE_KEY);
        renderChatUI();
        renderSidebar();
        updateAuthStatus(null);
    }

    // Initialize model
    initializeModel();

    // Render header and footer from HarithShell
    if (window.HarithShell) {
        HarithShell.renderHeader({
            target: '#sharedHeader',
            brand: {
                title: 'Harith Kavish',
                tagline: 'AI-Driven Systems Architect & Creative Director'
            }
        });
        HarithShell.renderFooter({
            target: '#sharedFooter',
            text: 'Harith Kavish'
        });
    }

    // Initialize Google Sign-In button
    initGoogleSignInButton();

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

    // Listen for sign-in from shared header
    window.addEventListener('storage', (event) => {
        if (event.key === GOOGLE_USER_STORAGE_KEY) {
            if (event.newValue) {
                const user = JSON.parse(event.newValue);
                initializeGoogleDriveAccess(user);
                updateAuthStatus(user);
            } else {
                // User logged out - clear ALL data
                handleLogout();
            }
        }
    });

    // Also check logout status periodically (fallback for same-tab logout)
    setInterval(() => {
        const isLoggedIn = getStoredGoogleUser() !== null;
        const hasLocalData = localStorage.getItem(CHATS_STORAGE_KEY) !== null;

        // If user logged out but we still have local data, clean it up
        if (!isLoggedIn && hasLocalData) {
            console.log('Detected logout via polling - cleaning up local data');
            handleLogout();
        }
    }, 2000); // Check every 2 seconds
});

function handleLogout() {
    googleAccessToken = null;
    setGoogleAccessToken(null);
    driveFolderId = null;
    driveStatus = 'idle';
    chats = [];
    currentChatId = null;

    // Clear ALL localStorage keys
    localStorage.removeItem(CHATS_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_DRIVE_FOLDER_ID_KEY);

    // Reset UI completely
    const messagesEl = document.getElementById('messages');
    const chatListEl = document.getElementById('chat-list');
    if (messagesEl) messagesEl.innerHTML = '';
    if (chatListEl) chatListEl.innerHTML = '';

    renderChatUI();
    renderSidebar();
    updateAuthStatus(null);

    console.log('User logged out - all data cleared');
}
