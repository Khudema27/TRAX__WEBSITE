// ==================== API CONFIGURATION ====================
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Tracked Shipments History (stored in localStorage)
let trackedShipmentsHistory = JSON.parse(localStorage.getItem('trackedShipmentsHistory') || '[]');

// ==================== API HELPER ====================
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `/api${endpoint}`;
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const options = {
        method,
        headers,
        body: data ? JSON.stringify(data) : null
    };
    
    try {
        console.log(`📡 API Call: ${method} ${url}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ API Error:', error);
        throw new Error(error.message || 'Failed to connect to server');
    }
}

// ==================== TRACKED SHIPMENTS HISTORY FUNCTIONS ====================
function saveTrackedShipment(trackingNumber, shipmentData) {
    const existingIndex = trackedShipmentsHistory.findIndex(s => s.trackingNumber === trackingNumber);
    
    const trackedEntry = {
        trackingNumber: trackingNumber,
        customerCNumber: shipmentData.customerCNumber || null,
        latestStatus: shipmentData.latestStatus,
        latestLocation: shipmentData.latestLocation,
        lastUpdate: shipmentData.lastUpdate,
        timestamp: new Date().toISOString(),
        data: shipmentData
    };
    
    if (existingIndex !== -1) {
        trackedShipmentsHistory[existingIndex] = trackedEntry;
    } else {
        trackedShipmentsHistory.unshift(trackedEntry);
    }
    
    if (trackedShipmentsHistory.length > 20) {
        trackedShipmentsHistory = trackedShipmentsHistory.slice(0, 20);
    }
    
    localStorage.setItem('trackedShipmentsHistory', JSON.stringify(trackedShipmentsHistory));
    console.log('✅ Saved to tracked history:', trackingNumber);
}

function getTrackedShipmentsHistory() {
    return trackedShipmentsHistory;
}

function clearTrackedHistory() {
    trackedShipmentsHistory = [];
    localStorage.setItem('trackedShipmentsHistory', JSON.stringify(trackedShipmentsHistory));
}

// ==================== PARTICLES ====================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 60; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 6 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = Math.random() * 15 + 8 + 's';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        container.appendChild(particle);
    }
}

// ==================== BACKGROUND ====================
function updateBackgroundForWelcome() {
    document.getElementById('dynamicBg').style.backgroundImage = "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format')";
}

function updateBackgroundForAuth() {
    document.getElementById('dynamicBg').style.backgroundImage = "url('https://images.unsplash.com/photo-1566576912321-d4a1ef2cf5e7?q=80&w=2069&auto=format')";
}

function updateBackgroundForDashboard() {
    document.getElementById('dynamicBg').style.backgroundImage = "url('https://images.unsplash.com/photo-1580679568899-8b7cdf224ab6?q=80&w=2044&auto=format')";
}

// ==================== SCREEN MANAGEMENT ====================
function showWelcome() {
    document.getElementById('welcomeScreen').classList.remove('hide');
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('dashboard').classList.remove('active');
    updateBackgroundForWelcome();
}

function showAuth() {
    document.getElementById('welcomeScreen').classList.add('hide');
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('dashboard').classList.remove('active');
    updateBackgroundForAuth();
}

function showAuthTab(tab) {
    showAuth();
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('loginForm')?.classList.toggle('active', tab === 'login');
    document.getElementById('signupForm')?.classList.toggle('active', tab === 'signup');
}

function showDashboard() {
    document.getElementById('welcomeScreen').classList.add('hide');
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    updateBackgroundForDashboard();
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        document.getElementById('userName').innerText = displayName;
        const avatarEl = document.getElementById('userAvatarInitial');
        if (avatarEl) avatarEl.innerText = displayName.charAt(0).toUpperCase();
    }
    loadDashboardContent();
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = 'error') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : '⚠️';
    const bgColor = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#f59e0b';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; background: white; padding: 16px 24px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border-left: 5px solid ${bgColor}; min-width: 300px; max-width: 500px;">
            <span style="font-size: 24px;">${icon}</span>
            <div>
                <div style="font-weight: 600; color: #1e293b; font-size: 15px;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; margin-left: auto;">&times;</button>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        z-index: 99999;
        animation: slideInRight 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        font-family: 'Inter', sans-serif;
    `;
    
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards';
            setTimeout(() => toast.remove(), 500);
        }
    }, 5000);
}

// ==================== AUTH ====================
async function signup(name, email, phone, password) {
    if (!name || !email || !phone || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const result = await apiRequest('/auth/signup', 'POST', { name, email, phone, password });
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showLoading(false);
        showToast(`Welcome ${name}! Account created successfully 🎉`, 'success');
        showDashboard();
    } catch (error) {
        showLoading(false);
        if (error.message.toLowerCase().includes('email already exists') || 
            error.message.toLowerCase().includes('duplicate') ||
            error.message.toLowerCase().includes('email already registered')) {
            showToast('This email is already registered. Please login instead.', 'error');
            setTimeout(() => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="login"]')?.classList.add('active');
                document.getElementById('loginForm')?.classList.add('active');
                document.getElementById('signupForm')?.classList.remove('active');
                const loginEmail = document.getElementById('loginEmail');
                if (loginEmail) loginEmail.value = email;
            }, 1000);
        } else {
            showToast(error.message || 'Signup failed. Please try again.', 'error');
        }
    }
}

async function login(email, password) {
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const result = await apiRequest('/auth/login', 'POST', { email, password });
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showLoading(false);
        showToast(`Welcome back, ${currentUser.name}! 👋`, 'success');
        showDashboard();
    } catch (error) {
        showLoading(false);
        if (error.message.toLowerCase().includes('invalid credentials') || 
            error.message.toLowerCase().includes('invalid email') ||
            error.message.toLowerCase().includes('user not found')) {
            showToast('Invalid email or password. Please try again.', 'error');
        } else {
            showToast(error.message || 'Login failed. Please try again.', 'error');
        }
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showWelcome();
    const welcomeInput = document.getElementById('welcomeTrackInput');
    if (welcomeInput) welcomeInput.value = '';
    const welcomeResult = document.getElementById('welcomeTrackResult');
    if (welcomeResult) welcomeResult.innerHTML = '';
    showToast('Logged out successfully', 'success');
}

// ==================== DASHBOARD ====================
async function loadDashboardContent() {
    const activePage = document.querySelector('.nav-btn.active').dataset.page;
    
    switch (activePage) {
        case 'profile': await loadProfilePage(); break;
        case 'track': loadTrackPage(); break;
        case 'shipments': await loadShipmentsPage(); break;
        case 'tracked': loadTrackedHistoryPage(); break;
        case 'contact': loadContactPage(); break;
        default: loadProfilePage();
    }
}

async function loadProfilePage() {
    const content = document.getElementById('dashboardContent');
    const initial = (currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase();
    try {
        content.innerHTML = `
            <div class="profile-banner-v2">
                <div class="profile-avatar">${initial}</div>
                <div class="profile-banner-info">
                    <h2>${escapeHtml(currentUser?.name || '')}</h2>
                    <p><i class="fas fa-envelope"></i> ${escapeHtml(currentUser?.email || '')}</p>
                    <span class="profile-banner-company">Route3 Logistics</span>
                </div>
                <span class="active-account-badge"><i class="fas fa-circle"></i> Active Account</span>
            </div>
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-title-block">
                        <h2>Account Details</h2>
                        <p>Manage your personal information</p>
                    </div>
                    <button onclick="editProfile()" class="edit-profile-btn">
                        <i class="fas fa-pen"></i> Edit Profile
                    </button>
                </div>
                <div class="profile-grid">
                    <div class="profile-field">
                        <label>Full Name</label>
                        <div class="input-icon-wrap">
                            <i class="fas fa-user"></i>
                            <input type="text" value="${escapeHtml(currentUser?.name || '')}" readonly>
                        </div>
                    </div>
                    <div class="profile-field">
                        <label>Email Address</label>
                        <div class="input-icon-wrap">
                            <i class="fas fa-envelope"></i>
                            <input type="email" value="${escapeHtml(currentUser?.email || '')}" readonly>
                        </div>
                    </div>
                    <div class="profile-field">
                        <label>Phone Number</label>
                        <div class="input-icon-wrap">
                            <i class="fas fa-phone"></i>
                            <input type="tel" value="${escapeHtml(currentUser?.phone || '')}" readonly>
                        </div>
                    </div>
                    <div class="profile-field">
                        <label>Company</label>
                        <div class="input-icon-wrap">
                            <i class="fas fa-building"></i>
                            <input type="text" value="Route3 Logistics" readonly>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="profile-card"><p style="color: #991b1b;">⚠️ Error: ${error.message}</p></div>`;
    }
}

async function editProfile() {
    const content = document.getElementById('dashboardContent');
    const initial = (currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase();
    try {
        content.innerHTML = `
            <div class="profile-banner-v2">
                <div class="profile-avatar">${initial}</div>
                <div class="profile-banner-info">
                    <h2>${escapeHtml(currentUser?.name || '')}</h2>
                    <p><i class="fas fa-envelope"></i> ${escapeHtml(currentUser?.email || '')}</p>
                    <span class="profile-banner-company">Route3 Logistics</span>
                </div>
                <span class="active-account-badge"><i class="fas fa-circle"></i> Active Account</span>
            </div>
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-title-block">
                        <h2>Edit Profile</h2>
                        <p>Update your personal information</p>
                    </div>
                    <button onclick="loadProfilePage()" class="edit-profile-btn cancel-btn">Cancel</button>
                </div>
                <form id="profileEditForm">
                    <div class="profile-grid">
                        <div class="profile-field">
                            <label>Full Name</label>
                            <div class="input-icon-wrap">
                                <i class="fas fa-user"></i>
                                <input type="text" id="editName" value="${escapeHtml(currentUser?.name || '')}" required>
                            </div>
                        </div>
                        <div class="profile-field">
                            <label>Email Address</label>
                            <div class="input-icon-wrap">
                                <i class="fas fa-envelope"></i>
                                <input type="email" id="editEmail" value="${escapeHtml(currentUser?.email || '')}" required>
                            </div>
                        </div>
                        <div class="profile-field">
                            <label>Phone Number</label>
                            <div class="input-icon-wrap">
                                <i class="fas fa-phone"></i>
                                <input type="tel" id="editPhone" value="${escapeHtml(currentUser?.phone || '')}" required>
                            </div>
                        </div>
                        <div class="profile-field">
                            <label>New Password (optional)</label>
                            <div class="input-icon-wrap">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="editPassword" placeholder="Min 6 characters">
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="btn-primary" style="margin-top: 20px; width: 100%;">Save Changes</button>
                </form>
            </div>
        `;
        document.getElementById('profileEditForm').addEventListener('submit', saveProfileChanges);
    } catch (error) {
        content.innerHTML = `<div class="profile-card"><p>Error: ${error.message}</p></div>`;
    }
}

async function saveProfileChanges(e) {
    e.preventDefault();
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const password = document.getElementById('editPassword').value;
    
    if (!name || !email || !phone) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const updateData = { name, email, phone };
        if (password && password.length >= 6) updateData.password = password;
        
        const result = await apiRequest('/auth/update-profile', 'PUT', updateData);
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('userName').innerText = currentUser.name;
        const avatarEl = document.getElementById('userAvatarInitial');
        if (avatarEl) avatarEl.innerText = (currentUser.name || '').charAt(0).toUpperCase();
        showToast('Profile updated successfully! ✅', 'success');
        loadProfilePage();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function loadTrackPage() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="track-form">
            <div class="track-hero-icon"><i class="fas fa-location-dot"></i></div>
            <h3>Live Tracking</h3>
            <p>Enter your Tracking ID or Customer C/N for real-time updates</p>
            <div class="track-input-group">
                <input type="text" id="trackingInput" placeholder="Enter tracking ID (e.g. TRX8112093623)">
                <button onclick="trackShipment()"><i class="fas fa-location-dot"></i> Track</button>
            </div>
        </div>
        <div id="trackingResult"></div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== PROFESSIONAL TRACKING DISPLAY (WITH C/N NUMBER) ====================
function displayTrackingInfo(shipment, resultDiv) {
    const sortedTimeline = [...(shipment.timeline || [])].sort((a, b) => 
        new Date(a.rawTimeForSort || a.date) - new Date(b.rawTimeForSort || b.date)
    );
    
    const isVerifiedReal = shipment.isVerified === true || shipment.isRealData === true;
    let sourceBadge = isVerifiedReal
        ? `
        <span class="source-badge real">
            <i class="fas fa-check-circle"></i> 
            Verified Data
        </span>
        `
        : `
        <span class="source-badge warn">
            <i class="fas fa-exclamation-triangle"></i> 
            Unverified
        </span>
        `;
    
    let timelineRows = '';
    sortedTimeline.forEach((event, index) => {
        const isCurrent = index === sortedTimeline.length - 1;
        const rowClass = isCurrent ? 'current-event' : '';
        const dotClass = isCurrent ? 'active' : '';
        const badgeHtml = isCurrent ? '<span class="current-badge">Current</span>' : '';
        
        timelineRows += `
            <tr class="${rowClass}">
                <td>
                    <span class="timeline-dot ${dotClass}"></span>
                </td>
                <td>
                    <strong>${escapeHtml(event.status)}</strong>
                    ${badgeHtml}
                </td>
                <td>
                    <i class="fas fa-map-marker-alt"></i>
                    ${escapeHtml(event.location)}
                </td>
                <td>
                    <i class="far fa-calendar-alt"></i>
                    ${escapeHtml(event.date)} ${escapeHtml(event.time)}
                </td>
            </tr>
        `;
    });
    
    // Build number display section
    let numberDisplay = `
        <div class="tracking-number-large">
            <i class="fas fa-qrcode"></i>
            <span>${escapeHtml(shipment.displayNumber || shipment.trackingNumber)}</span>
            ${sourceBadge}
        </div>
    `;
    
    // If C/N number exists, show it below
    let cnDisplay = '';
    if (shipment.customerCNumber) {
        cnDisplay = `
            <div style="margin-top: 8px; font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 600; color: #064e3b;">Customer C/N:</span>
                <span style="background: #f1f5f9; padding: 2px 12px; border-radius: 4px; font-family: monospace; font-weight: 600; color: #1e293b;">${escapeHtml(shipment.customerCNumber)}</span>
                <span style="font-size: 11px; color: #94a3b8;">(Give this to customer for tracking)</span>
            </div>
        `;
    }
    
    // Show which number was searched with
    let searchInfo = '';
    if (shipment.searchedWith) {
        searchInfo = `
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                <i class="fas fa-info-circle"></i> Searched with: ${escapeHtml(shipment.searchedWith)}
            </div>
        `;
    }
    
    resultDiv.innerHTML = `
        <div class="tracking-card">
            <div class="tracking-header">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${numberDisplay}
                    ${cnDisplay}
                    ${searchInfo}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="refreshTrackingData('${escapeHtml(shipment.trackingNumber)}')" class="refresh-btn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            
            <div class="timeline-container">
                <h4><i class="fas fa-history"></i> Tracking History</h4>
                <div style="overflow-x: auto;">
                    <table class="timeline-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Event</th>
                                <th>Location</th>
                                <th>Date &amp; Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${timelineRows || '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #6b7a8a;">No timeline data available</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ==================== TRACK SHIPMENT ====================
async function trackShipment() {
    const input = document.getElementById('trackingInput');
    const trackingNumber = input?.value.trim();
    
    if (!trackingNumber) {
        showToast('Please enter a tracking number or Customer C/N', 'error');
        return;
    }
    
    const resultDiv = document.getElementById('trackingResult');
    if (!resultDiv) return;
    
    showLoading(true);
    try {
        const shipment = await apiRequest(`/track/${trackingNumber}`, 'GET');
        saveTrackedShipment(trackingNumber, shipment);
        displayTrackingInfo(shipment, resultDiv);
        showToast(`✅ Tracking found for ${trackingNumber}`, 'success');
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="tracking-card" style="background: linear-gradient(135deg, #991b1b, #7f1d1d); color: white; border: none;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px;"></i>
                    <div>
                        <h4 style="color: white;">Not Found</h4>
                        <p style="color: #fca5a5; margin: 0;">${error.message}</p>
                    </div>
                </div>
            </div>
        `;
        showToast('❌ Tracking number not found', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== WELCOME TRACK ====================
async function welcomeTrackShipment(trackingNumber) {
    const input = document.getElementById('welcomeTrackInput');
    const number = (trackingNumber || input?.value || '').trim();

    if (!number) {
        showToast('Please enter a tracking number or Customer C/N', 'error');
        return;
    }

    if (input) input.value = number;

    const resultDiv = document.getElementById('welcomeTrackResult');
    if (!resultDiv) return;

    showLoading(true);
    try {
        const shipment = await apiRequest(`/track/${number}`, 'GET');
        saveTrackedShipment(number, shipment);
        displayTrackingInfo(shipment, resultDiv);
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showToast(`✅ Tracking found for ${number}`, 'success');
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="tracking-card" style="background: linear-gradient(135deg, #991b1b, #7f1d1d); color: white; border: none;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px;"></i>
                    <div>
                        <h4 style="color: white;">Not Found</h4>
                        <p style="color: #fca5a5; margin: 0;">${error.message}</p>
                    </div>
                </div>
            </div>
        `;
        showToast('❌ Tracking number not found', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== REFRESH TRACKING ====================
async function refreshTrackingData(trackingNumber) {
    showLoading(true);
    try {
        const shipment = await apiRequest(`/track/${trackingNumber}`, 'GET');
        saveTrackedShipment(trackingNumber, shipment);
        
        const resultDiv = document.getElementById('trackingResult') || document.getElementById('welcomeTrackResult');
        
        if (resultDiv) {
            displayTrackingInfo(shipment, resultDiv);
            showToast('Tracking data refreshed ✅', 'success');
        } else {
            const trackBtn = document.querySelector('.nav-btn[data-page="track"]');
            if (trackBtn) {
                trackBtn.click();
                setTimeout(() => {
                    const newResultDiv = document.getElementById('trackingResult');
                    if (newResultDiv) {
                        displayTrackingInfo(shipment, newResultDiv);
                        showToast('Tracking data refreshed ✅', 'success');
                    }
                }, 300);
            } else {
                showToast('Please go to Track Shipment page to refresh', 'error');
            }
        }
    } catch (error) {
        showToast('Error refreshing: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== PRINT CURRENT SHIPMENT ====================
function printCurrentShipment() {
    const trackingNumber = document.querySelector('.tracking-number-large span')?.textContent;
    if (trackingNumber) {
        printShipmentFromHistory(trackingNumber);
    } else {
        showToast('No shipment loaded to print', 'error');
    }
}

// ==================== COMPLETE PRINT SHIPMENT FUNCTIONS WITH PDF BUTTON AT BOTTOM ====================
function generateShipmentHTML(shipmentData) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ROUTE3 Airway Bill - ${shipmentData.trackingNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Courier New', monospace;
                background: #f0f0f0;
                display: flex;
                justify-content: center;
                padding: 40px 20px;
            }
            .label-container {
                max-width: 800px;
                width: 100%;
                background: white;
                padding: 30px 35px;
                border: 2px solid #1a1a1a;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 3px double #1a1a1a;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .logo-section h1 {
                font-size: 28px;
                font-weight: 800;
                letter-spacing: 2px;
                color: #064e3b;
            }
            .logo-section .sub {
                font-size: 11px;
                color: #666;
                letter-spacing: 4px;
                text-transform: uppercase;
            }
            .badge-section {
                text-align: right;
            }
            .badge-section .badge {
                background: #064e3b;
                color: white;
                padding: 6px 16px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1px;
                border-radius: 4px;
                display: inline-block;
                margin-bottom: 6px;
            }
            .badge-section .type {
                font-size: 13px;
                font-weight: 700;
                color: #dc2626;
                letter-spacing: 1px;
            }
            .tracking-number {
                background: #f8fafc;
                border: 2px dashed #064e3b;
                padding: 12px 18px;
                text-align: center;
                font-size: 24px;
                font-weight: 800;
                letter-spacing: 3px;
                color: #064e3b;
                margin-bottom: 8px;
                border-radius: 6px;
            }
            .tracking-number small {
                font-size: 12px;
                font-weight: 400;
                color: #666;
                display: block;
                letter-spacing: 1px;
            }
            .cn-number {
                text-align: center;
                font-size: 18px;
                font-weight: 700;
                color: #2563eb;
                letter-spacing: 2px;
                margin-bottom: 20px;
                padding: 8px;
                background: #eff6ff;
                border-radius: 6px;
                border: 1px solid #bfdbfe;
            }
            .cn-number small {
                font-size: 11px;
                font-weight: 400;
                color: #64748b;
                display: block;
                letter-spacing: 1px;
            }
            .grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
                margin-bottom: 20px;
            }
            .section {
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 14px 16px;
                background: #fafafa;
            }
            .section-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: #888;
                border-bottom: 1px solid #eee;
                padding-bottom: 6px;
                margin-bottom: 10px;
            }
            .field {
                font-size: 14px;
                margin-bottom: 4px;
            }
            .field strong {
                font-weight: 600;
                color: #333;
            }
            .field .label {
                color: #888;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .divider {
                border-top: 2px dashed #ddd;
                margin: 18px 0;
            }
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
                margin: 15px 0;
            }
            .detail-item {
                text-align: center;
                padding: 10px;
                background: #f8fafc;
                border-radius: 6px;
                border: 1px solid #eee;
            }
            .detail-item .num {
                font-size: 22px;
                font-weight: 800;
                color: #064e3b;
            }
            .detail-item .lbl {
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .footer {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 2px solid #1a1a1a;
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: #666;
                flex-wrap: wrap;
                gap: 8px;
            }
            .footer .created {
                font-weight: 600;
                color: #333;
            }
            .route-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
                padding: 10px 16px;
                border-radius: 6px;
                margin: 10px 0;
                font-size: 13px;
            }
            .route-info .arrow {
                color: #064e3b;
                font-size: 20px;
                font-weight: 700;
            }
            .route-info .location {
                font-weight: 600;
                color: #064e3b;
            }
            
            .pdf-button-container {
                margin-top: 25px;
                padding-top: 20px;
                border-top: 2px solid #064e3b;
                text-align: center;
            }
            .pdf-save-btn {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                border: none;
                padding: 14px 40px;
                font-size: 16px;
                font-weight: 700;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
            }
            .pdf-save-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
            }
            .pdf-save-btn i {
                font-size: 20px;
            }
            .pdf-info {
                margin-top: 10px;
                font-size: 12px;
                color: #64748b;
            }
            .pdf-info i {
                color: #10b981;
                margin-right: 6px;
            }
            
            @media print {
                body { background: white; padding: 0; }
                .label-container { box-shadow: none; border: 1px solid #ccc; padding: 20px; }
                .pdf-button-container { display: none !important; }
                .no-print { display: none !important; }
            }
            @media (max-width: 600px) {
                .grid-2 { grid-template-columns: 1fr; gap: 12px; }
                .details-grid { grid-template-columns: 1fr 1fr; }
                .tracking-number { font-size: 18px; }
                .cn-number { font-size: 15px; }
                .route-info { flex-direction: column; gap: 8px; text-align: center; }
                .route-info .arrow { transform: rotate(90deg); }
                .pdf-save-btn { padding: 12px 24px; font-size: 14px; width: 100%; justify-content: center; }
            }
        </style>
    </head>
    <body>
        <div class="label-container" id="printContainer">
            <div class="header">
                <div class="logo-section">
                    <h1>ROUTE 3</h1>
                    <div class="sub">TRAX Smart Logistics</div>
                </div>
                <div class="badge-section">
                    <div class="badge">AIRWAY BILL</div>
                    <div class="type">${shipmentData.service || 'STANDARD'}</div>
                </div>
            </div>

            <div class="tracking-number">
                ${shipmentData.trackingNumber}
                <small>Tracking ID • Keep this number for reference</small>
            </div>

            ${shipmentData.customerCNumber ? `
            <div class="cn-number">
                ${shipmentData.customerCNumber}
                <small>Customer C/N • Give this to your customer for tracking</small>
            </div>
            ` : ''}

            <div class="route-info">
                <span class="location"><i class="fas fa-map-marker-alt"></i> ${shipmentData.origin || 'Pakistan'}</span>
                <span class="arrow">→</span>
                <span class="location"><i class="fas fa-flag-checkered"></i> ${shipmentData.destination || 'International'}</span>
            </div>

            <div class="grid-2">
                <div class="section">
                    <div class="section-title">📦 Shipper Information</div>
                    <div class="field"><strong>${shipmentData.shipperName || 'N/A'}</strong></div>
                    <div class="field">${shipmentData.shipperAddress || 'N/A'}</div>
                    <div class="field">${shipmentData.shipperCity || 'N/A'}</div>
                    <div class="field"><span class="label">Contact:</span> ${shipmentData.shipperPhone || 'N/A'}</div>
                </div>
                <div class="section">
                    <div class="section-title">📍 Consignee Information</div>
                    <div class="field"><strong>${shipmentData.consigneeName || 'N/A'}</strong></div>
                    <div class="field">${shipmentData.consigneeAddress || 'N/A'}</div>
                    <div class="field">${shipmentData.consigneeCity || 'N/A'}</div>
                    <div class="field"><span class="label">Contact:</span> ${shipmentData.consigneePhone || 'N/A'}</div>
                </div>
            </div>

            <div class="details-grid">
                <div class="detail-item">
                    <div class="num">${shipmentData.pieces || '1'}</div>
                    <div class="lbl">Pieces</div>
                </div>
                <div class="detail-item">
                    <div class="num">${shipmentData.weight || '0'} kg</div>
                    <div class="lbl">Weight</div>
                </div>
                <div class="detail-item">
                    <div class="num">$${shipmentData.cost || '0.00'}</div>
                    <div class="lbl">Shipping Cost</div>
                </div>
            </div>

            <div class="section" style="margin-bottom: 15px;">
                <div class="section-title">📝 Shipment Details</div>
                <div class="field"><span class="label">Description:</span> ${shipmentData.description || 'N/A'}</div>
                <div class="field"><span class="label">Service:</span> ${shipmentData.service || 'Standard'}</div>
                <div class="field"><span class="label">Date:</span> ${shipmentData.createdDate || dateStr}</div>
                <div class="field"><span class="label">Status:</span> ${shipmentData.status || 'Created'}</div>
            </div>

            <div class="divider"></div>

            <div class="footer">
                <div>
                    <span class="created">Created By:</span> ${shipmentData.createdBy || currentUser?.email || 'N/A'}
                </div>
                <div>
                    <span class="created">Date:</span> ${dateStr} ${timeStr}
                </div>
                <div>Ref: ${shipmentData.reference || 'N/A'}</div>
            </div>

            <div class="pdf-button-container no-print">
                <button onclick="saveAsPDF()" class="pdf-save-btn">
                    <i class="fas fa-file-pdf"></i> Save as PDF
                </button>
                <div class="pdf-info">
                    <i class="fas fa-info-circle"></i> Click to save this airway bill as a PDF file on your device
                </div>
            </div>
        </div>
        
        <script>
            function saveAsPDF() {
                window.print();
            }
        <\/script>
    </body>
    </html>
    `;
}

function printShipmentLabel(shipmentData) {
    const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!printWindow) {
        showToast('Please allow popups to save the PDF', 'error');
        return;
    }
    
    const html = generateShipmentHTML(shipmentData);
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.focus();
        showToast('📄 Click "Save as PDF" button at the bottom to download', 'success');
    }, 600);
}

function printShipmentFromHistory(trackingNumber) {
    showLoading(true);
    apiRequest(`/print/${trackingNumber}`, 'GET')
        .then(result => {
            if (result.success && result.shipment) {
                const s = result.shipment;
                const shipmentData = {
                    trackingNumber: s.trackingNumber,
                    customerCNumber: s.customerCNumber || null,
                    cost: s.cost || 15,
                    shipperName: s.shipperName || 'N/A',
                    shipperAddress: s.shipperAddress || 'N/A',
                    shipperPhone: s.shipperPhone || 'N/A',
                    shipperCity: s.shipperCity || 'N/A',
                    consigneeName: s.consigneeName || 'N/A',
                    consigneeAddress: s.consigneeAddress || 'N/A',
                    consigneePhone: s.consigneePhone || 'N/A',
                    consigneeCity: s.consigneeCity || 'N/A',
                    description: s.description || 'Shipment',
                    weight: s.weight || '1',
                    pieces: s.pieces || '1',
                    service: s.service || 'Standard',
                    origin: s.origin || 'Pakistan',
                    destination: s.destination || 'International',
                    createdDate: s.createdAt || new Date().toISOString(),
                    createdBy: s.createdBy || currentUser?.email || 'N/A',
                    reference: 'SHIP-' + Date.now().toString().slice(-6),
                    status: s.status || 'Created'
                };
                printShipmentLabel(shipmentData);
                showToast('📄 PDF ready - Click "Save as PDF" at the bottom', 'success');
            } else {
                showToast('Shipment data not found', 'error');
            }
        })
        .catch(error => {
            showToast('Error loading shipment data: ' + error.message, 'error');
        })
        .finally(() => {
            showLoading(false);
        });
}

// ==================== TRACKED HISTORY PAGE ====================
function loadTrackedHistoryPage() {
    const content = document.getElementById('dashboardContent');
    const history = getTrackedShipmentsHistory();
    
    if (history.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Tracked Shipments Yet</h3>
                <p>Go to Track Shipment and search for a tracking number</p>
                <button onclick="document.querySelector('.nav-btn[data-page=\\'track\\']').click()" class="btn-primary" style="margin-top: 18px; flex: none; padding: 11px 22px;">
                    <i class="fas fa-search"></i> Track a Shipment
                </button>
            </div>
        `;
        return;
    }
    
    let historyCards = '';
    history.forEach((shipment, index) => {
        const date = new Date(shipment.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const isUserCreated = shipment.data?.isUserCreated || shipment.trackingNumber?.startsWith('TRX');
        const hasCN = shipment.customerCNumber || shipment.data?.customerCNumber;
        
        historyCards += `
            <div class="tracked-card" onclick="quickTrackFromHistory('${escapeHtml(shipment.trackingNumber)}')">
                <div class="tracked-card-header">
                    <div class="tracked-number">
                        <i class="fas fa-qrcode"></i>
                        <strong>${escapeHtml(shipment.trackingNumber)}</strong>
                        ${isUserCreated ? '<span class="tag-soft tag-blue" style="margin-left:6px;">Created</span>' : ''}
                        ${hasCN ? '<span class="tag-soft tag-green" style="margin-left:4px;">C/N</span>' : ''}
                    </div>
                    <div class="tracked-time">
                        <i class="far fa-clock"></i> ${formattedDate}
                    </div>
                </div>
                <div class="tracked-card-body">
                    <div class="tracked-status">
                        <span class="status-badge">${escapeHtml(shipment.latestStatus)}</span>
                    </div>
                    ${hasCN ? `
                    <div class="tracked-location" style="color: #2953a6;">
                        <i class="fas fa-id-card" style="color:#2953a6;"></i> C/N: ${escapeHtml(hasCN)}
                    </div>
                    ` : ''}
                    <div class="tracked-location">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(shipment.latestLocation)}
                    </div>
                    <div class="tracked-update">
                        <i class="fas fa-clock"></i> ${escapeHtml(shipment.lastUpdate)}
                    </div>
                </div>
                <div class="tracked-card-footer">
                    <button onclick="event.stopPropagation(); quickTrackFromHistory('${escapeHtml(shipment.trackingNumber)}')" class="btn-icon-sm" style="width:auto; padding:0 12px; height:32px; gap:6px;">
                        <i class="fas fa-search"></i> Track
                    </button>
                    <button onclick="event.stopPropagation(); removeFromHistory('${escapeHtml(shipment.trackingNumber)}')" class="btn-icon-sm" style="width:auto; padding:0 12px; height:32px; gap:6px; background:#fef2f2; border-color:#fde0e0; color:#b3261e;">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = `
        <div class="tracked-history-container">
            <div class="tracked-history-header">
                <div>
                    <h3>Recently Tracked</h3>
                    <p style="font-weight:500; font-size:13px; color:var(--dash-muted); margin-top:3px;">Your recent shipment tracking history</p>
                </div>
                ${history.length > 0 ? `<button onclick="clearAllHistory()" class="clear-history-btn"><i class="fas fa-trash-alt"></i> Clear All</button>` : ''}
            </div>
            <div class="tracked-history-grid">
                ${historyCards}
            </div>
        </div>
    `;
}

function quickTrackFromHistory(trackingNumber) {
    document.querySelector('.nav-btn[data-page="track"]').click();
    setTimeout(() => {
        const input = document.getElementById('trackingInput');
        if (input) {
            input.value = trackingNumber;
            trackShipment();
        }
    }, 100);
}

function showConfirm(message, onConfirm, title = 'Are you sure?') {
    const overlay = document.getElementById('confirmDialogOverlay');
    const titleEl = document.getElementById('confirmDialogTitle');
    const messageEl = document.getElementById('confirmDialogMessage');
    const okBtn = document.getElementById('confirmDialogOk');
    const cancelBtn = document.getElementById('confirmDialogCancel');
    if (!overlay) { if (onConfirm) onConfirm(); return; }

    titleEl.innerText = title;
    messageEl.innerText = message;
    overlay.classList.add('active');

    const cleanup = () => {
        overlay.classList.remove('active');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        overlay.removeEventListener('click', handleBackdrop);
    };
    const handleOk = () => { cleanup(); if (onConfirm) onConfirm(); };
    const handleCancel = () => cleanup();
    const handleBackdrop = (e) => { if (e.target === overlay) cleanup(); };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    overlay.addEventListener('click', handleBackdrop);
}

function removeFromHistory(trackingNumber) {
    trackedShipmentsHistory = trackedShipmentsHistory.filter(s => s.trackingNumber !== trackingNumber);
    localStorage.setItem('trackedShipmentsHistory', JSON.stringify(trackedShipmentsHistory));
    loadTrackedHistoryPage();
    showToast('Removed from history', 'success');
}

function clearAllHistory() {
    showConfirm(
        'This will permanently delete all your tracked shipment history. This action cannot be undone.',
        () => {
            trackedShipmentsHistory = [];
            localStorage.setItem('trackedShipmentsHistory', JSON.stringify(trackedShipmentsHistory));
            loadTrackedHistoryPage();
            showToast('History cleared', 'success');
        },
        'Clear all history?'
    );
}

// ==================== SHIPMENTS PAGE ====================
async function loadShipmentsPage() {
    const content = document.getElementById('dashboardContent');
    showLoading(true);
    try {
        const result = await apiRequest('/auth/user-shipments', 'GET');
        const shipments = result.shipments || [];
        
        if (shipments.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No Shipments Yet</h3>
                    <p>Click the + button to create your first shipment</p>
                </div>
            `;
            return;
        }
        
        let rows = '';
        shipments.forEach(s => {
            rows += `
                <tr>
                    <td data-label="Tracking ID"><strong>${escapeHtml(s.trackingNumber)}</strong></td>
                    <td data-label="Customer C/N"><span class="tag-soft tag-blue">${escapeHtml(s.customerCNumber || 'N/A')}</span></td>
                    <td data-label="Status"><span class="status-badge">${escapeHtml(s.status || 'Created')}</span></td>
                    <td data-label="Shipper">${escapeHtml(s.shipperName || 'N/A')}</td>
                    <td data-label="Consignee">${escapeHtml(s.consigneeName || 'N/A')}</td>
                    <td data-label="Route" style="white-space:nowrap; font-size: 12.5px;">
                        <span style="font-weight:600;color:var(--dash-ink);">${escapeHtml(s.origin || 'N/A')}</span>
                        <i class="fas fa-arrow-right" style="margin:0 6px; color:#10b981; font-size:10px;"></i>
                        <span style="font-weight:600;color:var(--dash-ink);">${escapeHtml(s.destination || 'N/A')}</span>
                    </td>
                    <td data-label="Date">${s.lastUpdate ? new Date(s.lastUpdate).toLocaleString() : new Date(s.createdAt).toLocaleString()}</td>
                    <td data-label="Actions" style="display: flex; gap: 6px;">
                        <button class="btn-icon-sm" onclick="quickTrackFromMyShipments('${escapeHtml(s.trackingNumber)}')" title="Track">
                            <i class="fas fa-search"></i>
                        </button>
                        <button class="btn-icon-sm pdf" onclick="printShipmentFromHistory('${escapeHtml(s.trackingNumber)}')" title="Download PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        content.innerHTML = `
            <div class="page-header">
                <div class="page-header-title">
                    <div>
                        <h3>My Shipments</h3>
                        <p>All your created shipments with Tracking IDs and Customer C/N</p>
                    </div>
                </div>
                <span class="tag-soft tag-green" style="font-size:11.5px; padding:6px 14px;">${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="table-wrap" style="overflow-x: auto;">
                <table class="shipments-table">
                    <thead>
                        <tr><th>Tracking ID</th><th>Customer C/N</th><th>Status</th><th>Shipper</th><th>Consignee</th><th>Route</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<p>Error: ${error.message}</p>`;
    } finally {
        showLoading(false);
    }
}

function quickTrackFromMyShipments(trackingNumber) {
    document.querySelector('.nav-btn[data-page="track"]').click();
    setTimeout(() => {
        const input = document.getElementById('trackingInput');
        if (input) {
            input.value = trackingNumber;
            trackShipment();
        }
    }, 100);
}

// ==================== CONTACT PAGE ====================
function loadContactPage() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="contact-card">
            <div class="support-intro">
                <i class="fas fa-comment-dots"></i>
                <h2>Customer Support</h2>
                <p>We're here to help you 24/7</p>
            </div>
            <div class="support-grid">
                <div class="support-item">
                    <i class="fas fa-phone-alt"></i>
                    <h3>Call Us</h3>
                    <p>+92 315 6333863</p>
                </div>
                <div class="support-item">
                    <i class="fas fa-envelope"></i>
                    <h3>Email Us</h3>
                    <p>support@traxlogistics.com</p>
                </div>
                <div class="support-item">
                    <i class="fab fa-whatsapp"></i>
                    <h3>WhatsApp</h3>
                    <p>+92 315 6333863</p>
                </div>
            </div>
        </div>
    `;
}

// ==================== SHIPMENT CREATION (WITH C/N NUMBER) ====================
async function createShipment(event) {
    event.preventDefault();
    const shipperName = document.getElementById('shipperName')?.value;
    const shipperAddress = document.getElementById('shipperAddress')?.value;
    const shipperCell = document.getElementById('shipperCell')?.value;
    const consigneeName = document.getElementById('consigneeName')?.value;
    const consigneeAddress = document.getElementById('consigneeAddress')?.value;
    const consigneeCell = document.getElementById('consigneeCell')?.value;
    const description = document.getElementById('parcelDescription')?.value;
    const weight = document.getElementById('weight')?.value;
    const quantity = document.getElementById('quantity')?.value;
    const originCountry = document.getElementById('originCountry')?.value || 'Pakistan';
    const destinationCountry = document.getElementById('destinationCountry')?.value || 'International';

    if (!shipperName || !consigneeName || !description) {
        showToast('Please fill required fields', 'error');
        return;
    }

    if (originCountry === destinationCountry) {
        showToast('Origin and destination countries must be different', 'error');
        return;
    }

    showLoading(true);
    try {
        const result = await apiRequest('/auth/create-shipment', 'POST', {
            shipperName,
            shipperAddress: shipperAddress || 'N/A',
            shipperPhone: shipperCell || 'N/A',
            shipperCity: originCountry,
            consigneeName,
            consigneeAddress: consigneeAddress || 'N/A',
            consigneePhone: consigneeCell || 'N/A',
            consigneeCity: destinationCountry,
            description,
            weight: weight || '1',
            quantity: quantity || '1',
            service: 'Standard',
            origin: originCountry,
            destination: destinationCountry
        });
        
        showToast(`✅ Shipment created!\nTracking: ${result.trackingNumber}\nCustomer C/N: ${result.customerCNumber}\nCost: $${result.cost}`, 'success');
        closeShipmentModal();
        
        // Show print option modal with both numbers
        showPrintOptionModal({
            trackingNumber: result.trackingNumber,
            customerCNumber: result.customerCNumber,
            cost: result.cost,
            shipperName,
            shipperAddress: shipperAddress || 'N/A',
            shipperPhone: shipperCell || 'N/A',
            consigneeName,
            consigneeAddress: consigneeAddress || 'N/A',
            consigneePhone: consigneeCell || 'N/A',
            description,
            weight: weight || '1',
            pieces: quantity || '1',
            service: 'Standard',
            origin: originCountry,
            destination: destinationCountry,
            createdDate: new Date().toISOString(),
            createdBy: currentUser?.email || 'N/A',
            reference: 'SHIP-' + Date.now().toString().slice(-6),
            status: 'Created'
        });
        
        loadDashboardContent();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== PRINT OPTION MODAL (WITH C/N NUMBER) ====================
function showPrintOptionModal(shipmentData) {
    const modalHtml = `
        <div id="printOptionModal" class="modal active" onclick="if(event.target===this) closePrintOptionModal()">
            <div class="modal-content" style="max-width: 520px; text-align: center;">
                <div class="modal-header">
                    <h3><i class="fas fa-check-circle" style="color: #10b981;"></i> Shipment Created!</h3>
                    <button class="modal-close" onclick="closePrintOptionModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #ecfdf5; border-radius: 20px; padding: 24px; margin-bottom: 24px;">
                        <div style="font-size: 14px; color: #64748b;">Tracking ID</div>
                        <div style="font-size: 28px; font-weight: 800; color: #064e3b; letter-spacing: 2px; margin: 4px 0;">${shipmentData.trackingNumber}</div>
                        <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Customer C/N</div>
                        <div style="font-size: 24px; font-weight: 700; color: #2563eb; letter-spacing: 2px; margin: 4px 0;">${shipmentData.customerCNumber}</div>
                        <div style="font-size: 18px; font-weight: 700; color: #10b981; margin-top: 12px;">$${shipmentData.cost.toFixed(2)}</div>
                        <div style="font-size: 13px; color: #64748b;">Shipping Cost</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; text-align: left;">
                        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 12px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Shipper</div>
                            <div style="font-weight: 600; color: #064e3b;">${escapeHtml(shipmentData.shipperName)}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 12px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Consignee</div>
                            <div style="font-weight: 600; color: #064e3b;">${escapeHtml(shipmentData.consigneeName)}</div>
                        </div>
                    </div>
                    
                    <div style="background: #dbeafe; border-radius: 12px; padding: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; text-align: left;">
                        <i class="fas fa-file-pdf" style="font-size: 24px; color: #2563eb;"></i>
                        <div>
                            <div style="font-weight: 600; color: #1e40af; font-size: 14px;">Save as PDF</div>
                            <div style="font-size: 12px; color: #3b82f6;">The PDF will be saved to your device</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; flex-direction: column;">
                        <button onclick="closePrintOptionModal(); printShipmentLabel(${JSON.stringify(shipmentData).replace(/"/g, '&quot;')})" class="btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px; background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                            <i class="fas fa-file-pdf"></i> Save as PDF
                        </button>
                        <button onclick="closePrintOptionModal()" class="btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closePrintOptionModal() {
    document.getElementById('printOptionModal')?.remove();
    document.body.style.overflow = '';
}

// ==================== RATE CALCULATOR ====================
function showRateCalculator() {
    const modalHtml = `
        <div id="rateModal" class="modal active" onclick="if(event.target===this) closeRateModal()">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header"><h3><i class="fas fa-calculator"></i> Rate Calculator</h3><button class="modal-close" onclick="closeRateModal()">&times;</button></div>
                <div class="modal-body">
                    <div class="form-row"><select id="rateOrigin"><option>Islamabad</option><option>Karachi</option><option>Lahore</option></select>
                    <select id="rateDestination"><option>Dubai</option><option>Islamabad</option><option>Karachi</option></select></div>
                    <div class="form-row"><input type="number" id="rateWeight" placeholder="Weight (kg)"><select id="rateService"><option value="standard">Standard</option><option value="express">Express</option></select></div>
                    <button onclick="calculateRate()" class="btn-primary">Calculate</button>
                    <div id="rateResult" style="margin-top: 20px;"></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closeRateModal() {
    document.getElementById('rateModal')?.remove();
    document.body.style.overflow = '';
}

function calculateRate() {
    const weight = parseFloat(document.getElementById('rateWeight')?.value) || 1;
    const service = document.getElementById('rateService')?.value;
    const total = service === 'express' ? 25 + weight * 2 : 15 + weight * 1.2;
    document.getElementById('rateResult').innerHTML = `<div style="background:#ecfdf5; border-radius:20px; padding:20px; text-align:center"><strong style="font-size:28px;">$${total.toFixed(2)}</strong><br>Estimated Shipping Cost</div>`;
}

// ==================== SUPPORT TICKET ====================
function openSupportModal() {
    const modalHtml = `
        <div id="supportModal" class="modal active" onclick="if(event.target===this) closeSupportModal()">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header"><h3><i class="fas fa-ticket-alt"></i> Support Ticket</h3><button class="modal-close" onclick="closeSupportModal()">&times;</button></div>
                <div class="modal-body">
                    <input type="text" id="ticketSubject" placeholder="Subject" style="width:100%; padding:12px; margin-bottom:12px; border-radius:20px; border:2px solid #d1fae5;">
                    <textarea id="ticketMessage" rows="5" placeholder="Describe your issue..." style="width:100%; padding:12px; border-radius:20px; border:2px solid #d1fae5;"></textarea>
                    <div style="display:flex; gap:12px; margin-top:20px;"><button onclick="closeSupportModal()" class="btn-secondary">Cancel</button><button onclick="submitTicket()" class="btn-primary">Submit</button></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closeSupportModal() {
    document.getElementById('supportModal')?.remove();
    document.body.style.overflow = '';
}

async function submitTicket() {
    const subject = document.getElementById('ticketSubject')?.value;
    const message = document.getElementById('ticketMessage')?.value;
    if (!subject || !message) {
        showToast('Please fill all fields', 'error');
        return;
    }
    showLoading(true);
    try {
        const result = await apiRequest('/auth/support-ticket', 'POST', { subject, message });
        showToast(`Ticket ${result.ticketNumber} created!`, 'success');
        closeSupportModal();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== COUNTRIES (Origin / Destination) ====================
const COUNTRY_LIST = [
    "Pakistan","United Arab Emirates","Saudi Arabia","United Kingdom","United States",
    "Canada","China","India","Bangladesh","Sri Lanka","Nepal","Afghanistan","Iran",
    "Turkey","Qatar","Kuwait","Bahrain","Oman","Malaysia","Singapore","Indonesia",
    "Thailand","Japan","South Korea","Australia","New Zealand","Germany","France",
    "Italy","Spain","Netherlands","Belgium","Switzerland","Sweden","Norway","Denmark",
    "Ireland","Austria","Poland","Portugal","Greece","Russia","South Africa","Egypt",
    "Nigeria","Kenya","Morocco","Brazil","Mexico","Argentina","Chile","Philippines",
    "Vietnam","Hong Kong","Taiwan","Jordan","Lebanon","Iraq","Uzbekistan","Kazakhstan",
    "Azerbaijan","Maldives"
].sort((a, b) => a === "Pakistan" ? -1 : b === "Pakistan" ? 1 : a.localeCompare(b));

function populateCountrySelects() {
    const originSel = document.getElementById('originCountry');
    const destSel = document.getElementById('destinationCountry');
    if (!originSel || !destSel) return;
    if (originSel.options.length) return; // already populated

    const buildOptions = () => COUNTRY_LIST.map(c => `<option value="${c}">${c}</option>`).join('');
    originSel.innerHTML = buildOptions();
    destSel.innerHTML = buildOptions();

    originSel.value = 'Pakistan';
    // Default destination to the first non-Pakistan option so From/To differ
    const firstOther = COUNTRY_LIST.find(c => c !== 'Pakistan');
    destSel.value = firstOther || 'United Arab Emirates';
}

function swapCountries() {
    const originSel = document.getElementById('originCountry');
    const destSel = document.getElementById('destinationCountry');
    if (!originSel || !destSel) return;
    const temp = originSel.value;
    originSel.value = destSel.value;
    destSel.value = temp;
}

// ==================== MODALS ====================
function openShipmentModal() {
    const modal = document.getElementById('shipmentModal');
    if (modal) {
        populateCountrySelects();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeShipmentModal() {
    const modal = document.getElementById('shipmentModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupFabMenu() {
    const fabBtn = document.getElementById('fabButton');
    const fabOptions = document.getElementById('fabOptions');
    if (fabBtn && fabOptions) {
        fabBtn.addEventListener('click', (e) => { e.stopPropagation(); fabOptions.classList.toggle('show'); });
        document.addEventListener('click', (e) => { if (!fabBtn.contains(e.target) && !fabOptions.contains(e.target)) fabOptions.classList.remove('show'); });
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setupFabMenu();
    
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showWelcome();
    }
    
    document.getElementById('welcomeLoginBtn')?.addEventListener('click', () => showAuthTab('login'));
    document.getElementById('welcomeSignupBtn')?.addEventListener('click', () => showAuthTab('signup'));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', logout);

    document.getElementById('welcomeTrackBtn')?.addEventListener('click', () => welcomeTrackShipment());
    document.getElementById('welcomeTrackInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') welcomeTrackShipment();
    });
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('loginForm').classList.toggle('active', tab.dataset.tab === 'login');
            document.getElementById('signupForm').classList.toggle('active', tab.dataset.tab === 'signup');
        });
    });
    
    document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });
    
    document.getElementById('signupFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        signup(name, email, phone, password);
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadDashboardContent();
            closeMobileMenu();
        });
    });

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const dashSidebar = document.getElementById('dashSidebar');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');

    function openMobileMenu() {
        dashSidebar?.classList.add('mobile-open');
        mobileMenuBackdrop?.classList.add('active');
        mobileMenuBtn?.classList.add('active');
        mobileMenuBtn?.setAttribute('aria-expanded', 'true');
        const icon = mobileMenuBtn?.querySelector('i');
        if (icon) { icon.classList.remove('fa-ellipsis-vertical'); icon.classList.add('fa-xmark'); }
    }

    function closeMobileMenu() {
        dashSidebar?.classList.remove('mobile-open');
        mobileMenuBackdrop?.classList.remove('active');
        mobileMenuBtn?.classList.remove('active');
        mobileMenuBtn?.setAttribute('aria-expanded', 'false');
        const icon = mobileMenuBtn?.querySelector('i');
        if (icon) { icon.classList.remove('fa-xmark'); icon.classList.add('fa-ellipsis-vertical'); }
    }

    mobileMenuBtn?.addEventListener('click', () => {
        if (dashSidebar?.classList.contains('mobile-open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });

    mobileMenuBackdrop?.addEventListener('click', closeMobileMenu);
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMobileMenu();
    });
    
    document.querySelector('#shipmentModal .modal-close')?.addEventListener('click', closeShipmentModal);
    document.getElementById('cancelShipmentBtn')?.addEventListener('click', closeShipmentModal);
    document.getElementById('shipmentForm')?.addEventListener('submit', createShipment);
    document.getElementById('shipmentModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeShipmentModal(); });
});

// Expose globals
window.trackShipment = trackShipment;
window.openShipmentModal = openShipmentModal;
window.openSupportModal = openSupportModal;
window.showRateCalculator = showRateCalculator;
window.closeRateModal = closeRateModal;
window.closeSupportModal = closeSupportModal;
window.editProfile = editProfile;
window.refreshTrackingData = refreshTrackingData;
window.quickTrackFromHistory = quickTrackFromHistory;
window.removeFromHistory = removeFromHistory;
window.clearAllHistory = clearAllHistory;
window.quickTrackFromMyShipments = quickTrackFromMyShipments;
window.printShipmentLabel = printShipmentLabel;
window.printShipmentFromHistory = printShipmentFromHistory;
window.printCurrentShipment = printCurrentShipment;
window.showPrintOptionModal = showPrintOptionModal;
window.closePrintOptionModal = closePrintOptionModal;