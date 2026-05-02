// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../'))); // Fallback for any other static files

// ==================== SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    balance: { type: Number, default: 100, min: 0 },
    shipments: [{ type: String, trim: true }],
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        { userId: this._id, email: this.email },
        process.env.JWT_SECRET || 'trax_secret_key_2026',
        { expiresIn: '7d' }
    );
};

// Shipment Schema
const timelineEventSchema = new mongoose.Schema({
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    status: { type: String, required: true },
    rawTimeForSort: { type: String, required: true }
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true, trim: true },
    timeline: { type: [timelineEventSchema], required: true, default: [] },
    latestStatus: { type: String, required: true },
    latestLocation: { type: String, required: true },
    lastUpdate: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true }
}, { timestamps: true });

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'payment', 'refund'], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
    description: { type: String, required: true },
    trackingNumber: { type: String, trim: true },
    reference: { type: String, unique: true, required: true },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// Ticket Schema
const ticketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketNumber: { type: String, unique: true, required: true },
    subject: { type: String, required: true },
    category: { type: String, enum: ['general', 'tracking', 'payment', 'delivery', 'other'], default: 'general' },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Shipment = mongoose.models.Shipment || mongoose.model('Shipment', shipmentSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

// ==================== SAMPLE SHIPMENTS ====================

const MASTER_TIMELINE = [
    { date: '2026-01-12', time: '20:32', location: 'ISLAMABAD - PAKISTAN', status: 'Shipment booked', rawTimeForSort: '2026-01-12T20:32:00' },
    { date: '2026-01-12', time: '19:32:31', location: 'UNITED ARAB EMIRATES', status: 'Shipper created a label', rawTimeForSort: '2026-01-12T19:32:31' },
    { date: '2026-01-14', time: 'N/A', location: 'ISLAMABAD', status: 'Shipment Picked Up', rawTimeForSort: '2026-01-14T00:00:00' },
    { date: '2026-01-18', time: '15:40', location: 'DUBAI-DXB', status: 'All packages arrived', rawTimeForSort: '2026-01-18T15:40:00' },
    { date: '2026-01-20', time: '09:09:04', location: 'Dubai', status: 'Arrived at Facility', rawTimeForSort: '2026-01-20T09:09:04' },
    { date: '2026-01-21', time: '16:19:00', location: 'Dubai', status: 'Departed from Facility', rawTimeForSort: '2026-01-21T16:19:00' }
];

const SAMPLE_SHIPMENTS = [
    {
        trackingNumber: '1350120891',
        timeline: MASTER_TIMELINE,
        latestStatus: MASTER_TIMELINE[MASTER_TIMELINE.length - 1].status,
        latestLocation: MASTER_TIMELINE[MASTER_TIMELINE.length - 1].location,
        lastUpdate: `${MASTER_TIMELINE[MASTER_TIMELINE.length - 1].date} ${MASTER_TIMELINE[MASTER_TIMELINE.length - 1].time}`,
        origin: 'ISLAMABAD - PAKISTAN',
        destination: 'DUBAI / UAE Hub'
    },
    {
        trackingNumber: 'TRX12345678',
        timeline: [
            { date: '2026-02-10', time: '09:15', location: 'KARACHI', status: 'Shipment booked', rawTimeForSort: '2026-02-10T09:15:00' },
            { date: '2026-02-11', time: '14:20', location: 'KARACHI', status: 'Picked up', rawTimeForSort: '2026-02-11T14:20:00' },
            { date: '2026-02-13', time: '06:45', location: 'DUBAI', status: 'Custom clearance', rawTimeForSort: '2026-02-13T06:45:00' },
            { date: '2026-02-14', time: '01:30', location: 'DUBAI', status: 'Departed', rawTimeForSort: '2026-02-14T01:30:00' }
        ],
        latestStatus: 'Departed',
        latestLocation: 'DUBAI',
        lastUpdate: '2026-02-14 01:30',
        origin: 'KARACHI - PAKISTAN',
        destination: 'DUBAI / UAE Hub'
    }
];

async function initSampleData() {
    for (const data of SAMPLE_SHIPMENTS) {
        const existing = await Shipment.findOne({ trackingNumber: data.trackingNumber });
        if (!existing) {
            await new Shipment(data).save();
            console.log(`✅ Sample shipment: ${data.trackingNumber}`);
        }
    }
}

// ==================== AUTH MIDDLEWARE ====================

function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'trax_secret_key_2026');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ==================== AUTH ROUTES ====================

// SIGNUP - Create new account
app.post('/api/auth/signup', async (req, res) => {
    console.log('📝 Signup request received:', req.body);
    
    try {
        const { name, email, phone, password } = req.body;
        
        if (!name || !email || !phone || !password) {
            console.log('❌ Missing fields');
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            console.log('❌ Password too short');
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            console.log('❌ Email already exists:', email);
            return res.status(409).json({ error: 'Email already registered. Please login instead.' });
        }
        
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: password,
            balance: 100
        });
        
        await user.save();
        console.log('✅ User created successfully:', user.email);
        
        const token = user.generateAuthToken();
        
        const welcomeTransaction = new Transaction({
            userId: user._id,
            type: 'deposit',
            amount: 100,
            status: 'completed',
            description: 'Welcome bonus - $100 credited',
            reference: `WELCOME_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
        });
        await welcomeTransaction.save();
        
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: user.balance,
                createdAt: user.createdAt
            }
        });
        
    } catch (err) {
        console.error('❌ Signup error:', err);
        res.status(500).json({ error: 'Signup failed: ' + err.message });
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login request received:', req.body.email);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValid = await user.comparePassword(password);
        
        if (!isValid) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = user.generateAuthToken();
        console.log('✅ Login successful:', email);
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: user.balance,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Login failed: ' + err.message });
    }
});

// UPDATE PROFILE
app.put('/api/auth/update-profile', authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const updateData = { name, email, phone };
        
        if (password && password.length >= 6) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        
        const user = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true }
        ).select('-password');
        
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: 'Update failed: ' + err.message });
    }
});

// GET USER SHIPMENTS
app.get('/api/auth/shipments', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const shipments = await Shipment.find({ trackingNumber: { $in: user.shipments || [] } });
        res.json({ success: true, shipments });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching shipments' });
    }
});

// GET TRANSACTIONS
app.get('/api/auth/transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({ success: true, transactions });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});

// GET BALANCE
app.get('/api/auth/balance', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ success: true, balance: user?.balance || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching balance' });
    }
});

// ADD FUNDS
app.post('/api/auth/add-funds', authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.userId);
        user.balance = (user.balance || 0) + amount;
        await user.save();
        
        const transaction = new Transaction({
            userId: req.userId,
            type: 'deposit',
            amount: amount,
            status: 'completed',
            description: `Added $${amount} to wallet`,
            reference: `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
        });
        await transaction.save();
        
        res.json({ success: true, balance: user.balance, message: `Added $${amount}` });
    } catch (err) {
        res.status(500).json({ error: 'Error adding funds' });
    }
});

// CREATE SHIPMENT
app.post('/api/auth/create-shipment', authMiddleware, async (req, res) => {
    try {
        const { shipperName, shipperAddress, consigneeName, consigneeAddress, description, weight, quantity } = req.body;
        
        if (!shipperName || !consigneeName) {
            return res.status(400).json({ error: 'Shipper and consignee required' });
        }
        
        const trackingNumber = 'TRX' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
        const weightKg = parseFloat(weight) || 1;
        const qty = parseFloat(quantity) || 1;
        const totalCost = 15 + (weightKg * 0.5 * qty);
        
        const user = await User.findById(req.userId);
        if ((user.balance || 0) < totalCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        user.balance = (user.balance || 0) - totalCost;
        await user.save();
        
        const transaction = new Transaction({
            userId: req.userId,
            type: 'payment',
            amount: totalCost,
            status: 'completed',
            description: `Shipment ${trackingNumber} - ${description || 'Cargo'}`,
            trackingNumber: trackingNumber,
            reference: `SHIP_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
        });
        await transaction.save();
        
        const shipment = new Shipment({
            trackingNumber,
            timeline: [{
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
                location: shipperAddress?.substring(0, 50) || 'Origin',
                status: 'Shipment Created',
                rawTimeForSort: new Date().toISOString()
            }],
            latestStatus: 'Shipment Created',
            latestLocation: shipperAddress?.substring(0, 50) || 'Origin',
            lastUpdate: new Date().toLocaleString(),
            origin: shipperAddress?.substring(0, 100) || 'Unknown',
            destination: consigneeAddress?.substring(0, 100) || 'Unknown'
        });
        
        await shipment.save();
        await User.findByIdAndUpdate(req.userId, { $addToSet: { shipments: trackingNumber } });
        
        res.json({ success: true, trackingNumber, cost: totalCost, balance: user.balance });
    } catch (err) {
        res.status(500).json({ error: 'Error creating shipment: ' + err.message });
    }
});

// SUPPORT TICKET
app.post('/api/auth/support-ticket', authMiddleware, async (req, res) => {
    try {
        const { subject, message, priority, category } = req.body;
        
        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message required' });
        }
        
        const ticketNumber = `TKT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
        
        const ticket = new Ticket({
            userId: req.userId,
            ticketNumber,
            subject,
            message,
            category: category || 'general',
            priority: priority || 'normal'
        });
        
        await ticket.save();
        res.json({ success: true, ticketNumber });
    } catch (err) {
        res.status(500).json({ error: 'Error creating ticket' });
    }
});

// GET SUPPORT TICKETS
app.get('/api/auth/support-tickets', authMiddleware, async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching tickets' });
    }
});

// ==================== TRACKING API ====================

app.get('/api/track/:trackingNumber', async (req, res) => {
    const { trackingNumber } = req.params;
    
    try {
        let shipment = await Shipment.findOne({ trackingNumber });
        
        if (!shipment) {
            shipment = {
                trackingNumber,
                timeline: [{
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString(),
                    location: 'Processing Facility',
                    status: 'Tracking information received',
                    rawTimeForSort: new Date().toISOString()
                }],
                latestStatus: 'Information Received',
                latestLocation: 'Processing Center',
                lastUpdate: new Date().toLocaleString(),
                origin: 'Unknown',
                destination: 'Unknown'
            };
        }
        
        res.json(shipment);
    } catch (err) {
        res.status(500).json({ error: 'Tracking error' });
    }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ==================== FRONTEND ROUTES (CRITICAL FOR RENDER) ====================

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle client-side routing - THIS MUST BE AFTER ALL API ROUTES
app.get('*', (req, res, next) => {
    // Skip API routes - let them return 404 if not found
    if (req.path.startsWith('/api')) {
        return next();
    }
    // For all other paths, serve index.html (for React/Vue like routing)
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==================== START SERVER ====================

console.log('\n🔍 Checking configuration...\n');

if (!process.env.MONGO_URI) {
    console.log('⚠️  MONGO_URI not found. Using in-memory database (for testing)...');
    console.log('   To use MongoDB Atlas, add MONGO_URI to .env file\n');
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 TRAX Logistics System (Mock Mode - No Database)`);
        console.log(`========================================`);
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`📍 API: http://localhost:${PORT}/api/health`);
        console.log(`========================================\n`);
        console.log(`⚠️  Note: In mock mode, data resets when server restarts`);
        console.log(`💡 To enable persistent database, set MONGO_URI in .env file\n`);
    });
} else {
    mongoose.connect(process.env.MONGO_URI)
        .then(async () => {
            console.log('✅ MongoDB connected successfully');
            await initSampleData();
            
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`\n🚀 TRAX Logistics System (Database Mode)`);
                console.log(`========================================`);
                console.log(`📍 Server: http://localhost:${PORT}`);
                console.log(`📍 Frontend: http://localhost:${PORT}`);
                console.log(`📍 Health: http://localhost:${PORT}/api/health`);
                console.log(`========================================\n`);
                console.log(`💡 Test tracking numbers: 1350120891, TRX12345678\n`);
            });
        })
        .catch(err => {
            console.error(`\n❌ MongoDB connection failed!`);
            console.error(`   Error: ${err.message}`);
            console.error(`\n💡 Starting in MOCK MODE instead...`);
            
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`\n🚀 TRAX Logistics System (Mock Mode - DB Failed)`);
                console.log(`========================================`);
                console.log(`📍 Server: http://localhost:${PORT}`);
                console.log(`========================================\n`);
            });
        });
}