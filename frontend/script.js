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
    // Check if already exists
    const existingIndex = trackedShipmentsHistory.findIndex(s => s.trackingNumber === trackingNumber);
    
    const trackedEntry = {
        trackingNumber: trackingNumber,
        latestStatus: shipmentData.latestStatus,
        latestLocation: shipmentData.latestLocation,
        lastUpdate: shipmentData.lastUpdate,
        timestamp: new Date().toISOString(),
        data: shipmentData
    };
    
    if (existingIndex !== -1) {
        // Update existing
        trackedShipmentsHistory[existingIndex] = trackedEntry;
    } else {
        // Add new at beginning
        trackedShipmentsHistory.unshift(trackedEntry);
    }
    
    // Keep only last 20 tracked shipments
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

function showDashboard() {
    document.getElementById('welcomeScreen').classList.add('hide');
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    updateBackgroundForDashboard();
    if (currentUser) {
        document.getElementById('userName').innerText = currentUser.name || currentUser.email.split('@')[0];
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

// ==================== AUTH ====================
async function signup(name, email, phone, password) {
    showLoading(true);
    try {
        const result = await apiRequest('/auth/signup', 'POST', { name, email, phone, password });
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showLoading(false);
        showDashboard();
    } catch (error) {
        showLoading(false);
        alert(error.message || 'Signup failed');
    }
}

async function login(email, password) {
    showLoading(true);
    try {
        const result = await apiRequest('/auth/login', 'POST', { email, password });
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showLoading(false);
        showDashboard();
    } catch (error) {
        showLoading(false);
        alert(error.message || 'Invalid email or password');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showAuth();
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
    }
}

async function loadProfilePage() {
    const content = document.getElementById('dashboardContent');
    try {
        const balanceResult = await apiRequest('/auth/balance', 'GET');
        const balance = balanceResult.balance || 0;
        
        content.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-title">
                        <i class="fas fa-id-card"></i>
                        <h2>Account Overview</h2>
                    </div>
                    <button onclick="editProfile()" class="edit-profile-btn">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                </div>
                <div class="profile-field">
                    <label>Full Name</label>
                    <input type="text" value="${escapeHtml(currentUser?.name || '')}" readonly>
                </div>
                <div class="profile-field">
                    <label>Email Address</label>
                    <input type="email" value="${escapeHtml(currentUser?.email || '')}" readonly>
                </div>
                <div class="profile-field">
                    <label>Phone Number</label>
                    <input type="tel" value="${escapeHtml(currentUser?.phone || '')}" readonly>
                </div>
                <div class="profile-field">
                    <label>Account Balance</label>
                    <input type="text" value="$${balance.toFixed(2)} USD" readonly style="background: linear-gradient(135deg, #e0f2fe, #fff); font-weight: bold; font-size: 18px;">
                </div>
                <div style="margin-top: 32px; background: linear-gradient(115deg, #eef2ff, white); border-radius: 28px; padding: 24px;">
                    <i class="fas fa-truck-fast" style="color: #0ea5e9; font-size: 24px;"></i>
                    <strong style="display: block; margin-top: 12px;">TRAX Smart Network</strong>
                    <p style="color: #475569; margin-top: 8px;">Real-time AI tracking, carbon-aware routing, and intelligent logistics management.</p>
                    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="showAddFundsModal()" class="btn-primary">+ Add Funds</button>
                        <button onclick="showRateCalculator()" class="btn-secondary"><i class="fas fa-calculator"></i> Rate</button>
                        <button onclick="openSupportModal()" class="btn-secondary"><i class="fas fa-ticket-alt"></i> Support</button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="profile-card"><p>Error: ${error.message}</p></div>`;
    }
}

async function editProfile() {
    const content = document.getElementById('dashboardContent');
    try {
        const balanceResult = await apiRequest('/auth/balance', 'GET');
        const balance = balanceResult.balance || 0;
        
        content.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-title">
                        <i class="fas fa-user-edit"></i>
                        <h2>Edit Profile</h2>
                    </div>
                    <button onclick="loadProfilePage()" class="edit-profile-btn cancel-btn">Cancel</button>
                </div>
                <form id="profileEditForm">
                    <div class="profile-field">
                        <label>Full Name</label>
                        <input type="text" id="editName" value="${escapeHtml(currentUser?.name || '')}" required>
                    </div>
                    <div class="profile-field">
                        <label>Email Address</label>
                        <input type="email" id="editEmail" value="${escapeHtml(currentUser?.email || '')}" required>
                    </div>
                    <div class="profile-field">
                        <label>Phone Number</label>
                        <input type="tel" id="editPhone" value="${escapeHtml(currentUser?.phone || '')}" required>
                    </div>
                    <div class="profile-field">
                        <label>New Password (optional)</label>
                        <input type="password" id="editPassword" placeholder="Min 6 characters">
                    </div>
                    <div class="profile-field">
                        <label>Account Balance</label>
                        <input type="text" value="$${balance.toFixed(2)} USD" readonly>
                    </div>
                    <button type="submit" class="btn-primary">Save Changes</button>
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
        alert('Please fill all fields');
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
        alert('Profile updated!');
        loadProfilePage();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function loadTrackPage() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="track-form">
            <h3><i class="fas fa-map-marked-alt"></i> Live Tracking</h3>
            <p style="color: #475569;">Enter your tracking number for real-time updates</p>
            <div class="track-input-group">
                <input type="text" id="trackingInput" placeholder="e.g., 1350120891, 1350215374, TRX12345678">
                <button onclick="trackShipment()"><i class="fas fa-search"></i> Track</button>
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

// ==================== ENHANCED TRACKING DISPLAY WITH HISTORY SAVE ====================
function displayTrackingInfo(shipment, resultDiv) {
    const sortedTimeline = [...(shipment.timeline || [])].sort((a, b) => 
        new Date(a.rawTimeForSort || a.date) - new Date(b.rawTimeForSort || b.date)
    );
    
    // Calculate progress
    const totalStatuses = 10;
    const currentStage = sortedTimeline.length;
    const progressPercent = Math.min((currentStage / totalStatuses) * 100, 100);
    
    // Source badge
    let sourceBadge = '';
    if (shipment.usedPython) {
        sourceBadge = '<span class="source-badge real"><i class="fas fa-check-circle"></i> Live APX Data</span>';
    } else if (shipment.isFallback || shipment.isGenerated) {
        sourceBadge = '<span class="source-badge fallback"><i class="fas fa-database"></i> Estimated Data</span>';
    } else if (shipment.fromCache) {
        sourceBadge = '<span class="source-badge cached"><i class="fas fa-history"></i> Cached Data</span>';
    } else {
        sourceBadge = '<span class="source-badge real"><i class="fas fa-check-circle"></i> Verified Data</span>';
    }
    
    // Timeline rows
    let timelineRows = '';
    sortedTimeline.forEach((event, index) => {
        const isCurrent = index === sortedTimeline.length - 1;
        timelineRows += `
            <tr class="${isCurrent ? 'current-event' : ''}">
                <td style="width: 50px; text-align: center;">
                    <div class="timeline-dot ${isCurrent ? 'active' : ''}"></div>
                </td>
                <td>
                    <strong>${escapeHtml(event.status)}</strong>
                    ${isCurrent ? '<span class="current-badge">Current</span>' : ''}
                </td>
                <td><i class="fas fa-map-marker-alt" style="color: #10b981; margin-right: 8px;"></i>${escapeHtml(event.location)}</td>
                <td><i class="far fa-calendar-alt" style="color: #10b981; margin-right: 8px;"></i>${escapeHtml(event.date)} ${escapeHtml(event.time)}</td>
            </tr>
        `;
    });
    
    resultDiv.innerHTML = `
        <div class="tracking-card">
            <div class="tracking-header">
                <div class="tracking-number-large">
                    <i class="fas fa-qrcode"></i>
                    <span>${escapeHtml(shipment.trackingNumber)}</span>
                    ${sourceBadge}
                </div>
                <button onclick="refreshTrackingData('${escapeHtml(shipment.trackingNumber)}')" class="refresh-btn">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
            
            <div class="progress-section">
                <div class="progress-label">
                    <span><i class="fas fa-chart-line"></i> Shipment Progress</span>
                    <span>${currentStage}/${totalStatuses} Events</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
            
            <div class="tracking-grid">
                <div class="tracking-info-card">
                    <i class="fas fa-box"></i>
                    <div>
                        <small>Current Status</small>
                        <strong>${escapeHtml(shipment.latestStatus)}</strong>
                    </div>
                </div>
                <div class="tracking-info-card">
                    <i class="fas fa-map-pin"></i>
                    <div>
                        <small>Current Location</small>
                        <strong>${escapeHtml(shipment.latestLocation)}</strong>
                    </div>
                </div>
                <div class="tracking-info-card">
                    <i class="fas fa-clock"></i>
                    <div>
                        <small>Last Update</small>
                        <strong>${escapeHtml(shipment.lastUpdate)}</strong>
                    </div>
                </div>
            </div>
            
            ${shipment.shipmentDetails ? `
            <div class="shipment-details">
                <h4><i class="fas fa-info-circle"></i> Shipment Details</h4>
                <div class="details-grid">
                    <div><span>Service Type</span>${escapeHtml(shipment.shipmentDetails.service || 'Express')}</div>
                    <div><span>Weight</span>${escapeHtml(shipment.shipmentDetails.weight || 'N/A')} kg</div>
                    <div><span>Pieces</span>${escapeHtml(shipment.shipmentDetails.pieces || '1')}</div>
                    <div><span>Shipment Date</span>${escapeHtml(shipment.shipmentDetails.date || 'N/A')}</div>
                </div>
            </div>
            ` : ''}
            
            <div class="timeline-container">
                <h4><i class="fas fa-history"></i> Timeline</h4>
                <div style="overflow-x: auto;">
                    <table class="timeline-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;"></th>
                                <th>Event</th>
                                <th>Location</th>
                                <th>Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${timelineRows || '<tr><td colspan="4" style="text-align: center;">No timeline data available</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function trackShipment() {
    const input = document.getElementById('trackingInput');
    const trackingNumber = input?.value.trim();
    
    if (!trackingNumber) {
        alert('Please enter a tracking number');
        return;
    }
    
    const resultDiv = document.getElementById('trackingResult');
    if (!resultDiv) return;
    
    showLoading(true);
    try {
        const shipment = await apiRequest(`/track/${trackingNumber}`, 'GET');
        
        // Save to tracked history
        saveTrackedShipment(trackingNumber, shipment);
        
        displayTrackingInfo(shipment, resultDiv);
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="tracking-card" style="background: linear-gradient(135deg, #991b1b, #7f1d1d); color: white;">
                <p><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</p>
                <p style="margin-top: 10px;">Please check the tracking number and try again.</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

async function refreshTrackingData(trackingNumber) {
    showLoading(true);
    try {
        await apiRequest(`/track/refresh/${trackingNumber}`, 'POST');
        const shipment = await apiRequest(`/track/${trackingNumber}`, 'GET');
        
        // Update in tracked history
        saveTrackedShipment(trackingNumber, shipment);
        
        displayTrackingInfo(shipment, document.getElementById('trackingResult'));
    } catch (error) {
        alert('Error refreshing: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== TRACKED HISTORY PAGE ====================
function loadTrackedHistoryPage() {
    const content = document.getElementById('dashboardContent');
    const history = getTrackedShipmentsHistory();
    
    if (history.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 60px; background: white; border-radius: 32px;">
                <i class="fas fa-history" style="font-size: 64px; color: #cbd5e1;"></i>
                <h3 style="margin-top: 20px;">No Tracked Shipments Yet</h3>
                <p style="color: #64748b;">Go to Track Shipment and search for a tracking number</p>
                <button onclick="document.querySelector('.nav-btn[data-page=\\'track\\']').click()" class="btn-primary" style="margin-top: 20px;">
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
        
        historyCards += `
            <div class="tracked-card" onclick="quickTrackFromHistory('${escapeHtml(shipment.trackingNumber)}')">
                <div class="tracked-card-header">
                    <div class="tracked-number">
                        <i class="fas fa-qrcode"></i>
                        <strong>${escapeHtml(shipment.trackingNumber)}</strong>
                    </div>
                    <div class="tracked-time">
                        <i class="far fa-clock"></i> ${formattedDate}
                    </div>
                </div>
                <div class="tracked-card-body">
                    <div class="tracked-status">
                        <span class="status-badge" style="background: #10b981;">${escapeHtml(shipment.latestStatus)}</span>
                    </div>
                    <div class="tracked-location">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(shipment.latestLocation)}
                    </div>
                    <div class="tracked-update">
                        <i class="fas fa-clock"></i> ${escapeHtml(shipment.lastUpdate)}
                    </div>
                </div>
                <div class="tracked-card-footer">
                    <button onclick="event.stopPropagation(); quickTrackFromHistory('${escapeHtml(shipment.trackingNumber)}')" class="btn-primary" style="padding: 8px 16px; font-size: 12px;">
                        <i class="fas fa-search"></i> Track Again
                    </button>
                    <button onclick="event.stopPropagation(); removeFromHistory('${escapeHtml(shipment.trackingNumber)}')" class="btn-secondary" style="padding: 8px 16px; font-size: 12px; background: #fee2e2; color: #991b1b;">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = `
        <div class="tracked-history-container">
            <div class="tracked-history-header">
                <h3><i class="fas fa-history"></i> Recently Tracked Shipments</h3>
                ${history.length > 0 ? `<button onclick="clearAllHistory()" class="clear-history-btn"><i class="fas fa-trash-alt"></i> Clear All</button>` : ''}
            </div>
            <div class="tracked-history-grid">
                ${historyCards}
            </div>
        </div>
    `;
}

function quickTrackFromHistory(trackingNumber) {
    // Switch to track page
    document.querySelector('.nav-btn[data-page="track"]').click();
    setTimeout(() => {
        const input = document.getElementById('trackingInput');
        if (input) {
            input.value = trackingNumber;
            trackShipment();
        }
    }, 100);
}

function removeFromHistory(trackingNumber) {
    trackedShipmentsHistory = trackedShipmentsHistory.filter(s => s.trackingNumber !== trackingNumber);
    localStorage.setItem('trackedShipmentsHistory', JSON.stringify(trackedShipmentsHistory));
    loadTrackedHistoryPage();
}

function clearAllHistory() {
    if (confirm('Are you sure you want to clear all tracked shipment history?')) {
        trackedShipmentsHistory = [];
        localStorage.setItem('trackedShipmentsHistory', JSON.stringify(trackedShipmentsHistory));
        loadTrackedHistoryPage();
    }
}

// ==================== SHIPMENTS PAGE ====================
async function loadShipmentsPage() {
    const content = document.getElementById('dashboardContent');
    showLoading(true);
    try {
        const result = await apiRequest('/auth/shipments', 'GET');
        const shipments = result.shipments || [];
        
        if (shipments.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 60px; background: white; border-radius: 32px;">
                    <i class="fas fa-box-open" style="font-size: 64px; color: #cbd5e1;"></i>
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
                    <td><strong>${escapeHtml(s.trackingNumber)}</strong></td>
                    <td><span class="status-badge">${escapeHtml(s.latestStatus)}</span></td>
                    <td>${escapeHtml(s.origin)}</td>
                    <td>${escapeHtml(s.destination)}</td>
                    <td>${escapeHtml(s.lastUpdate)}</td>
                    <td><button class="btn-secondary" onclick="quickTrackFromMyShipments('${escapeHtml(s.trackingNumber)}')">Track</button></td>
                </tr>
            `;
        });
        
        content.innerHTML = `
            <h3><i class="fas fa-history"></i> My Shipments</h3>
            <div style="overflow-x: auto; background: white; border-radius: 32px; margin-top: 20px;">
                <table class="shipments-table">
                    <thead>
                        <tr><th>Tracking Number</th><th>Status</th><th>Origin</th><th>Destination</th><th>Last Update</th><th>Action</th></tr>
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
        <div style="background: white; border-radius: 40px; padding: 40px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <i class="fas fa-headset" style="font-size: 48px; color: #10b981;"></i>
                <h2>Customer Support</h2>
                <p>We're here to help you 24/7</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
                <div style="background: #ecfdf5; border-radius: 24px; padding: 24px; text-align: center;">
                    <i class="fas fa-phone-alt" style="font-size: 32px; color: #10b981;"></i>
                    <h3>Call Us</h3>
                    <p style="font-weight: 600;">+92 315 6333863</p>
                </div>
                <div style="background: #ecfdf5; border-radius: 24px; padding: 24px; text-align: center;">
                    <i class="fas fa-envelope" style="font-size: 32px; color: #10b981;"></i>
                    <h3>Email Us</h3>
                    <p style="font-weight: 600;">support@traxlogistics.com</p>
                </div>
                <div style="background: #ecfdf5; border-radius: 24px; padding: 24px; text-align: center;">
                    <i class="fab fa-whatsapp" style="font-size: 32px; color: #25D366;"></i>
                    <h3>WhatsApp</h3>
                    <p style="font-weight: 600;">+92 315 6333863</p>
                </div>
            </div>
        </div>
    `;
}

// ==================== SHIPMENT CREATION ====================
async function createShipment(event) {
    event.preventDefault();
    const shipperName = document.getElementById('shipperName')?.value;
    const consigneeName = document.getElementById('consigneeName')?.value;
    const description = document.getElementById('parcelDescription')?.value;
    const weight = document.getElementById('weight')?.value;
    const quantity = document.getElementById('quantity')?.value;
    
    if (!shipperName || !consigneeName || !description) {
        alert('Please fill required fields');
        return;
    }
    
    showLoading(true);
    try {
        const result = await apiRequest('/auth/create-shipment', 'POST', {
            shipperName, consigneeName, description, weight: weight || 1, quantity: quantity || 1
        });
        alert(`✅ Shipment created!\nTracking: ${result.trackingNumber}\nCost: $${result.cost}\nBalance: $${result.balance}`);
        closeShipmentModal();
        loadDashboardContent();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== ADD FUNDS ====================
window.showAddFundsModal = function() {
    const amount = prompt("Enter amount to add (USD):", "100");
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        addFunds(parseFloat(amount));
    }
};

async function addFunds(amount) {
    showLoading(true);
    try {
        const result = await apiRequest('/auth/add-funds', 'POST', { amount });
        alert(result.message || `Added $${amount}`);
        loadProfilePage();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
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
                    <input type="text" id="ticketSubject" placeholder="Subject" style="width:100%; padding:12px; margin-bottom:12px; border-radius:20px; border:1px solid #d1fae5;">
                    <textarea id="ticketMessage" rows="5" placeholder="Describe your issue..." style="width:100%; padding:12px; border-radius:20px; border:1px solid #d1fae5;"></textarea>
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
    if (!subject || !message) return alert('Please fill all fields');
    showLoading(true);
    try {
        const result = await apiRequest('/auth/support-ticket', 'POST', { subject, message });
        alert(`Ticket ${result.ticketNumber} created!`);
        closeSupportModal();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== MODALS ====================
function openShipmentModal() {
    const modal = document.getElementById('shipmentModal');
    if (modal) {
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
    
    document.getElementById('getStartedBtn')?.addEventListener('click', showAuth);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('loginForm').classList.toggle('active', tab.dataset.tab === 'login');
            document.getElementById('signupForm').classList.toggle('active', tab.dataset.tab === 'signup');
        });
    });
    
    // Login form
    document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        if (email && password) login(email, password);
        else alert('Enter email and password');
    });
    
    // Signup form
    document.getElementById('signupFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        if (!name || !email || !phone || !password) alert('Fill all fields');
        else if (password.length < 6) alert('Password min 6 characters');
        else signup(name, email, phone, password);
    });
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadDashboardContent();
        });
    });
    
    // Shipment modal
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
window.showAddFundsModal = showAddFundsModal;
window.refreshTrackingData = refreshTrackingData;
window.quickTrackFromHistory = quickTrackFromHistory;
window.removeFromHistory = removeFromHistory;
window.clearAllHistory = clearAllHistory;
window.quickTrackFromMyShipments = quickTrackFromMyShipments;