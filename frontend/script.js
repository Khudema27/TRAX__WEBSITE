// ==================== API CONFIGURATION ====================
const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// ==================== PARTICLE BACKGROUND ====================
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

// ==================== BACKGROUND UPDATES ====================
function updateBackgroundForWelcome() {
    const bg = document.getElementById('dynamicBg');
    bg.style.backgroundImage = "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format')";
}

function updateBackgroundForAuth() {
    const bg = document.getElementById('dynamicBg');
    bg.style.backgroundImage = "url('https://images.unsplash.com/photo-1566576912321-d4a1ef2cf5e7?q=80&w=2069&auto=format')";
}

function updateBackgroundForDashboard() {
    const bg = document.getElementById('dynamicBg');
    bg.style.backgroundImage = "url('https://images.unsplash.com/photo-1580679568899-8b7cdf224ab6?q=80&w=2044&auto=format')";
}

// ==================== API HELPER FUNCTIONS ====================
async function apiRequest(endpoint, method = 'GET', data = null) {
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
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
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

// ==================== AUTH FUNCTIONS ====================
async function signup(name, email, phone, password) {
    showLoading(true);
    
    try {
        const result = await apiRequest('/auth/signup', 'POST', {
            name, email, phone, password
        });
        
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showLoading(false);
        showDashboard();
    } catch (error) {
        showLoading(false);
        alert(error.message || 'Signup failed. Please try again.');
    }
}

async function login(email, password) {
    showLoading(true);
    
    try {
        const result = await apiRequest('/auth/login', 'POST', {
            email, password
        });
        
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

// ==================== DASHBOARD FUNCTIONS ====================
async function loadDashboardContent() {
    const activePage = document.querySelector('.nav-btn.active').dataset.page;
    
    switch (activePage) {
        case 'profile':
            await loadProfilePage();
            break;
        case 'track':
            loadTrackPage();
            break;
        case 'shipments':
            await loadShipmentsPage();
            break;
        case 'contact':
            await loadContactPage();
            break;
    }
}

async function loadProfilePage() {
    const content = document.getElementById('dashboardContent');
    
    try {
        const balanceResult = await apiRequest('/auth/balance', 'GET');
        const balance = balanceResult.balance || 0;
        
        const transactionsResult = await apiRequest('/auth/transactions', 'GET');
        const transactions = transactionsResult.transactions || [];
        
        let transactionsHtml = '';
        if (transactions.length > 0) {
            transactionsHtml = `
                <div style="margin-top: 32px;">
                    <h4><i class="fas fa-history"></i> Recent Transactions</h4>
                    <div style="overflow-x: auto; margin-top: 16px;">
                        <table style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #ecfdf5;">
                                    <th style="padding: 12px; text-align: left;">Date</th>
                                    <th style="padding: 12px; text-align: left;">Type</th>
                                    <th style="padding: 12px; text-align: left;">Amount</th>
                                    <th style="padding: 12px; text-align: left;">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transactions.slice(0, 5).map(t => `
                                    <tr style="border-bottom: 1px solid #d1fae5;">
                                        <td style="padding: 12px;">${new Date(t.createdAt).toLocaleDateString()}</td>
                                        <td style="padding: 12px;">
                                            <span class="status-badge" style="background: ${t.type === 'deposit' ? '#10b981' : '#f59e0b'}; font-size: 11px;">
                                                ${t.type === 'deposit' ? '+ Deposit' : 'Payment'}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; font-weight: 600;">$${t.amount.toFixed(2)}</td>
                                        <td style="padding: 12px;">${escapeHtml(t.description)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-title">
                        <i class="fas fa-id-card"></i>
                        <h2>Account Overview</h2>
                    </div>
                    <button onclick="editProfile()" class="edit-profile-btn">
                        <i class="fas fa-pen"></i> <span>Edit</span>
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
                <div class="profile-field">
                    <label>Member Since</label>
                    <input type="text" value="${currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}" readonly>
                </div>
                ${transactionsHtml}
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
        content.innerHTML = `<div class="profile-card"><p>Error loading profile: ${error.message}</p></div>`;
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
                    <button onclick="loadProfilePage()" class="edit-profile-btn cancel-btn">
                        <i class="fas fa-times"></i> <span>Cancel</span>
                    </button>
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
                        <label>Change Password (leave blank to keep current)</label>
                        <input type="password" id="editPassword" placeholder="New password (min 6 characters)">
                    </div>
                    <div class="profile-field">
                        <label>Account Balance</label>
                        <input type="text" value="$${balance.toFixed(2)} USD" readonly style="background: linear-gradient(135deg, #e0f2fe, #fff); font-weight: bold; font-size: 18px;">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('profileEditForm').addEventListener('submit', saveProfileChanges);
    } catch (error) {
        content.innerHTML = `<div class="profile-card"><p>Error loading profile: ${error.message}</p></div>`;
    }
}

async function saveProfileChanges(e) {
    e.preventDefault();
    
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const password = document.getElementById('editPassword').value;
    
    if (!name || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (password && password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    showLoading(true);
    
    try {
        const updateData = { name, email, phone };
        if (password) updateData.password = password;
        
        const result = await apiRequest('/auth/update-profile', 'PUT', updateData);
        
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('userName').innerText = currentUser.name || currentUser.email.split('@')[0];
        
        alert('Profile updated successfully!');
        loadProfilePage();
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function loadTrackPage() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="track-form">
            <h3><i class="fas fa-map-marked-alt"></i> Live Tracking</h3>
            <p style="color: #475569; margin-top: 6px;">Enter your tracking number for real-time updates</p>
            <div class="track-input-group">
                <input type="text" id="trackingInput" placeholder="Enter Tracking Number (e.g., 1350120891, TRX...)" autocomplete="off">
                <button onclick="trackShipmentFromInput()"><i class="fas fa-search"></i> Track</button>
            </div>
        </div>
        <div id="trackingResult"></div>
    `;
}

async function trackShipmentWithMap(trackingNumber) {
    const resultDiv = document.getElementById('trackingResult');
    if (!resultDiv) {
        loadTrackPage();
        setTimeout(() => trackShipmentWithMap(trackingNumber), 100);
        return;
    }
    
    showLoading(true);
    
    try {
        const shipment = await apiRequest(`/track/${trackingNumber}`, 'GET');
        
        let timelineRows = '';
        const sortedTimeline = [...(shipment.timeline || [])];
        for (let event of sortedTimeline) {
            const displayDateTime = event.time === "N/A" ? event.date : `${event.date} ${event.time}`;
            timelineRows += `
                <tr>
                    <td style="width: 40px;"><i class="fas fa-map-marker-alt" style="color: #38bdf8;"></i></td>
                    <td><strong>${escapeHtml(event.status)}</strong></td>
                    <td>${escapeHtml(event.location)}</td>
                    <td>${escapeHtml(displayDateTime)}</td>
                </tr>
            `;
        }
        
        const locationMap = {
            'ISLAMABAD': { lat: 33.6844, lon: 73.0479, name: 'Islamabad' },
            'KARACHI': { lat: 24.8607, lon: 67.0011, name: 'Karachi' },
            'LAHORE': { lat: 31.5497, lon: 74.3436, name: 'Lahore' },
            'DUBAI': { lat: 25.2048, lon: 55.2708, name: 'Dubai' },
            'RAWALPINDI': { lat: 33.5651, lon: 73.0169, name: 'Rawalpindi' }
        };
        
        let currentLocation = locationMap[shipment.latestLocation.split('-')[0].trim()] || locationMap['DUBAI'];
        
        resultDiv.innerHTML = `
            <div class="tracking-card">
                <div class="tracking-grid">
                    <div>
                        <strong>📦 Tracking Number</strong><br>
                        <span style="font-size: 22px; font-weight: 800;">${escapeHtml(shipment.trackingNumber)}</span>
                    </div>
                    <div>
                        <strong>📍 Current Status</strong><br>
                        <span class="status-badge">${escapeHtml(shipment.latestStatus)}</span>
                    </div>
                    <div>
                        <strong>🌍 Last Location</strong><br>
                        <i class="fas fa-location-dot"></i> ${escapeHtml(shipment.latestLocation)}
                    </div>
                    <div>
                        <strong>🕒 Last Update</strong><br>
                        <i class="far fa-clock"></i> ${escapeHtml(shipment.lastUpdate)}
                    </div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 28px; overflow: hidden; margin-bottom: 20px;">
                <h3 style="padding: 24px 24px 0 24px;"><i class="fas fa-map"></i> Live Location Map</h3>
                <div id="mapContainer" style="height: 300px; margin: 16px; border-radius: 20px; overflow: hidden; background: #e2e8f0; position: relative;">
                    <iframe 
                        src="https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lon-0.5},${currentLocation.lat-0.5},${currentLocation.lon+0.5},${currentLocation.lat+0.5}&layer=mapnik&marker=${currentLocation.lat},${currentLocation.lon}"
                        style="width: 100%; height: 100%; border: 0;">
                    </iframe>
                    <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px;">
                        <i class="fas fa-map-pin"></i> Current location: ${currentLocation.name}
                    </div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 28px; overflow: hidden;">
                <h3 style="padding: 24px 24px 0 24px;">Shipment Timeline</h3>
                <div style="overflow-x: auto;">
                    <table class="timeline-table">
                        <thead>
                            <tr><th></th><th>Event</th><th>Location</th><th>Date & Time</th></tr>
                        </thead>
                        <tbody>${timelineRows || '<tr><td colspan="4" style="text-align:center">No timeline data available</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="tracking-card" style="background: linear-gradient(125deg, #991b1b, #7f1d1d);">
                <p><i class="fas fa-exclamation-triangle"></i> Tracking number not found: ${escapeHtml(trackingNumber)}</p>
                <p style="margin-top: 10px;">Please check the number and try again.</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

window.trackShipment = trackShipmentWithMap;

function trackShipmentFromInput() {
    const input = document.getElementById('trackingInput');
    const trackingNumber = input ? input.value.trim() : '';
    if (trackingNumber) {
        trackShipmentWithMap(trackingNumber);
    } else {
        alert('Please enter a tracking number');
    }
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

async function loadShipmentsPage() {
    const content = document.getElementById('dashboardContent');
    
    showLoading(true);
    
    try {
        const result = await apiRequest('/auth/shipments', 'GET');
        const shipments = result.shipments || [];
        
        if (shipments.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 32px;">
                    <i class="fas fa-box-open" style="font-size: 64px; color: #cbd5e1;"></i>
                    <h3 style="margin-top: 20px; color: #475569;">No Shipments Yet</h3>
                    <p style="margin-top: 8px; color: #64748b;">Click the + button to create your first shipment</p>
                </div>
            `;
            return;
        }
        
        let rows = '';
        shipments.forEach(shipment => {
            rows += `
                <tr>
                    <td><strong>${escapeHtml(shipment.trackingNumber)}</strong></td>
                    <td><span class="status-badge" style="background:#e6f7ff; color:#0369a1;">${escapeHtml(shipment.latestStatus)}</span></td>
                    <td>${escapeHtml(shipment.origin)}</td>
                    <td>${escapeHtml(shipment.destination)}</td>
                    <td>${escapeHtml(shipment.lastUpdate)}</td>
                    <td><button class="btn-secondary" style="padding: 6px 20px;" onclick="quickTrack('${escapeHtml(shipment.trackingNumber)}')">Track</button></td>
                </tr>
            `;
        });
        
        content.innerHTML = `
            <h3 style="margin-bottom: 24px;"><i class="fas fa-history"></i> My Shipments</h3>
            <div style="overflow-x: auto; background: white; border-radius: 32px;">
                <table class="shipments-table">
                    <thead>
                        <tr>
                            <th>Tracking Number</th>
                            <th>Status</th>
                            <th>Origin</th>
                            <th>Destination</th>
                            <th>Last Update</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div style="padding: 40px; text-align: center;"><p>Error loading shipments: ${error.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

window.quickTrack = function(trackingNumber) {
    document.querySelector('.nav-btn[data-page="track"]').click();
    setTimeout(() => {
        const input = document.getElementById('trackingInput');
        if (input) {
            input.value = trackingNumber;
            trackShipmentWithMap(trackingNumber);
        }
    }, 100);
};

// ==================== CONTACT PAGE ====================
async function loadContactPage() {
    const content = document.getElementById('dashboardContent');
    
    let ticketsHtml = '';
    try {
        const ticketsResult = await apiRequest('/auth/support-tickets', 'GET');
        const tickets = ticketsResult.tickets || [];
        
        if (tickets.length > 0) {
            ticketsHtml = `
                <div style="margin-top: 32px;">
                    <h3 style="margin-bottom: 20px;"><i class="fas fa-ticket-alt"></i> My Support Tickets</h3>
                    <div style="overflow-x: auto;">
                        <table style="width:100%; border-collapse: collapse; background: white; border-radius: 20px; overflow: hidden;">
                            <thead>
                                <tr style="background: #ecfdf5;">
                                    <th style="padding: 12px; text-align: left;">Ticket #</th>
                                    <th style="padding: 12px; text-align: left;">Subject</th>
                                    <th style="padding: 12px; text-align: left;">Status</th>
                                    <th style="padding: 12px; text-align: left;">Priority</th>
                                    <th style="padding: 12px; text-align: left;">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tickets.map(t => `
                                    <tr style="border-bottom: 1px solid #d1fae5;">
                                        <td style="padding: 12px;">${t.ticketNumber}</td>
                                        <td style="padding: 12px;">${escapeHtml(t.subject)}</td>
                                        <td style="padding: 12px;">
                                            <span class="status-badge" style="background: ${t.status === 'open' ? '#f59e0b' : (t.status === 'resolved' ? '#10b981' : '#64748b')};">
                                                ${t.status}
                                            </span>
                                        </td>
                                        <td style="padding: 12px;">${t.priority}</td>
                                        <td style="padding: 12px;">${new Date(t.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching tickets:', error);
    }
    
    content.innerHTML = `
        <div class="contact-page" style="background: rgba(255,255,255,0.95); border-radius: 40px; padding: 40px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <i class="fas fa-headset" style="font-size: 48px; color: #10b981;"></i>
                <h2 style="margin-top: 16px; color: #064e3b;">Customer Support</h2>
                <p style="color: #475569;">We're here to help you 24/7</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">
                <div style="background: #ecfdf5; border-radius: 24px; padding: 24px; text-align: center; transition: transform 0.3s;">
                    <i class="fas fa-phone-alt" style="font-size: 32px; color: #10b981;"></i>
                    <h3 style="margin: 12px 0 8px;">Call Us</h3>
                    <p style="font-weight: 600; font-size: 18px;">+92 315 6333863</p>
                    <p style="font-size: 12px; color: #64748b;">Toll-free support</p>
                </div>
                <div style="background: #ecfdf5; border-radius: 24px; padding: 24px; text-align: center; transition: transform 0.3s;">
                    <i class="fas fa-envelope" style="font-size: 32px; color: #10b981;"></i>
                    <h3 style="margin: 12px 0 8px;">Email Us</h3>
                    <p style="font-weight: 600; font-size: 18px;">support@traxlogistics.com</p>
                    <p style="font-size: 12px; color: #64748b;">24h response time</p>
                </div>
                <div style="background: #ecfdf5; border-radius: 24px; padding: 24px; text-align: center; transition: transform 0.3s;">
                    <i class="fab fa-whatsapp" style="font-size: 32px; color: #25D366;"></i>
                    <h3 style="margin: 12px 0 8px;">WhatsApp</h3>
                    <p style="font-weight: 600; font-size: 18px;">+92 315 6333863</p>
                    <p style="font-size: 12px; color: #64748b;">Chat with us</p>
                </div>
            </div>
            
            ${ticketsHtml}
        </div>
    `;
}

// ==================== SHIPMENT CREATION ====================
async function createShipment(event) {
    event.preventDefault();
    
    const shipperCell = document.getElementById('shipperCell').value;
    const shipperName = document.getElementById('shipperName').value;
    const shipperAddress = document.getElementById('shipperAddress').value;
    const consigneeCell = document.getElementById('consigneeCell').value;
    const consigneeName = document.getElementById('consigneeName').value;
    const consigneeAddress = document.getElementById('consigneeAddress').value;
    const parcelDescription = document.getElementById('parcelDescription').value;
    const quantity = document.getElementById('quantity').value;
    const weight = document.getElementById('weight').value;
    
    if (!shipperName || !shipperAddress || !consigneeName || !consigneeAddress || !parcelDescription) {
        alert('Please fill in all required fields');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await apiRequest('/auth/create-shipment', 'POST', {
            shipperName,
            shipperAddress,
            shipperCell,
            consigneeName,
            consigneeAddress,
            consigneeCell,
            description: parcelDescription,
            weight: weight || 1,
            quantity: quantity || 1
        });
        
        alert(`✅ Shipment created successfully!\n\nTracking Number: ${result.trackingNumber}\nAmount Charged: $${result.cost.toFixed(2)}\nRemaining Balance: $${result.balance.toFixed(2)}`);
        
        closeShipmentModal();
        
        const activePage = document.querySelector('.nav-btn.active').dataset.page;
        if (activePage === 'shipments') {
            await loadShipmentsPage();
        } else if (activePage === 'profile') {
            await loadProfilePage();
        }
    } catch (error) {
        alert('Error creating shipment: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== ADD FUNDS ====================
window.showAddFundsModal = function() {
    const amount = prompt("Enter amount to add (USD):", "100");
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        addFunds(parseFloat(amount));
    } else if (amount) {
        alert("Please enter a valid amount");
    }
};

async function addFunds(amount) {
    showLoading(true);
    
    try {
        const result = await apiRequest('/auth/add-funds', 'POST', {
            amount: amount,
            paymentMethod: 'manual'
        });
        
        alert(result.message);
        
        const activePage = document.querySelector('.nav-btn.active').dataset.page;
        if (activePage === 'profile') {
            await loadProfilePage();
        }
    } catch (error) {
        alert('Error adding funds: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== RATE CALCULATOR ====================
function showRateCalculator() {
    const modalHtml = `
        <div id="rateCalculatorModal" class="modal active" onclick="if(event.target===this) closeRateCalculator()">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-calculator"></i> Shipping Rate Calculator</h3>
                    <button class="modal-close" onclick="closeRateCalculator()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-section">
                        <div class="form-row">
                            <select id="rateOrigin" style="padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;">
                                <option value="">Select Origin</option>
                                <option value="ISLAMABAD">Islamabad</option>
                                <option value="KARACHI">Karachi</option>
                                <option value="LAHORE">Lahore</option>
                                <option value="RAWALPINDI">Rawalpindi</option>
                            </select>
                            <select id="rateDestination" style="padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;">
                                <option value="">Select Destination</option>
                                <option value="ISLAMABAD">Islamabad</option>
                                <option value="KARACHI">Karachi</option>
                                <option value="LAHORE">Lahore</option>
                                <option value="RAWALPINDI">Rawalpindi</option>
                                <option value="DUBAI">Dubai</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <input type="number" id="rateWeight" placeholder="Weight (kg)" step="0.1">
                            <select id="rateService" style="padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;">
                                <option value="standard">Standard (3-5 days)</option>
                                <option value="express">Express (1-2 days)</option>
                                <option value="priority">Priority (Same day)</option>
                            </select>
                        </div>
                        <button onclick="calculateShippingRate()" class="btn-primary" style="width:100%; margin-top: 16px;">
                            Calculate Rate
                        </button>
                        <div id="rateResult"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('rateCalculatorModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
    }
}

function closeRateCalculator() {
    const modal = document.getElementById('rateCalculatorModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function calculateShippingRate() {
    const origin = document.getElementById('rateOrigin').value;
    const destination = document.getElementById('rateDestination').value;
    const weight = parseFloat(document.getElementById('rateWeight').value);
    const service = document.getElementById('rateService').value;
    
    if (!origin || !destination || !weight || weight <= 0) {
        alert('Please fill in all fields with valid values');
        return;
    }
    
    let baseRate = 0;
    const rates = {
        'standard': 15,
        'express': 35,
        'priority': 60
    };
    
    baseRate = rates[service] || 15;
    
    const distanceFactor = (origin === destination) ? 1 : 1.5;
    
    let weightCost = weight * (service === 'priority' ? 3 : (service === 'express' ? 2 : 1.2));
    
    const total = (baseRate * distanceFactor) + weightCost;
    
    document.getElementById('rateResult').innerHTML = `
        <div style="background: #ecfdf5; border-radius: 20px; padding: 20px; text-align: center; margin-top: 20px;">
            <i class="fas fa-calculator" style="font-size: 32px; color: #10b981;"></i>
            <h4 style="margin: 10px 0;">Estimated Shipping Cost</h4>
            <div style="font-size: 28px; font-weight: 800; color: #064e3b;">$${total.toFixed(2)} USD</div>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">*Rates may vary based on actual dimensions and customs</p>
        </div>
    `;
}

// ==================== SUPPORT TICKET ====================
function openSupportModal() {
    const modalHtml = `
        <div id="supportModal" class="modal active" onclick="if(event.target===this) closeSupportModal()">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-ticket-alt"></i> Create Support Ticket</h3>
                    <button class="modal-close" onclick="closeSupportModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-section">
                        <div class="form-row">
                            <input type="text" id="ticketSubject" placeholder="Subject *" style="width:100%; padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;">
                            <select id="ticketCategory" style="padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;">
                                <option value="general">General Inquiry</option>
                                <option value="tracking">Tracking Issue</option>
                                <option value="payment">Payment Problem</option>
                                <option value="delivery">Delivery Issue</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <select id="ticketPriority" style="padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;">
                                <option value="low">Low Priority</option>
                                <option value="normal" selected>Normal Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <textarea id="ticketMessage" rows="6" placeholder="Describe your issue in detail..." style="width:100%; padding: 12px; border-radius: 20px; border: 1px solid #d1fae5;"></textarea>
                        <div style="display: flex; gap: 12px; margin-top: 20px;">
                            <button onclick="closeSupportModal()" class="btn-secondary">Cancel</button>
                            <button onclick="submitSupportTicket()" class="btn-primary">Submit Ticket</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('supportModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
    }
}

function closeSupportModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function submitSupportTicket() {
    const subject = document.getElementById('ticketSubject').value;
    const category = document.getElementById('ticketCategory').value;
    const message = document.getElementById('ticketMessage').value;
    const priority = document.getElementById('ticketPriority').value;
    
    if (!subject || !message) {
        alert('Please fill in subject and message');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await apiRequest('/auth/support-ticket', 'POST', {
            subject, category, message, priority
        });
        
        alert(`Ticket #${result.ticketNumber} created successfully! We'll respond within 24 hours.`);
        closeSupportModal();
        loadDashboardContent();
    } catch (error) {
        alert('Error creating ticket: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ==================== MODAL HANDLERS ====================
function openShipmentModal() {
    const modal = document.getElementById('shipmentModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    resetShipmentForm();
}

function closeShipmentModal() {
    const modal = document.getElementById('shipmentModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    resetShipmentForm();
}

function resetShipmentForm() {
    document.getElementById('shipperCell').value = '';
    document.getElementById('shipperName').value = '';
    document.getElementById('shipperAddress').value = '';
    document.getElementById('consigneeCell').value = '';
    document.getElementById('consigneeName').value = '';
    document.getElementById('consigneeAddress').value = '';
    document.getElementById('parcelDescription').value = '';
    document.getElementById('quantity').value = '1';
    document.getElementById('weight').value = '';
}

// ==================== FAB MENU ====================
function setupFabMenu() {
    const fabBtn = document.getElementById('fabButton');
    const fabOptions = document.getElementById('fabOptions');
    
    if (fabBtn && fabOptions) {
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fabOptions.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!fabBtn.contains(e.target) && !fabOptions.contains(e.target)) {
                fabOptions.classList.remove('show');
            }
        });
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
    
    document.getElementById('getStartedBtn').addEventListener('click', showAuth);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            
            if (tab.dataset.tab === 'login') {
                loginForm.classList.add('active');
                signupForm.classList.remove('active');
            } else {
                loginForm.classList.remove('active');
                signupForm.classList.add('active');
            }
        });
    });
    
    document.getElementById('loginFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        if (email && password) {
            login(email, password);
        } else {
            alert('Please enter email and password');
        }
    });
    
    document.getElementById('signupFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        
        if (!name || !email || !phone || !password) {
            alert('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        signup(name, email, phone, password);
    });
    
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadDashboardContent();
        });
    });
    
    const shipmentModal = document.getElementById('shipmentModal');
    const shipmentModalClose = document.querySelector('#shipmentModal .modal-close');
    if (shipmentModalClose) {
        shipmentModalClose.addEventListener('click', closeShipmentModal);
    }
    if (shipmentModal) {
        shipmentModal.addEventListener('click', (e) => {
            if (e.target === shipmentModal) {
                closeShipmentModal();
            }
        });
    }
    
    const cancelBtn = document.getElementById('cancelShipmentBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeShipmentModal);
    }
    
    const shipmentForm = document.getElementById('shipmentForm');
    if (shipmentForm) {
        shipmentForm.addEventListener('submit', createShipment);
    }
});

// Expose global functions
window.trackShipmentFromInput = trackShipmentFromInput;
window.openShipmentModal = openShipmentModal;
window.openSupportModal = openSupportModal;
window.showRateCalculator = showRateCalculator;
window.calculateShippingRate = calculateShippingRate;
window.closeRateCalculator = closeRateCalculator;
window.closeSupportModal = closeSupportModal;
window.submitSupportTicket = submitSupportTicket;
window.editProfile = editProfile;
window.showAddFundsModal = showAddFundsModal;