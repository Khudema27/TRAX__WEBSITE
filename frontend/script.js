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

// ==================== PUSH NOTIFICATIONS ====================
// Lets the phone/browser show a real notification (even outside the tab)
// for OTP codes, instead of relying only on the email arriving.
let swRegistration = null;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        swRegistration = await navigator.serviceWorker.register('/service-worker.js');
        return swRegistration;
    } catch (error) {
        console.warn('Service worker registration failed:', error.message);
        return null;
    }
}

// Prompts for notification permission (if not already answered) and
// registers this device to receive push notifications for the given
// email. Safe to call multiple times — it's a no-op once already
// subscribed, and it never blocks or throws into the caller.
async function subscribeToPushNotifications(email) {
    if (!email) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // Browser/OS doesn't support Web Push here (e.g. Safari on iOS
        // only supports this once the site is added to the Home Screen).
        return;
    }

    try {
        if (Notification.permission === 'denied') return;

        const registration = swRegistration || await registerServiceWorker();
        if (!registration) return;

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }
        if (Notification.permission !== 'granted') return;

        const keyResponse = await apiRequest('/push/vapid-public-key', 'GET');
        if (!keyResponse.publicKey) return; // server-side push not configured yet

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyResponse.publicKey)
            });
        }

        await apiRequest('/push/subscribe', 'POST', { email, subscription: subscription.toJSON() });
    } catch (error) {
        // Never let a push-subscription failure disrupt signup/login.
        console.warn('Push subscription failed (non-blocking):', error.message);
    }
}

document.addEventListener('DOMContentLoaded', registerServiceWorker);

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
    setAuthView(tab);
}

// Forces exactly ONE of login / signup / otp to be visible at a time.
// Uses inline styles (not just CSS classes) so it can never be overridden
// by a stale class or a conflicting toggle elsewhere in the code.
function setAuthView(view) {
    const forms = {
        login: document.getElementById('loginForm'),
        signup: document.getElementById('signupForm'),
        otp: document.getElementById('otpForm')
    };
    Object.keys(forms).forEach(key => {
        const el = forms[key];
        if (!el) return;
        if (key === view) {
            el.style.display = 'block';
            el.classList.add('active');
        } else {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === view);
    });

    // While verifying OTP it's not a "login vs signup" choice anymore —
    // hide the tab switcher entirely so only the OTP form is on screen.
    const tabsEl = document.querySelector('.auth-tabs');
    if (tabsEl) tabsEl.style.display = (view === 'otp') ? 'none' : 'flex';

    if (view !== 'otp') {
        clearInterval(otpTimerInterval);
    }
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
        showLoading(false);
        if (result.requiresVerification) {
            showToast('Account created! Check your email for a verification code 📧', 'success');
            showOtpScreen(email);
        } else if (result.token) {
            // Fallback path in case verification is ever disabled server-side
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard();
        }
    } catch (error) {
        showLoading(false);
        if (error.message.toLowerCase().includes('email already exists') || 
            error.message.toLowerCase().includes('duplicate') ||
            error.message.toLowerCase().includes('email already registered')) {
            showToast('This email is already registered. Please login instead.', 'error');
            setTimeout(() => {
                setAuthView('login');
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
        if (error.message.toLowerCase().includes('verification code') ||
            error.message.toLowerCase().includes('verify your email')) {
            showToast('Enter the code we just emailed you to finish logging in 📧', 'info');
            showOtpScreen(email);
        } else if (error.message.toLowerCase().includes('invalid credentials') || 
            error.message.toLowerCase().includes('invalid email') ||
            error.message.toLowerCase().includes('user not found')) {
            showToast('Invalid email or password. Please try again.', 'error');
        } else {
            showToast(error.message || 'Login failed. Please try again.', 'error');
        }
    }
}

// ==================== EMAIL OTP VERIFICATION ====================
let otpTimerInterval = null;
let otpPendingEmail = null;

function showOtpScreen(email) {
    otpPendingEmail = email;
    document.getElementById('otpEmailDisplay').textContent = email;
    setAuthView('otp');

    const digits = document.querySelectorAll('.otp-digit');
    digits.forEach(d => d.value = '');
    digits[0]?.focus();

    startOtpCountdown(10 * 60); // 10 minutes, matches server-side expiry

    // Ask for notification permission right when it's actually useful —
    // the moment the user is waiting on a code.
    subscribeToPushNotifications(email);
}

function startOtpCountdown(seconds) {
    clearInterval(otpTimerInterval);
    const timerText = document.getElementById('otpTimerText');
    let remaining = seconds;

    otpTimerInterval = setInterval(() => {
        remaining -= 1;

        const m = Math.floor(Math.max(remaining, 0) / 60).toString().padStart(2, '0');
        const s = Math.max(remaining, 0) % 60;
        if (timerText) {
            timerText.textContent = remaining > 0
                ? `Code expires in ${m}:${s.toString().padStart(2, '0')}`
                : 'Code expired — request a new one';
        }

        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
        }
    }, 1000);
}

function getOtpValue() {
    return Array.from(document.querySelectorAll('.otp-digit')).map(d => d.value.trim()).join('');
}

async function verifyOtp() {
    const otp = getOtpValue();
    if (otp.length !== 6) {
        showToast('Please enter the full 6-digit code', 'error');
        return;
    }
    if (!otpPendingEmail) {
        showToast('Something went wrong — please sign up again', 'error');
        return;
    }

    showLoading(true);
    try {
        const result = await apiRequest('/auth/verify-otp', 'POST', { email: otpPendingEmail, otp });
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showLoading(false);
        clearInterval(otpTimerInterval);
        showToast(`Email verified! Welcome, ${currentUser.name} 🎉`, 'success');
        showDashboard();
    } catch (error) {
        showLoading(false);
        showToast(error.message || 'Verification failed. Please try again.', 'error');
        document.querySelectorAll('.otp-digit').forEach(d => d.value = '');
        document.querySelector('.otp-digit')?.focus();
    }
}

async function resendOtp() {
    if (!otpPendingEmail) return;
    showLoading(true);
    try {
        await apiRequest('/auth/resend-otp', 'POST', { email: otpPendingEmail });
        showLoading(false);
        showToast('New code sent to your email 📧', 'success');
        startOtpCountdown(10 * 60);
    } catch (error) {
        showLoading(false);
        showToast(error.message || 'Could not resend code', 'error');
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
function generateBarcodeBars(seedText) {
    // Deterministic pseudo-barcode purely for visual effect (not scannable).
    let seed = 0;
    for (let i = 0; i < seedText.length; i++) seed += seedText.charCodeAt(i) * (i + 1);
    let bars = '';
    for (let i = 0; i < 46; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const width = (seed / 233280) > 0.5 ? 2.4 : 1.2;
        bars += `<div style="width:${width}px;background:#111;height:100%;"></div>`;
    }
    return bars;
}

function generateShipmentHTML(shipmentData) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const barcodeBars = generateBarcodeBars(shipmentData.trackingNumber || 'TRX00000000');
    const apxSynced = !!shipmentData.apxSynced;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ROUTE3 Airway Bill - ${shipmentData.trackingNumber}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, sans-serif;
                background: #e8ede9;
                background-image: radial-gradient(circle at 20% 10%, #dcf3e6 0%, transparent 45%),
                                   radial-gradient(circle at 85% 90%, #d9ecf5 0%, transparent 45%);
                display: flex;
                justify-content: center;
                padding: 36px 16px;
                color: #1e293b;
                -webkit-font-smoothing: antialiased;
            }
            .label-container {
                max-width: 640px;
                width: 100%;
                background: #ffffff;
                border-radius: 26px;
                overflow: hidden;
                box-shadow: 0 30px 80px -12px rgba(6, 78, 59, 0.28), 0 8px 24px rgba(6, 78, 59, 0.08), 0 1px 0 rgba(255,255,255,0.6) inset;
                border: 1px solid rgba(6, 78, 59, 0.05);
            }

            /* ---- Header banner ---- */
            .banner {
                background: linear-gradient(120deg, #053f30 0%, #0a6b4f 55%, #10b981 130%);
                padding: 24px 30px 22px;
                color: white;
                position: relative;
                overflow: hidden;
            }
            .banner::after {
                content: '';
                position: absolute;
                right: -50px; top: -50px;
                width: 170px; height: 170px;
                border-radius: 50%;
                background: rgba(255,255,255,0.07);
            }
            .banner::before {
                content: '';
                position: absolute;
                left: 40%; bottom: -40px;
                width: 90px; height: 90px;
                border-radius: 50%;
                background: rgba(255,255,255,0.05);
            }
            .banner-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                position: relative;
                z-index: 1;
            }
            .brand-mark {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .brand-icon {
                width: 38px; height: 38px;
                background: rgba(255,255,255,0.16);
                border: 1px solid rgba(255,255,255,0.32);
                border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                font-size: 16px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.12) inset;
            }
            .brand-mark h1 {
                font-size: 19px;
                font-weight: 800;
                letter-spacing: 0.3px;
                line-height: 1.15;
            }
            .brand-mark .sub {
                font-size: 9.5px;
                color: rgba(255,255,255,0.75);
                letter-spacing: 2.2px;
                text-transform: uppercase;
                font-weight: 600;
                margin-top: 3px;
            }
            .banner-right {
                text-align: right;
            }
            .awb-pill {
                background: rgba(255,255,255,0.16);
                border: 1px solid rgba(255,255,255,0.3);
                backdrop-filter: blur(4px);
                padding: 5px 13px;
                border-radius: 20px;
                font-size: 9.5px;
                font-weight: 700;
                letter-spacing: 1.5px;
                display: inline-block;
                margin-bottom: 7px;
            }
            .service-type {
                font-size: 13px;
                font-weight: 800;
                letter-spacing: 0.4px;
                opacity: 0.95;
            }

            /* ---- Body ---- */
            .body-inner { padding: 24px 30px 26px; }

            .tracking-block {
                background: linear-gradient(135deg, #f0fdf7 0%, #f8fafc 100%);
                border: 1.5px solid #d1f5e3;
                border-radius: 16px;
                padding: 18px 20px 15px;
                text-align: center;
                margin-bottom: 16px;
                position: relative;
                box-shadow: 0 1px 3px rgba(6, 78, 59, 0.04);
            }
            .tracking-block::before {
                content: '✦';
                position: absolute;
                top: 8px; left: 14px;
                color: #a7e9c9;
                font-size: 11px;
            }
            .tracking-block::after {
                content: '✦';
                position: absolute;
                top: 8px; right: 14px;
                color: #a7e9c9;
                font-size: 11px;
            }
            .tracking-number {
                font-family: 'JetBrains Mono', monospace;
                font-size: 22px;
                font-weight: 700;
                letter-spacing: 2.8px;
                color: #053f30;
            }
            .tracking-number .caption {
                font-size: 9.5px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1.4px;
                margin-top: 5px;
            }
            .barcode-strip {
                display: flex;
                align-items: stretch;
                justify-content: center;
                gap: 1.4px;
                height: 32px;
                margin: 14px 0 5px;
            }
            .barcode-caption {
                text-align: center;
                font-size: 8.5px;
                letter-spacing: 2.8px;
                color: #a3adba;
                text-transform: uppercase;
                font-family: 'JetBrains Mono', monospace;
            }

            .cn-block {
                text-align: center;
                margin: 14px 0 4px;
                padding: 11px;
                background: #eff6ff;
                border-radius: 14px;
                border: 1px solid #bfdbfe;
            }
            .cn-block .cn-num {
                font-family: 'JetBrains Mono', monospace;
                font-size: 15px;
                font-weight: 700;
                color: #1d4ed8;
                letter-spacing: 1.4px;
            }
            .cn-block .caption {
                font-size: 9px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-top: 3px;
            }

            .badge-row { display: flex; justify-content: center; margin: 16px 0; }
            .sync-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 9.5px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                padding: 6px 15px;
                border-radius: 20px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.04);
            }
            .sync-badge.synced { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .sync-badge.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

            /* ---- Route ---- */
            .route-strip {
                display: flex;
                align-items: center;
                gap: 14px;
                background: #f8fafc;
                border: 1px solid #f1f5f9;
                border-radius: 16px;
                padding: 14px 18px;
                margin-bottom: 18px;
            }
            .route-point { flex: 1; text-align: center; }
            .route-point .city {
                font-size: 13px;
                font-weight: 700;
                color: #053f30;
                letter-spacing: 0.1px;
            }
            .route-point .tag {
                font-size: 8.5px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
                margin-top: 2px;
            }
            .route-line {
                flex: 1.4;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .route-line .dots {
                flex: 1;
                height: 0;
                border-top: 2px dashed #cbd5e1;
            }
            .route-line .plane {
                color: #10b981;
                font-size: 14px;
                transform: rotate(90deg);
            }

            /* ---- Info sections ---- */
            .grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
                margin-bottom: 16px;
            }
            .info-card {
                border-radius: 15px;
                padding: 14px 16px;
                background: #fafbfc;
                border: 1px solid #eef1f4;
                border-left: 3px solid #10b981;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
            }
            .info-card.consignee { border-left-color: #2563eb; }
            .info-card .card-title {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1.1px;
                color: #64748b;
                margin-bottom: 8px;
            }
            .info-card .card-title i { color: #10b981; font-size: 10px; }
            .info-card.consignee .card-title i { color: #2563eb; }
            .info-card .name { font-size: 13.5px; font-weight: 700; color: #1e293b; margin-bottom: 3px; }
            .info-card .line { font-size: 11px; color: #64748b; line-height: 1.5; }
            .info-card .contact { font-size: 11px; color: #475569; margin-top: 6px; font-weight: 600; }
            .info-card .contact i { color: #94a3b8; margin-right: 4px; width: 11px; }

            .stats-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
                margin-bottom: 16px;
            }
            .stat-box {
                text-align: center;
                padding: 13px 6px;
                background: linear-gradient(150deg, #064e3b, #0a6b4f 70%, #0d7a5a);
                border-radius: 15px;
                color: white;
                box-shadow: 0 8px 18px -6px rgba(6, 78, 59, 0.4);
            }
            .stat-box .val { font-size: 17px; font-weight: 800; letter-spacing: 0.2px; }
            .stat-box .lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.9px; color: rgba(255,255,255,0.72); margin-top: 2px; font-weight: 600; }

            .detail-card {
                background: #fafbfc;
                border: 1px solid #eef1f4;
                border-radius: 15px;
                padding: 14px 16px;
                margin-bottom: 16px;
            }
            .detail-card .card-title {
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1.1px;
                color: #64748b;
                margin-bottom: 8px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                font-size: 11.5px;
                border-bottom: 1px dashed #eef1f4;
            }
            .detail-row:last-child { border-bottom: none; }
            .detail-row .k { color: #94a3b8; font-weight: 600; }
            .detail-row .v { color: #1e293b; font-weight: 600; text-align: right; }

            .signature-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 28px;
                margin: 22px 0 6px;
            }
            .signature-box {
                border-top: 1.5px solid #cbd5e1;
                padding-top: 7px;
                font-size: 9px;
                color: #94a3b8;
                text-align: center;
                letter-spacing: 0.5px;
                font-weight: 600;
            }

            .meta-footer {
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 6px;
                font-size: 9px;
                color: #94a3b8;
                padding-top: 12px;
                margin-top: 10px;
                border-top: 1px solid #eef1f4;
            }
            .meta-footer strong { color: #475569; }

            .terms-section {
                margin-top: 10px;
                font-size: 8px;
                color: #c2c9d1;
                line-height: 1.5;
            }
            .cute-signoff {
                text-align: center;
                font-size: 9.5px;
                color: #0a6b4f;
                font-weight: 700;
                margin-top: 14px;
                letter-spacing: 0.3px;
            }

            /* Force browsers to actually print background colors/gradients
               (Chrome/Edge/Firefox hide them by default to save ink). */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            @page { size: A4; margin: 10mm; }
            @media print {
                html, body { height: auto; }
                body { background: white; padding: 0; }
                .label-container {
                    box-shadow: none;
                    border-radius: 0;
                    max-width: 100%;
                }
                .info-card, .detail-card, .route-strip, .tracking-block {
                    page-break-inside: avoid;
                }
                .banner {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background: linear-gradient(120deg, #053f30 0%, #0a6b4f 55%, #10b981 130%) !important;
                }
                .stat-box {
                    background: linear-gradient(135deg, #064e3b, #0a6b4f) !important;
                }
                .no-print { display: none !important; }
            }
            @media (max-width: 600px) {
                .banner { padding: 16px 18px 14px; }
                .body-inner { padding: 16px 18px 18px; }
                .grid-2 { grid-template-columns: 1fr; }
                .stats-row { grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
                .tracking-number { font-size: 17px; letter-spacing: 1.8px; }
                .route-strip { flex-direction: column; }
                .route-line { width: 100%; }
                .route-line .plane { transform: rotate(180deg); }
                .signature-row { gap: 14px; }
            }
        </style>
    </head>
    <body>
        <div class="label-container" id="printContainer">

            <div class="banner">
                <div class="banner-row">
                    <div class="brand-mark">
                        <div class="brand-icon"><i class="fas fa-route"></i></div>
                        <div>
                            <h1>ROUTE 3 <span style="font-weight:400; opacity:0.85;">TRAX</span></h1>
                            <div class="sub">Smart Logistics Network</div>
                        </div>
                    </div>
                    <div class="banner-right">
                        <div class="awb-pill">AIRWAY BILL</div>
                        <div class="service-type">${(shipmentData.service || 'STANDARD').toUpperCase()}</div>
                    </div>
                </div>
            </div>

            <div class="body-inner">

                <div class="tracking-block">
                    <div class="tracking-number">${shipmentData.trackingNumber}</div>
                    <div class="caption">Tracking ID · Keep this number for reference</div>
                    <div class="barcode-strip">${barcodeBars}</div>
                    <div class="barcode-caption">${shipmentData.trackingNumber}</div>
                </div>

                ${shipmentData.customerCNumber ? `
                <div class="cn-block">
                    <div class="cn-num">${shipmentData.customerCNumber}</div>
                    <div class="caption">Customer C/N · Give this to your customer for tracking</div>
                </div>
                ` : ''}

                ${shipmentData.apxSynced && shipmentData.apxTrackingNumber ? `
                <div class="cn-block" style="background:#ecfdf5; border-color:#a7f3d0;">
                    <div class="cn-num" style="color:#047857;">${shipmentData.apxTrackingNumber}</div>
                    <div class="caption">APX/SmartCargo Tracking # · Verified authentic — trackable on APX too</div>
                </div>
                ` : ''}

                <div class="badge-row">
                    <span class="sync-badge ${apxSynced ? 'synced' : 'pending'}">
                        <i class="fas ${apxSynced ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${apxSynced ? 'APX Verified — Authentic Real Data' : 'Local ROUTE3 Record'}
                    </span>
                </div>

                <div class="route-strip">
                    <div class="route-point">
                        <div class="city">${shipmentData.origin || 'Pakistan'}</div>
                        <div class="tag">Origin</div>
                    </div>
                    <div class="route-line">
                        <div class="dots"></div>
                        <i class="fas fa-paper-plane plane"></i>
                        <div class="dots"></div>
                    </div>
                    <div class="route-point">
                        <div class="city">${shipmentData.destination || 'International'}</div>
                        <div class="tag">Destination</div>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="info-card">
                        <div class="card-title"><i class="fas fa-box"></i> Shipper</div>
                        <div class="name">${shipmentData.shipperName || 'N/A'}</div>
                        <div class="line">${shipmentData.shipperAddress || 'N/A'}</div>
                        <div class="line">${shipmentData.shipperCity || ''}</div>
                        <div class="contact"><i class="fas fa-phone"></i>${shipmentData.shipperPhone || 'N/A'}</div>
                    </div>
                    <div class="info-card consignee">
                        <div class="card-title"><i class="fas fa-map-marker-alt"></i> Consignee</div>
                        <div class="name">${shipmentData.consigneeName || 'N/A'}</div>
                        <div class="line">${shipmentData.consigneeAddress || 'N/A'}</div>
                        <div class="line">${shipmentData.consigneeCity || ''}</div>
                        <div class="contact"><i class="fas fa-phone"></i>${shipmentData.consigneePhone || 'N/A'}</div>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="stat-box">
                        <div class="val">${shipmentData.pieces || '1'}</div>
                        <div class="lbl">Pieces</div>
                    </div>
                    <div class="stat-box">
                        <div class="val">${shipmentData.weight || '0'} kg</div>
                        <div class="lbl">Weight</div>
                    </div>
                    <div class="stat-box">
                        <div class="val">$${shipmentData.cost || '0.00'}</div>
                        <div class="lbl">Cost</div>
                    </div>
                </div>

                <div class="detail-card">
                    <div class="card-title">Shipment Details</div>
                    <div class="detail-row"><span class="k">Description</span><span class="v">${shipmentData.description || 'N/A'}</span></div>
                    <div class="detail-row"><span class="k">Service</span><span class="v">${shipmentData.service || 'Standard'}</span></div>
                    <div class="detail-row"><span class="k">Date</span><span class="v">${shipmentData.createdDate ? new Date(shipmentData.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : dateStr}</span></div>
                    <div class="detail-row"><span class="k">Status</span><span class="v">${shipmentData.status || 'Created'}</span></div>
                </div>

                <div class="signature-row">
                    <div class="signature-box">Shipper Signature</div>
                    <div class="signature-box">Receiver Signature</div>
                </div>

                <div class="meta-footer">
                    <div><strong>Created by</strong> ${shipmentData.createdBy || currentUser?.email || 'N/A'}</div>
                    <div><strong>Printed</strong> ${dateStr}, ${timeStr}</div>
                    <div><strong>Ref</strong> ${shipmentData.reference || 'N/A'}</div>
                </div>

                <div class="terms-section">
                    This airway bill is issued subject to ROUTE3 TRAX standard terms & conditions. Liability for loss or damage is
                    limited as per the declared value and applicable service tier. Please retain this receipt until the shipment
                    is confirmed delivered.
                </div>

                <div class="cute-signoff">📦 Thank you for shipping with Route 3 TRAX! ✨</div>
            </div>
        </div>

        <script>
            async function downloadReceiptPDF() {
                const el = document.getElementById('printContainer');
                const filename = 'ROUTE3-AWB-${shipmentData.trackingNumber}.pdf';
                const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;

                // Wait for webfonts (Inter, JetBrains Mono, Font Awesome icon
                // glyphs) to actually finish loading before taking the
                // snapshot. This is why downloads were inconsistent — the
                // capture was sometimes happening mid-reflow (fonts still
                // swapping in), so the measured height/layout was different
                // every time, occasionally cutting content off entirely.
                if (document.fonts && document.fonts.ready) {
                    try { await document.fonts.ready; } catch (e) { /* ignore */ }
                }
                // Also wait for any images (barcode, icons, etc.) to finish loading.
                const pendingImages = Array.from(document.images || [])
                    .filter(img => !img.complete)
                    .map(img => new Promise(res => { img.onload = img.onerror = res; }));
                if (pendingImages.length) await Promise.all(pendingImages);

                // Give the browser two animation frames so any layout shift
                // caused by the font swap above is fully flushed before we
                // rasterize — otherwise the very first frame can still be stale.
                await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

                // Prefer capturing directly with html2canvas + jsPDF so we have
                // full control over sizing. Deliberately do NOT override
                // windowWidth/windowHeight here — forcing a narrower virtual
                // window causes the centered card to re-flow/shrink while the
                // page size was still calculated from its original width,
                // which is exactly what was causing the white space down the
                // sides. Capturing at the element's real, already-rendered
                // size keeps the canvas and the PDF page in sync.
                // Reset scroll position before capturing — if the receipt was
                // scrolled at all inside the modal, html2canvas would capture
                // starting from that scroll offset, which is exactly what was
                // causing blank space at the top and the bottom of the receipt
                // getting cut off.
                window.scrollTo(0, 0);

                if (window.html2canvas && jsPDFCtor) {
                    try {
                        const canvas = await window.html2canvas(el, {
                            scale: 2,
                            useCORS: true,
                            backgroundColor: '#ffffff',
                            scrollX: 0,
                            scrollY: 0,
                            x: 0,
                            y: 0
                        });

                        // Derive the page size FROM the actual captured canvas
                        // (not a separately-measured pre-capture width/height),
                        // so the image always fills the page exactly — no
                        // mismatch, no leftover margin, no forced minimum height.
                        const pdfWidthMM = 210; // A4 width
                        const pdfHeightMM = (canvas.height / canvas.width) * pdfWidthMM;

                        const pdf = new jsPDFCtor({
                            unit: 'mm',
                            format: [pdfWidthMM, pdfHeightMM],
                            orientation: 'portrait'
                        });

                        const imgData = canvas.toDataURL('image/jpeg', 0.98);
                        // Full-bleed: x=0, y=0, width=page width, height=page height.
                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMM, pdfHeightMM);
                        pdf.save(filename);
                        return;
                    } catch (err) {
                        console.error('PDF generation failed, falling back:', err);
                    }
                }

                // Fallback 1: the html2pdf.js wrapper, if the libraries above
                // weren't exposed as globals for some reason.
                if (window.html2pdf) {
                    window.html2pdf().set({
                        margin: 0,
                        filename,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                        pagebreak: { mode: ['avoid-all'] }
                    }).from(el).save();
                    return;
                }

                // Fallback 2: no PDF library loaded at all (e.g. no internet).
                window.print();
            }
        <\/script>
    </body>
    </html>
    `;
}

function printShipmentLabel(shipmentData) {
    const html = generateShipmentHTML(shipmentData);
    showReceiptModal(html);
}

function showReceiptModal(html) {
    let overlay = document.getElementById('receiptModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'receiptModalOverlay';
        overlay.className = 'receipt-modal-overlay';
        overlay.innerHTML = `
            <div class="receipt-modal-box">
                <button type="button" class="receipt-modal-close" id="receiptModalCloseBtn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                <iframe id="receiptModalFrame" class="receipt-modal-frame"></iframe>
                <div class="receipt-modal-footer no-print">
                    <button type="button" class="pdf-save-btn" id="receiptModalPdfBtn">
                        <i class="fas fa-file-pdf"></i> Save as PDF
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeReceiptModal();
        });
        document.getElementById('receiptModalCloseBtn').addEventListener('click', closeReceiptModal);
        document.getElementById('receiptModalPdfBtn').addEventListener('click', () => {
            const frame = document.getElementById('receiptModalFrame');
            if (frame?.contentWindow?.downloadReceiptPDF) {
                frame.contentWindow.downloadReceiptPDF();
            } else {
                frame?.contentWindow?.print();
            }
        });
    }

    const frame = document.getElementById('receiptModalFrame');
    frame.srcdoc = html;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeReceiptModal() {
    const overlay = document.getElementById('receiptModalOverlay');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
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
                    status: s.status || 'Created',
                    apxSynced: s.apxSynced || false,
                    apxSyncStatus: s.apxSyncStatus || 'not_configured',
                    apxTrackingNumber: s.apxTrackingNumber || null
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
    const apxTrackingNumber = document.getElementById('apxTrackingNumber')?.value?.trim() || '';

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
            destination: destinationCountry,
            apxTrackingNumber: apxTrackingNumber || undefined
        });
        
        let apxToastLine = '';
        if (result.apxSyncStatus === 'verified') {
            apxToastLine = '\n✅ APX Verified — authentic real tracking data';
        } else if (result.apxSyncStatus === 'verification_failed') {
            apxToastLine = '\n⚠️ APX number not found — please double-check it';
        }
        showToast(`✅ Shipment created!\nTracking: ${result.trackingNumber}\nCustomer C/N: ${result.customerCNumber}\nCost: $${result.cost}${apxToastLine}`, 'success');
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
            status: 'Created',
            apxSynced: result.apxSynced || false,
            apxSyncStatus: result.apxSyncStatus || 'not_configured',
            apxTrackingNumber: result.apxTrackingNumber || null
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
                        <div class="apx-sync-badge ${shipmentData.apxSynced ? 'synced' : 'pending'}" style="margin-top: 14px;">
                            <i class="fas ${shipmentData.apxSynced ? 'fa-check-circle' : (shipmentData.apxSyncStatus === 'verification_failed' ? 'fa-triangle-exclamation' : 'fa-clock')}"></i>
                            ${
                                shipmentData.apxSynced ? 'APX Verified — Authentic Real Data' :
                                shipmentData.apxSyncStatus === 'verification_failed' ? 'APX number not found — please check it' :
                                'Saved locally (no APX number linked)'
                            }
                        </div>
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
            setAuthView(tab.dataset.tab);
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

    // ---- OTP verification screen ----
    document.getElementById('otpFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyOtp();
    });

    document.getElementById('resendOtpBtn')?.addEventListener('click', resendOtp);

    document.getElementById('backToSignupBtn')?.addEventListener('click', () => {
        setAuthView('signup');
    });

    // OTP digit boxes: auto-advance forward/back, digits-only, paste support
    const otpDigits = document.querySelectorAll('.otp-digit');
    otpDigits.forEach((input, idx) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);
            if (input.value && idx < otpDigits.length - 1) {
                otpDigits[idx + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
                otpDigits[idx - 1].focus();
            }
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
            pasted.split('').forEach((digit, i) => {
                if (otpDigits[i]) otpDigits[i].value = digit;
            });
            otpDigits[Math.min(pasted.length, otpDigits.length - 1)]?.focus();
        });
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