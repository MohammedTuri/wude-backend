console.log("Wude Engine: Online");

const API_URL = '/api'; 
const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1523824921871-d6f1a31951bc';

// Global state initialization
window.currentCountry = 'All';
window.selectedGender = 'woman';
window.currentUser = null;

// UI Functions (Available immediately)
window.toggleAuth = function(type) {
    console.log("toggleAuth call:", type);
    const regForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const tabReg = document.getElementById('tab-register');
    const tabLogin = document.getElementById('tab-login');
    const authTitle = document.getElementById('auth-title');

    if (type === 'register') {
        // Show Register
        if (regForm) regForm.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        if (authTitle) authTitle.innerText = 'Register';
        
        // Active Tab Style: Register
        if (tabReg) {
            tabReg.style.color = 'var(--rose-gold)';
            tabReg.style.borderBottom = '2px solid var(--rose-gold)';
        }
        if (tabLogin) {
            tabLogin.style.color = '#999';
            tabLogin.style.borderBottom = 'none';
        }
    } else {
        // Show Login
        if (regForm) regForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (authTitle) authTitle.innerText = 'Login';
        
        // Active Tab Style: Login
        if (tabLogin) {
            tabLogin.style.color = 'var(--rose-gold)';
            tabLogin.style.borderBottom = '2px solid var(--rose-gold)';
        }
        if (tabReg) {
            tabReg.style.color = '#999';
            tabReg.style.borderBottom = 'none';
        }
    }
}

async function handleAuth(event, type) {
    if (event) event.preventDefault();
    console.log(`Auth Triggered: ${type}`);
    
    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerText : '...';
    if (btn) btn.innerText = 'Verifying...';

    let payload;
    try {
        if (type === 'register') {
            const pass = document.getElementById('reg-pass').value;
            const confirmPass = document.getElementById('reg-pass-confirm').value;
            if (pass !== confirmPass) {
                alert("Passwords do not match.");
                if (btn) btn.innerText = originalText;
                return;
            }
            payload = {
                email: document.getElementById('reg-email').value.trim(),
                password: pass,
                full_name: document.getElementById('reg-name').value,
                location: document.getElementById('reg-location').value,
                age: parseInt(document.getElementById('reg-age').value) || 25,
                gender: document.getElementById('reg-gender').value,
                height: document.getElementById('reg-height').value,
                profession: document.getElementById('reg-profession').value,
                education: document.getElementById('reg-education').value,
                marital_status: document.getElementById('reg-marital').value,
                religion_practice: document.getElementById('reg-religion').value,
                marriage_timeline: document.getElementById('reg-timeline').value,
                children_plans: document.getElementById('reg-children').value,
                income: document.getElementById('reg-income').value,
                bio: document.getElementById('reg-bio').value,
                ethnicity: document.getElementById('reg-ethnicity').value,
                country_of_origin: document.getElementById('reg-country').value
            };
        } else {
            payload = {
                email: document.getElementById('login-email').value.trim(),
                password: document.getElementById('login-pass').value
            };
        }

        console.log("Sending payload:", payload);
        const response = await fetch('/api/' + type, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            if (btn) btn.innerText = originalText;
            return;
        }

        localStorage.setItem('wude_user', JSON.stringify(data));
        window.currentUser = data;
        
        // Transition
        document.documentElement.classList.add('app-mode');
        window.showFeed();

    } catch (err) {
        console.error("Auth Exception:", err);
        alert("Server connection lost. Please check if the backend is running.");
        if (btn) btn.innerText = originalText;
    }
}

window.handleAuth = handleAuth;

window.logout = function() {
    localStorage.removeItem('wude_user');
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    // Add Form Listeners
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAuth(e, 'login');
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAuth(e, 'register');
        });
    }

    const savedUser = localStorage.getItem('wude_user');
    if (savedUser) {
        try {
            window.currentUser = JSON.parse(savedUser);
            document.documentElement.classList.add('app-mode');
            window.showFeed();
        } catch (e) {
            localStorage.removeItem('wude_user');
        }
    }
});

function hideAllSections() {
    const sections = ['feed', 'discovery-view', 'chat-view', 'likes-view', 'photo-manager-view', 'notifications-view', 'assisted-view', 'settings-view'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    const hero = document.querySelector('.hero');
    if (hero) hero.style.display = 'none';

    // Clear active states on rail
    document.querySelectorAll('.rail-item').forEach(item => item.classList.remove('active'));
}

window.showFeed = function() {
    hideAllSections();
    const feed = document.getElementById('feed');
    if (feed) feed.style.display = 'block';
    
    // Within feed, show grid and filter, hide profile
    const profileView = document.getElementById('profile-view');
    const filterBar = document.getElementById('filter-bar');
    const feedGrid = document.querySelector('.feed-grid');
    
    if (profileView) profileView.style.display = 'none';
    if (filterBar) filterBar.style.display = 'flex';
    if (feedGrid) feedGrid.style.display = 'grid';
    
    const railFeed = document.getElementById('rail-feed');
    if (railFeed) railFeed.classList.add('active');

    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    const topNav = document.getElementById('top-nav');
    if (topNav) {
        const loginLink = document.getElementById('login-link');
        const logoutBtn = document.getElementById('logout-btn');
        if (loginLink) loginLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    }

    if (window.currentUser) {
        window.selectedGender = window.currentUser.gender;
    }
    loadProfiles();
}

window.showPhotoManager = function() {
    hideAllSections();
    document.getElementById('photo-manager-view').style.display = 'block';
    const railPhoto = document.getElementById('rail-photo');
    if (railPhoto) railPhoto.classList.add('active');
    loadUserPhotos();
}

async function loadUserPhotos() {
    const grid = document.getElementById('photo-gallery-grid');
    if (!grid) return;
    grid.innerHTML = 'Loading gallery...';

    // Real photo from currentUser
    const photos = [
        { url: window.currentUser.photo_url || DEFAULT_PHOTO, primary: true }
    ];

    let html = '';
    photos.forEach(p => {
        html += `
            <div style="position: relative; height: 200px; border-radius: 8px; overflow: hidden; border: 2px solid ${p.primary ? 'var(--primary)' : 'var(--border)'};">
                <img src="${p.url}" onerror="this.onerror=null; this.src=DEFAULT_PHOTO;" style="width: 100%; height: 100%; object-fit: cover;">
                ${p.primary ? '<div style="position: absolute; top: 10px; left: 10px; background: var(--primary); color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem;">Primary</div>' : ''}
            </div>
        `;
    });
    grid.innerHTML = html;
}

window.handlePhotoUpload = async function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('photo-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const btn = event.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Uploading...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch(`${API_URL}/users/${window.currentUser.id}/photo`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
        } else {
            // Update local user state
            window.currentUser.photo_url = data.photo_url;
            localStorage.setItem('wude_user', JSON.stringify(window.currentUser));
            alert("Profile picture updated successfully!");
            loadUserPhotos();
        }
    } catch (err) {
        console.error(err);
        alert("Photo upload failed.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        fileInput.value = '';
    }
}

async function loadProfiles() {
    const feedGrid = document.querySelector('.feed-grid');
    if (!feedGrid) return;
    feedGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: #999;">Seeking soulful connections...</div>';

    try {
        const url = `${API_URL}/profiles?gender=${window.selectedGender}&country=${window.currentCountry}`;
        const response = await fetch(url);
        const profiles = await response.json();
        
        let html = '';
        profiles.forEach((profile, index) => {
            html += `
                <div class="profile-card animate-up" style="animation-delay: ${index * 0.1}s; cursor: pointer;" onclick="openProfileModal(${profile.id})">
                    <div style="position: relative; overflow: hidden; height: 350px;">
                        <img src="${profile.photo_url || DEFAULT_PHOTO}" onerror="this.onerror=null; this.src=DEFAULT_PHOTO;" class="profile-img" style="height: 100%;">
                    </div>
                    <div class="profile-info" style="padding: 15px;">
                        <div class="profile-name" style="font-size: 1.3rem;">${profile.full_name}, ${profile.age}</div>
                        <div class="profile-meta">${profile.location}</div>
                    </div>
                </div>
            `;
        });
        feedGrid.innerHTML = html || '<div style="grid-column: 1/-1; padding: 40px; text-align:center; color:#999;">No results found.</div>';
    } catch (err) {
        console.error(err);
    }
}

window.showDiscovery = function(filters = {}) {
    hideAllSections();
    document.getElementById('discovery-view').style.display = 'block';
    const railDiscovery = document.getElementById('rail-discovery');
    if (railDiscovery) railDiscovery.classList.add('active');
    loadDiscoveryProfiles(filters);
}

async function loadDiscoveryProfiles(filters = {}) {
    const grid = document.getElementById('discovery-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: #999;">Searching the Discovery Hub...</div>';

    try {
        let url = `${API_URL}/profiles?gender=${window.selectedGender}`;
        for (const key in filters) {
            if (filters[key] && filters[key] !== 'All') {
                url += `&${key}=${encodeURIComponent(filters[key])}`;
            }
        }

        const response = await fetch(url);
        const profiles = await response.json();
        
        let html = '';
        profiles.forEach((profile, index) => {
            html += `
                <div class="profile-card animate-up" style="animation-delay: ${index * 0.1}s; cursor: pointer;" onclick="openProfileModal(${profile.id})">
                    <div style="position: relative; overflow: hidden; height: 300px;">
                        <img src="${profile.photo_url || DEFAULT_PHOTO}" onerror="this.onerror=null; this.src=DEFAULT_PHOTO;" class="profile-img" style="height: 100%;">
                        ${filters.sort === 'newest' ? '<div style="position: absolute; top: 10px; left: 10px; background: #2ecc71; color: white; padding: 2px 8px; border-radius: 20px; font-size: 0.7rem;">New</div>' : ''}
                        ${profile.is_premium ? '<div style="position: absolute; top: 10px; right: 10px; background: var(--rose-gold); color: white; padding: 2px 8px; border-radius: 20px; font-size: 0.7rem;"><i class="ph ph-crown"></i> Elite</div>' : ''}
                    </div>
                    <div class="profile-info" style="padding: 15px;">
                        <div class="profile-name" style="font-size: 1.2rem;">${profile.full_name}, ${profile.age}</div>
                        <div class="profile-meta">${profile.location}</div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html || '<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: #999;">No partners found matching these filters. Try broadening your search!</div>';
    } catch (err) {
        console.error(err);
    }
}

window.applyDiscoveryFilters = function() {
    const filters = {
        minAge: document.getElementById('exp-min-age').value,
        maxAge: document.getElementById('exp-max-age').value,
        country: document.getElementById('exp-country').value,
        maritalStatus: document.getElementById('exp-marital').value,
        religion: document.getElementById('exp-religion').value,
        education: document.getElementById('exp-education').value
    };
    loadDiscoveryProfiles(filters);
}

window.resetDiscoveryFilters = function() {
    document.getElementById('exp-min-age').value = '';
    document.getElementById('exp-max-age').value = '';
    document.getElementById('exp-country').value = '';
    document.getElementById('exp-marital').value = 'All';
    document.getElementById('exp-religion').value = 'All';
    document.getElementById('exp-education').value = 'All';
    loadDiscoveryProfiles();
}

window.showChat = function() {
    hideAllSections();
    document.getElementById('chat-view').style.display = 'block';
    const railChat = document.getElementById('rail-chat');
    if (railChat) railChat.classList.add('active');
    
    // Update Right Sidebar Profile
    const img = document.getElementById('chat-user-img');
    const name = document.getElementById('chat-user-name');
    const id = document.getElementById('chat-user-id');
    
    if (window.currentUser) {
        if (img) img.src = window.currentUser.photo_url || DEFAULT_PHOTO;
        if (name) name.innerText = window.currentUser.full_name;
        if (id) id.innerText = `Member ID: ${window.currentUser.id}419`;
    }

    loadConversations();
}

async function loadConversations() {
    const list = document.getElementById('conversations-list');
    if (!list) return;
    list.innerHTML = 'Loading conversations...';

    try {
        // Fetch mutual matches
        const response = await fetch(`${API_URL}/likes/${window.currentUser.id}?type=mutual`);
        const matches = await response.json();
        
        if (matches.length === 0) {
            list.innerHTML = '<div style="color: #999; font-size: 0.9rem;">No matches yet. Keep exploring to find your beloved!</div>';
            return;
        }

        let html = '';
        matches.forEach(chat => {
            html += `
                <div onclick="openChatPanel(${chat.id}, '${chat.full_name}', '${chat.photo_url || DEFAULT_PHOTO}')" style="display: flex; align-items: center; gap: 15px; padding: 15px; border-radius: 15px; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.background='#fcf8f9'" onmouseout="this.style.background='transparent'">
                    <div style="position: relative;">
                        <img src="${chat.photo_url || DEFAULT_PHOTO}" onerror="this.onerror=null; this.src='${DEFAULT_PHOTO}';" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="font-weight: 700; color: #333;">${chat.full_name}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">Click to open chat</div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (err) {
        console.error("Error loading conversations", err);
        list.innerHTML = '<div style="color: red; font-size: 0.9rem;">Failed to load conversations.</div>';
    }
}

window.currentChatMatchId = null;
window.chatPollInterval = null;
window.lastMessageCount = 0;

window.openChatPanel = function(matchId, matchName, matchPhoto) {
    window.currentChatMatchId = matchId;
    window.lastMessageCount = 0; // Reset for new chat
    
    document.getElementById('user-stats-panel').style.display = 'none';
    document.getElementById('active-chat-panel').style.display = 'flex';
    
    document.getElementById('active-chat-img').src = matchPhoto;
    document.getElementById('active-chat-name').innerText = matchName;
    document.getElementById('active-chat-messages').innerHTML = '<div style="text-align: center; color: #999; margin-top: 20px;">Loading...</div>';
    
    loadMessages();
    
    // Start polling for new messages every 3 seconds
    if (window.chatPollInterval) clearInterval(window.chatPollInterval);
    window.chatPollInterval = setInterval(loadMessages, 3000);
}

window.closeChatPanel = function() {
    if (window.chatPollInterval) {
        clearInterval(window.chatPollInterval);
        window.chatPollInterval = null;
    }
    window.currentChatMatchId = null;
    document.getElementById('user-stats-panel').style.display = 'block';
    document.getElementById('active-chat-panel').style.display = 'none';
}

async function loadMessages() {
    if (!window.currentChatMatchId || !window.currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/messages/${window.currentUser.id}/${window.currentChatMatchId}`);
        const messages = await response.json();
        
        const container = document.getElementById('active-chat-messages');
        if (messages.length === 0) {
            if (window.lastMessageCount !== 0 || container.innerHTML.includes('Loading...')) {
                container.innerHTML = '<div style="text-align: center; color: #999; margin-top: 20px;">Start the conversation!</div>';
                window.lastMessageCount = 0;
            }
            return;
        }

        // Only update UI if there are new messages
        if (messages.length === window.lastMessageCount) {
            return;
        }
        
        window.lastMessageCount = messages.length;

        let html = '';
        messages.forEach(msg => {
            const isMe = msg.sender_id === window.currentUser.id;
            html += `
                <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'};">
                    <div style="max-width: 70%; padding: 10px 15px; border-radius: 12px; background: ${isMe ? 'var(--primary)' : 'var(--bg-main)'}; color: ${isMe ? 'white' : 'var(--text-main)'}; font-size: 0.95rem; border: ${isMe ? 'none' : '1px solid var(--border)'};">
                        ${msg.content}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error("Failed to load messages", err);
        const container = document.getElementById('active-chat-messages');
        if (container) {
            container.innerHTML = `<div style="text-align: center; color: #e74c3c; margin-top: 20px;">
                Error loading messages.<br>
                Please ensure you have <b>Restarted the Backend Server</b> (Ctrl+C then node server.js).
            </div>`;
        }
    }
}

window.handleSendMessage = async function(event) {
    event.preventDefault();
    if (!window.currentChatMatchId || !window.currentUser) return;

    const input = document.getElementById('active-chat-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        input.disabled = true;
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: window.currentUser.id,
                receiverId: window.currentChatMatchId,
                content: content
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to send message');
        }
        
        input.value = '';
        loadMessages();
    } catch (err) {
        console.error("Failed to send message", err);
        alert(err.message);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

window.showNotifications = function() {
    hideAllSections();
    document.getElementById('notifications-view').style.display = 'block';
    const railNotif = document.getElementById('rail-notif');
    if (railNotif) railNotif.classList.add('active');
    loadFullNotifications();
}

function loadFullNotifications() {
    const list = document.getElementById('full-notifications-list');
    if (!list) return;
    
    const notes = [
        { text: 'Someone viewed your bio-data', time: '2 minutes ago', icon: 'ph-eye', desc: 'A potential match from London just viewed your full profile.' },
        { text: 'New mutual match found!', time: '1 hour ago', icon: 'ph-sparkle', desc: 'Congratulations! You and Sarah Ahmed have both liked each other.' },
        { text: 'Profile Verified', time: 'Yesterday', icon: 'ph-check-circle', desc: 'Your account has been successfully verified by our moderation team.' }
    ];

    let html = '';
    notes.forEach(n => {
        html += `
            <div style="display: flex; gap: 20px; padding: 20px; background: #fcf8f9; border-radius: 15px; border: 1px solid #eee;">
                <div style="background: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--rose-gold); font-size: 1.5rem; box-shadow: var(--shadow);">
                    <i class="ph ${n.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <h4 style="color: #333;">${n.text}</h4>
                        <span style="font-size: 0.8rem; color: #999;">${n.time}</span>
                    </div>
                    <p style="color: #666; font-size: 0.95rem;">${n.desc}</p>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

window.showAssistedService = function() {
    hideAllSections();
    document.getElementById('assisted-view').style.display = 'block';
    const railAssisted = document.getElementById('rail-assisted');
    if (railAssisted) railAssisted.classList.add('active');
}

window.handleAssistedRequest = function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    btn.innerText = 'Sending Request...';
    btn.disabled = true;

    setTimeout(() => {
        alert("Your matchmaking request has been sent! An expert will contact you soon.");
        btn.innerText = 'Request Sent ✓';
        event.target.reset();
    }, 2000);
}

window.showSettings = function() {
    hideAllSections();
    document.getElementById('settings-view').style.display = 'block';
    const railSettings = document.getElementById('rail-settings');
    if (railSettings) railSettings.classList.add('active');
    
    // Set initial values
    if (window.currentUser) {
        document.getElementById('setting-photo-private').checked = window.currentUser.photo_private || false;
    }
}

window.togglePrivacy = async function(field, value) {
    console.log(`Toggling ${field} to ${value}`);
    // Simulate API call
    window.currentUser[field] = value;
    localStorage.setItem('wude_user', JSON.stringify(window.currentUser));
    alert(`${field.replace('_', ' ')} updated successfully!`);
}

window.rejectLike = async function(profileId) {
    if (!window.currentUser) return;
    try {
        await fetch(`${API_URL}/like`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: window.currentUser.id, receiverId: profileId })
        });
        alert('Like rejected');
        // refresh likes view
        loadLikes('received');
    } catch (err) {
        console.error('Failed to reject like', err);
    }
};

window.handleDeleteAccount = function() {
    const confirmed = confirm("Are you absolutely sure? This will permanently delete your profile, matches, and message history. This cannot be undone.");
    if (confirmed) {
        alert("Account deletion request submitted. You will be logged out shortly.");
        logout();
    }
}

window.showLikes = function(type) {
    hideAllSections();
    document.getElementById('likes-view').style.display = 'block';
    const railLikes = document.getElementById('rail-likes');
    if (railLikes) railLikes.classList.add('active');
    
    // Active tab styling
    document.querySelectorAll('.chat-tab').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${type}`);
    if (activeTab) activeTab.classList.add('active');

    loadLikes(type);
}

async function loadLikes(type) {
    const grid = document.getElementById('likes-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: #999;">Loading your connections...</div>';

    try {
        const response = await fetch(`${API_URL}/likes/${window.currentUser.id}?type=${type}`);
        const likes = await response.json();

        if (likes.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: #999;">No ${type.replace('_', ' ')} yet. Keep exploring!</div>`;
            return;
        }

        let html = '';
        likes.forEach((profile, index) => {
            let actionButtons = '';
            if (type === 'mutual') {
                actionButtons = `<button class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 8px;" onclick="event.stopPropagation(); showChat(); setTimeout(()=>openChatPanel(${profile.id}, '${profile.full_name.replace(/'/g,"\\'")}', '${(profile.photo_url || '').replace(/'/g,"\\'")}' || DEFAULT_PHOTO), 300);">Start Chat</button>`;
            } else if (type === 'received') {
                actionButtons = `
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn btn-primary" style="flex: 1; padding: 8px;" onclick="event.stopPropagation(); likeUser(${profile.id})">Like Back</button>
                        <button class="btn btn-secondary" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none;" onclick="event.stopPropagation(); rejectLike(${profile.id})">Reject</button>
                    </div>
                `;
            }
            
            html += `
                <div class="profile-card animate-up" style="animation-delay: ${index * 0.1}s; cursor: pointer;" onclick="openProfileModal(${profile.id})">
                    <div style="position: relative; overflow: hidden; height: 300px;">
                        <img src="${profile.photo_url || DEFAULT_PHOTO}" onerror="this.onerror=null; this.src=DEFAULT_PHOTO;" class="profile-img" style="height: 100%;">
                        <div style="position: absolute; top: 15px; right: 15px; background: var(--primary); color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">
                            ${type === 'mutual' ? 'Matched ✨' : 'Interested'}
                        </div>
                    </div>
                    <div class="profile-info" style="padding: 15px;">
                        <div class="profile-name" style="font-size: 1.2rem;">${profile.full_name}, ${profile.age}</div>
                        <div class="profile-meta">${profile.location}</div>
                        ${actionButtons}
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (err) {
        console.error("Failed to load likes:", err);
        grid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: #999;">Failed to load connections.</div>';
    }
}

window.showToast = function(msg) {
    alert(msg);
}

window.showMyProfile = async function() {
    if (!window.currentUser) {
        alert("Please login to view your profile.");
        return;
    }

    hideAllSections();
    const feed = document.getElementById('feed');
    if (feed) feed.style.display = 'block';
    
    // Hide grid and filter, show profile
    const profileView = document.getElementById('profile-view');
    const filterBar = document.getElementById('filter-bar');
    const feedGrid = document.querySelector('.feed-grid');
    
    if (profileView) profileView.style.display = 'block';
    if (filterBar) filterBar.style.display = 'none';
    if (feedGrid) feedGrid.style.display = 'none';
    
    const railProfile = document.getElementById('rail-profile');
    if (railProfile) railProfile.classList.add('active');
    
    const container = document.getElementById('profile-container');
    container.innerHTML = '<div style="padding: 60px; text-align: center; color: #999;">Loading your bio-data...</div>';

    try {
        const response = await fetch(`${API_URL}/profiles/${window.currentUser.id}`);
        const user = await response.json();
        
        if (user.error) throw new Error(user.error);
        
        // Update local state if needed
        window.currentUser = { ...window.currentUser, ...user };

        container.innerHTML = `
        <div class="glass-card animate-up" style="max-width: 800px; margin: 0 auto 100px auto; padding: 40px; background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-md);">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 30px;">
                <div style="position: relative; cursor: pointer;" onclick="showPhotoManager()">
                    <img src="${user.photo_url || DEFAULT_PHOTO}" onerror="this.onerror=null; this.src=DEFAULT_PHOTO;" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary); transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="position: absolute; bottom: 5px; right: 5px; background: var(--primary); width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--surface); display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="ph ph-camera" style="font-size: 1rem;"></i>
                    </div>
                </div>
                <div>
                    <h2 style="font-size: 2.5rem; margin-bottom: 5px; color: var(--text-main);">${user.full_name}</h2>
                    <p style="color: var(--primary); font-weight: 600; font-size: 1.1rem;"><i class="ph ph-envelope"></i> ${user.email}</p>
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <span style="background: var(--bg-main); border: 1px solid var(--border); padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Verified Member</span>
                        <span style="background: var(--bg-main); border: 1px solid var(--border); padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Marriage Intent</span>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div style="background: var(--bg-main); border: 1px solid var(--border); padding: 25px; border-radius: 12px;">
                    <h3 style="margin-bottom: 20px; color: var(--primary); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em;"><i class="ph ph-info"></i> Basic Information</h3>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Location</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.location || 'Not specified'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Age</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.age || 'Not specified'} Years</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Gender</span>
                            <span style="font-weight: 600; text-transform: capitalize; color: var(--text-main);">${user.gender || 'Not specified'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Profession</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.profession || 'Not specified'}</span>
                        </div>
                    </div>
                </div>

                <div style="background: var(--bg-main); border: 1px solid var(--border); padding: 25px; border-radius: 12px;">
                    <h3 style="margin-bottom: 20px; color: var(--primary); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em;"><i class="ph ph-heart"></i> Personal Values</h3>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Education</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.education || 'Not specified'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Practice</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.religion_practice || 'Practicing'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Status</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.marital_status || 'Not specified'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Timeline</span>
                            <span style="font-weight: 600; color: var(--text-main);">${user.marriage_timeline || 'Within 1 year'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 30px; background: var(--bg-main); border: 1px solid var(--border); padding: 25px; border-radius: 12px;">
                <h3 style="margin-bottom: 10px; color: var(--text-main); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em;">About Me</h3>
                <p style="color: #666; line-height: 1.6;">${user.bio || "Searching for a lifelong partner who values tradition and family."}</p>
            </div>

            <div style="display: flex; gap: 15px; margin-top: 40px;">
                <button class="btn btn-primary" onclick="editMyProfile()" style="flex: 2; padding: 15px; font-size: 1.1rem;"><i class="ph ph-pencil"></i> Edit Full Profile</button>
                <button class="btn btn-secondary" onclick="showPhotoManager()" style="flex: 1; padding: 15px;"><i class="ph ph-camera"></i> Update Photos</button>
            </div>
        </div>
        `;
    } catch (err) {
        console.error("Profile Fetch Error:", err);
        if (err.message === "Profile not found") {
            alert("Your session has expired or your profile was removed. Please log in again.");
            logout();
        } else {
            container.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">Failed to load profile data: ${err.message}</div>`;
        }
    }
}

window.editMyProfile = function() {
    const user = window.currentUser;
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); padding: 20px;";
    
    overlay.innerHTML = `
        <div class="glass-card animate-up" style="background: var(--surface); padding: 30px; border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border); box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid var(--border); padding-bottom: 15px;">
                <h2 style="color: var(--text-main); margin: 0;"><i class="ph ph-pencil-line"></i> Edit Profile</h2>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
            
            <form id="full-edit-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">Full Name</label>
                        <input type="text" name="full_name" value="${user.full_name || ''}" class="form-input" required>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">Age</label>
                        <input type="number" name="age" value="${user.age || ''}" class="form-input" required min="18">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">Location (City, Country)</label>
                        <input type="text" name="location" value="${user.location || ''}" class="form-input" required>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">Profession</label>
                        <input type="text" name="profession" value="${user.profession || ''}" class="form-input" required>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">Marital Status</label>
                        <select name="marital_status" class="form-input">
                            <option value="Never Married" ${user.marital_status === 'Never Married' ? 'selected' : ''}>Never Married</option>
                            <option value="Divorced" ${user.marital_status === 'Divorced' ? 'selected' : ''}>Divorced</option>
                            <option value="Widowed" ${user.marital_status === 'Widowed' ? 'selected' : ''}>Widowed</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">Education</label>
                        <input type="text" name="education" value="${user.education || ''}" class="form-input">
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);">About Me / Bio</label>
                    <textarea name="bio" class="form-input" style="min-height: 120px; resize: vertical;">${user.bio || ''}</textarea>
                </div>

                <div style="display: flex; gap: 15px;">
                    <button type="button" onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex: 2; padding: 15px; font-size: 1.1rem;">Save All Changes</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#full-edit-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedData = Object.fromEntries(formData.entries());
        
        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Saving Profile...';
            submitBtn.disabled = true;

            const response = await fetch(`${API_URL}/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...user, ...updatedData })
            });
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);
            
            window.currentUser = result;
            localStorage.setItem('wude_user', JSON.stringify(window.currentUser));
            overlay.remove();
            alert("✨ Profile updated successfully!");
            showMyProfile();
        } catch (err) {
            console.error("Update error:", err);
            alert("Update failed: " + err.message);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };
};

window.openProfileModal = async function(id) {
    const modal = document.getElementById('profile-modal');
    const modalBody = document.getElementById('modal-body');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<div style="padding: 40px; text-align: center;">Loading...</div>';

    try {
        const response = await fetch(`${API_URL}/profiles/${id}`);
        const user = await response.json();
        
        if (user.error) {
            modalBody.innerHTML = `<div style="padding: 40px; text-align: center;">${user.error}</div>`;
            return;
        }

        modalBody.innerHTML = `
            <div style="display: flex; gap: 30px; margin-bottom: 20px;">
                <img src="${user.photo_url || DEFAULT_PHOTO}" onerror="this.onerror=null; this.src='${DEFAULT_PHOTO}';" style="width: 200px; height: 250px; object-fit: cover; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border);">
                <div style="flex: 1;">
                    <h2 style="font-size: 2rem; margin-bottom: 5px; color: var(--text-main);">${user.full_name}, ${user.age}</h2>
                    <p style="color: var(--primary); font-weight: 600; font-size: 1.1rem; margin-bottom: 15px;"><i class="ph ph-map-pin"></i> ${user.location}</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 0.95rem;">
                        <div><strong style="color: var(--text-muted);">Profession:</strong> ${user.profession || 'Not specified'}</div>
                        <div><strong style="color: var(--text-muted);">Education:</strong> ${user.education || 'Not specified'}</div>
                        <div><strong style="color: var(--text-muted);">Religion:</strong> ${user.religion_practice || 'Not specified'}</div>
                        <div><strong style="color: var(--text-muted);">Timeline:</strong> ${user.marriage_timeline || 'Not specified'}</div>
                        <div><strong style="color: var(--text-muted);">Height:</strong> ${user.height || 'Not specified'}</div>
                        <div><strong style="color: var(--text-muted);">Children:</strong> ${user.children_plans || 'Not specified'}</div>
                    </div>
                </div>
            </div>
            
            <div style="background: var(--bg-main); border: 1px solid var(--border); padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                <h3 style="margin-bottom: 10px; color: var(--primary); font-size: 1.2rem;">About Me</h3>
                <p style="color: var(--text-main); line-height: 1.6;">${user.bio || 'No bio provided.'}</p>
            </div>

            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="likeUser(${user.id})" style="flex: 2; padding: 15px; font-size: 1rem; min-width: 130px;"><i class="ph ph-heart"></i> Like & Connect</button>
                <button class="btn btn-primary" onclick="startDirectChatFromModal(${user.id}, '${(user.full_name || '').replace(/'/g,"\\'")}', '${(user.photo_url || '').replace(/'/g,"\\'")}')" style="flex: 1.5; padding: 15px; font-size: 1rem; background: #059669; border-color: #059669; min-width: 100px;"><i class="ph ph-chat-circle"></i> Chat</button>
                <button class="btn" onclick="rejectLike(${user.id})" style="flex: 1; padding: 15px; min-width: 80px; background: var(--danger); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Pass</button>
            </div>
        `;
    } catch (err) {
        modalBody.innerHTML = '<div style="padding: 40px; text-align: center;">Failed to load profile details.</div>';
    }
}

window.likeUser = async function(receiverId) {
    if (!window.currentUser) {
        alert("Please login to connect with members.");
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: window.currentUser.id, receiverId })
        });
        const data = await response.json();
        
        if (data.status === 'MATCHED') {
            alert("✨ IT'S A MATCH! You can now start a conversation.");
            closeModal();
            // Automatically show chat or mutual likes
            // window.showLikes('mutual');
        } else {
            alert("Interest sent! We'll let you know if they match back.");
            closeModal();
        }
    } catch (err) {
        console.error('Like failed:', err);
        alert("Failed to send interest. Please try again later.");
    }
}

window.closeModal = function() {
    document.getElementById('profile-modal').style.display = 'none';
}

window.startDirectChatFromModal = function(userId, userName, userPhoto) {
    closeModal();
    showChat();
    setTimeout(() => {
        openChatPanel(userId, userName, userPhoto || DEFAULT_PHOTO);
    }, 100);
}

window.showPhotoManager = function() {
    // Create a beautiful overlay modal
    const overlay = document.createElement('div');
    overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);";
    
    overlay.innerHTML = `
        <div class="glass-card animate-up" style="background: var(--surface); padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; width: 90%; border: 1px solid var(--border);">
            <i class="ph ph-image-square" style="font-size: 4rem; color: var(--primary); margin-bottom: 20px; display: block;"></i>
            <h2 style="margin-bottom: 10px; color: var(--text-main);">Upload Profile Photo</h2>
            <p style="color: var(--text-muted); margin-bottom: 30px;">Choose a clear photo of yourself. Max size 5MB.</p>
            
            <input type="file" id="photo-input" accept="image/*" style="display: none;">
            
            <label for="photo-input" style="display: block; background: var(--bg-main); border: 2px dashed var(--border); padding: 30px; border-radius: 12px; cursor: pointer; margin-bottom: 20px; transition: all 0.3s ease;" onmouseover="this.style.borderColor='var(--primary)'; this.style.background='rgba(183, 110, 48, 0.05)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='var(--bg-main)'">
                <i class="ph ph-cloud-arrow-up" style="font-size: 2rem; color: var(--primary);"></i>
                <span style="display: block; margin-top: 10px; font-weight: 600; color: var(--text-main);">Click to select photo</span>
            </label>
            
            <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()" style="width: 100%;">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const input = overlay.querySelector('#photo-input');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', window.currentUser.id);

        try {
            const container = overlay.querySelector('.glass-card');
            container.innerHTML = `
                <div style="padding: 40px;">
                    <i class="ph ph-spinner animate-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px; display: block;"></i>
                    <h2 style="color: var(--text-main);">Uploading to Cloudinary...</h2>
                    <p style="color: var(--text-muted);">Processing your beautiful photo</p>
                </div>
            `;
            
            const response = await fetch(`${API_URL}/upload-photo`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.success) {
                window.currentUser.photo_url = result.photo_url;
                localStorage.setItem('wude_user', JSON.stringify(window.currentUser));
                overlay.remove();
                alert("✨ Photo updated successfully!");
                showMyProfile();
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            alert("Upload failed: " + err.message);
            overlay.remove();
        }
    };
};

window.updateUploadLabel = function(input) {
    const labelText = document.getElementById('upload-label-text');
    const submitBtn = document.getElementById('photo-submit-btn');
    if (input.files && input.files[0]) {
        labelText.textContent = "Selected: " + input.files[0].name;
        labelText.style.color = "var(--primary)";
        submitBtn.style.display = "block";
    }
};

window.handlePhotoUpload = async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('photo-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('userId', window.currentUser.id);

    try {
        const submitBtn = document.getElementById('photo-submit-btn');
        submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Uploading to Cloudinary...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_URL}/upload-photo`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            window.currentUser.photo_url = result.photo_url;
            localStorage.setItem('wude_user', JSON.stringify(window.currentUser));
            alert("✨ Photo uploaded successfully!");
            showMyProfile(); // Refresh to show the new photo
        } else {
            throw new Error(result.error);
        }
    } catch (err) {
        alert("Upload failed: " + err.message);
        showMyProfile();
    }
};
