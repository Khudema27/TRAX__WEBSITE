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

app.use(cors());
app.use(express.json());

// Models
const Shipment = require('./models/shipment');
const User = require('./models/user');
const Transaction = require('./models/transaction');

// Additional Models
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    relatedTrackingNumber: { type: String }
});

const ticketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketNumber: { type: String, unique: true, required: true },
    subject: { type: String, required: true },
    category: { type: String, enum: ['general', 'tracking', 'payment', 'delivery', 'other'], default: 'general' },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    adminResponse: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

// Frontend path
const frontendPath = path.join(__dirname, '..', 'frontend');

// ==================== TRACKING DATA ====================

const MASTER_TIMELINE = [
    { date: '2026-01-12', time: '20:32', location: 'ISLAMABAD - PAKISTAN', status: 'Shipment booked', rawTimeForSort: '2026-01-12T20:32:00' },
    { date: '2026-01-12', time: '19:32:31', location: 'UNITED ARAB EMIRATES', status: 'Shipper created a label', rawTimeForSort: '2026-01-12T19:32:31' },
    { date: '2026-01-14', time: 'N/A', location: 'ISLAMABAD', status: 'Shipment Picked Up By Route 3 Smart Cargo', rawTimeForSort: '2026-01-14T00:00:00' },
    { date: '2026-01-18', time: '15:40', location: 'DUBAI-DXB', status: 'REMAINING ALL PCS ARRIVED', rawTimeForSort: '2026-01-18T15:40:00' },
    { date: '2026-01-20', time: '09:09:04', location: 'Dubai-UNITED ARAB EMIRATES', status: 'Arrived at Facility', rawTimeForSort: '2026-01-20T09:09:04' },
    { date: '2026-01-21', time: '16:19:00', location: 'Dubai-UNITED ARAB EMIRATES', status: 'Departed from Facility', rawTimeForSort: '2026-01-21T16:19:00' }
];

const SAMPLE_SHIPMENTS_DATA = [
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
        trackingNumber: 'APX12345678',
        timeline: [
            { date: '2026-02-10', time: '09:15', location: 'KARACHI - PAKISTAN', status: 'Shipment booked', rawTimeForSort: '2026-02-10T09:15:00' },
            { date: '2026-02-11', time: '14:20', location: 'KARACHI', status: 'Picked up by Route 3 Smart Cargo', rawTimeForSort: '2026-02-11T14:20:00' },
            { date: '2026-02-12', time: '23:10', location: 'DUBAI AIRPORT', status: 'Arrived at origin facility', rawTimeForSort: '2026-02-12T23:10:00' },
            { date: '2026-02-13', time: '06:45', location: 'DUBAI', status: 'Custom clearance in progress', rawTimeForSort: '2026-02-13T06:45:00' },
            { date: '2026-02-14', time: '01:30', location: 'DUBAI', status: 'Departed from facility', rawTimeForSort: '2026-02-14T01:30:00' }
        ],
        latestStatus: 'Departed from facility',
        latestLocation: 'DUBAI',
        lastUpdate: '2026-02-14 01:30',
        origin: 'KARACHI - PAKISTAN',
        destination: 'DUBAI / UAE Hub'
    },
    {
        trackingNumber: '9876543210',
        timeline: [
            { date: '2026-02-05', time: '11:00', location: 'LAHORE - PAKISTAN', status: 'Shipment information received', rawTimeForSort: '2026-02-05T11:00:00' },
            { date: '2026-02-06', time: '08:30', location: 'LAHORE', status: 'Shipment picked up', rawTimeForSort: '2026-02-06T08:30:00' },
            { date: '2026-02-07', time: '22:15', location: 'DUBAI', status: 'Arrived at hub', rawTimeForSort: '2026-02-07T22:15:00' },
            { date: '2026-02-08', time: '13:40', location: 'DUBAI', status: 'Clearance completed', rawTimeForSort: '2026-02-08T13:40:00' },
            { date: '2026-02-09', time: '02:00', location: 'DUBAI', status: 'Out for delivery', rawTimeForSort: '2026-02-09T02:00:00' }
        ],
        latestStatus: 'Out for delivery',
        latestLocation: 'DUBAI',
        lastUpdate: '2026-02-09 02:00',
        origin: 'LAHORE - PAKISTAN',
        destination: 'DUBAI / UAE Hub'
    }
];

function generateDynamicTracking(trackingNumber) {
    const hash = trackingNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const variant = hash % 2;
    const templates = [
        {
            timeline: [
                { date: '2026-02-20', time: '10:00', location: 'ISLAMABAD', status: 'Booking confirmed', rawTimeForSort: '2026-02-20T10:00:00' },
                { date: '2026-02-21', time: '15:30', location: 'ISLAMABAD', status: 'Shipment picked up', rawTimeForSort: '2026-02-21T15:30:00' },
                { date: '2026-02-22', time: '03:45', location: 'DUBAI', status: 'Arrived at facility', rawTimeForSort: '2026-02-22T03:45:00' }
            ],
            origin: 'ISLAMABAD - PAKISTAN',
            destination: 'INTERNATIONAL HUB'
        },
        {
            timeline: [
                { date: '2026-02-18', time: '08:00', location: 'ISLAMABAD', status: 'Shipment booked', rawTimeForSort: '2026-02-18T08:00:00' },
                { date: '2026-02-19', time: '12:00', location: 'ISLAMABAD', status: 'Ready for dispatch', rawTimeForSort: '2026-02-19T12:00:00' },
                { date: '2026-02-20', time: '22:30', location: 'DUBAI', status: 'In transit', rawTimeForSort: '2026-02-20T22:30:00' }
            ],
            origin: 'RAWALPINDI - PAKISTAN',
            destination: 'GLOBAL DESTINATION'
        }
    ];
    const t = templates[variant];
    const lastEvent = t.timeline[t.timeline.length - 1];
    return {
        trackingNumber,
        timeline: t.timeline,
        latestStatus: lastEvent.status,
        latestLocation: lastEvent.location,
        lastUpdate: `${lastEvent.date} ${lastEvent.time}`,
        origin: t.origin,
        destination: t.destination
    };
}

async function initializeSampleData() {
    for (const data of SAMPLE_SHIPMENTS_DATA) {
        const existing = await Shipment.findOne({ trackingNumber: data.trackingNumber });
        if (!existing) {
            await new Shipment(data).save();
            console.log(`📦 Sample shipment saved: ${data.trackingNumber}`);
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
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const user = new User({ 
            name: name.trim(), 
            email: email.toLowerCase().trim(), 
            phone: phone.trim(), 
            password: password,
            balance: 0,
            createdAt: new Date()
        });
        
        await user.save();
        const token = user.generateAuthToken();
        
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
        console.error('Signup error:', err.message);
        res.status(500).json({ error: 'Server error during signup: ' + err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = user.generateAuthToken();
        
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
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login: ' + err.message });
    }
});

app.get('/api/auth/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
});

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
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true, user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Error updating profile: ' + err.message });
    }
});

app.get('/api/auth/shipments', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const shipments = await Shipment.find({ trackingNumber: { $in: user.shipments } });
        res.json({ success: true, shipments });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching shipments' });
    }
});

app.post('/api/auth/add-shipment', authMiddleware, async (req, res) => {
    try {
        const { trackingNumber } = req.body;
        if (!trackingNumber) {
            return res.status(400).json({ error: 'Tracking number is required' });
        }
        await User.findByIdAndUpdate(req.userId, { $addToSet: { shipments: trackingNumber.trim() } });
        res.json({ success: true, message: 'Shipment added to your account' });
    } catch (err) {
        res.status(500).json({ error: 'Error adding shipment' });
    }
});

// ==================== TRANSACTION ROUTES ====================

app.get('/api/auth/transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({ success: true, transactions });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});

app.post('/api/auth/add-funds', authMiddleware, async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.balance = (user.balance || 0) + amount;
        await user.save();
        
        const transaction = new Transaction({
            userId: req.userId,
            type: 'deposit',
            amount: amount,
            status: 'completed',
            description: `Added funds via ${paymentMethod || 'bank transfer'}`,
            reference: `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
        });
        await transaction.save();
        
        const notification = new Notification({
            userId: req.userId,
            title: 'Funds Added',
            message: `$${amount.toFixed(2)} has been added to your account.`,
            type: 'success'
        });
        await notification.save();
        
        res.json({ 
            success: true, 
            balance: user.balance,
            transaction,
            message: `Successfully added $${amount.toFixed(2)} to your account`
        });
    } catch (err) {
        res.status(500).json({ error: 'Error adding funds' });
    }
});

app.post('/api/auth/make-payment', authMiddleware, async (req, res) => {
    try {
        const { amount, trackingNumber, description } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if ((user.balance || 0) < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        user.balance = (user.balance || 0) - amount;
        await user.save();
        
        const transaction = new Transaction({
            userId: req.userId,
            type: 'payment',
            amount: amount,
            status: 'completed',
            description: description || `Shipping payment for tracking #${trackingNumber || 'N/A'}`,
            trackingNumber: trackingNumber,
            reference: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
        });
        await transaction.save();
        
        if (trackingNumber) {
            await User.findByIdAndUpdate(req.userId, { $addToSet: { shipments: trackingNumber } });
        }
        
        res.json({ 
            success: true, 
            balance: user.balance,
            transaction,
            message: `Payment of $${amount.toFixed(2)} processed successfully`
        });
    } catch (err) {
        res.status(500).json({ error: 'Error processing payment' });
    }
});

app.get('/api/auth/balance', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, balance: user.balance || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching balance' });
    }
});

// ==================== NOTIFICATION ROUTES ====================

app.get('/api/auth/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching notifications' });
    }
});

app.put('/api/auth/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { read: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error updating notification' });
    }
});

app.delete('/api/auth/notifications/clear', authMiddleware, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error clearing notifications' });
    }
});

// ==================== SUPPORT TICKET ROUTES ====================

app.post('/api/auth/support-ticket', authMiddleware, async (req, res) => {
    try {
        const { subject, category, message, priority } = req.body;
        
        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }
        
        const ticketNumber = `TKT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
        
        const ticket = new Ticket({
            userId: req.userId,
            ticketNumber,
            subject,
            category: category || 'general',
            message,
            priority: priority || 'normal'
        });
        
        await ticket.save();
        
        const notification = new Notification({
            userId: req.userId,
            title: 'Support Ticket Created',
            message: `Your ticket #${ticketNumber} has been created. We'll respond within 24 hours.`,
            type: 'info'
        });
        await notification.save();
        
        res.json({ success: true, ticketNumber, ticket });
    } catch (err) {
        res.status(500).json({ error: 'Error creating support ticket: ' + err.message });
    }
});

app.get('/api/auth/support-tickets', authMiddleware, async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching tickets' });
    }
});

// ==================== CREATE SHIPMENT ROUTE ====================

app.post('/api/auth/create-shipment', authMiddleware, async (req, res) => {
    try {
        const { shipperName, shipperAddress, shipperCell, consigneeName, consigneeAddress, consigneeCell, description, weight, quantity } = req.body;
        
        if (!shipperName || !consigneeName) {
            return res.status(400).json({ error: 'Shipper and consignee information required' });
        }
        
        const trackingNumber = 'TRX' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
        
        const weightKg = parseFloat(weight) || 1;
        const baseCost = 25;
        const weightCost = weightKg * 0.5;
        const totalCost = baseCost + weightCost;
        
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
            description: `Shipment creation for ${trackingNumber}`,
            trackingNumber: trackingNumber,
            reference: `SHIP_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
        });
        await transaction.save();
        
        const shipment = new Shipment({
            trackingNumber,
            timeline: [{
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
                location: shipperAddress?.substring(0, 50) || 'Origin Facility',
                status: 'Shipment Created - Awaiting Pickup',
                rawTimeForSort: new Date().toISOString()
            }],
            latestStatus: 'Shipment Created - Awaiting Pickup',
            latestLocation: shipperAddress?.substring(0, 50) || 'Origin Facility',
            lastUpdate: new Date().toLocaleString(),
            origin: shipperAddress?.substring(0, 100) || 'Unknown Origin',
            destination: consigneeAddress?.substring(0, 100) || 'Unknown Destination'
        });
        
        await shipment.save();
        
        await User.findByIdAndUpdate(req.userId, { $addToSet: { shipments: trackingNumber } });
        
        const notification = new Notification({
            userId: req.userId,
            title: 'Shipment Created',
            message: `Your shipment ${trackingNumber} has been created successfully.`,
            type: 'success',
            relatedTrackingNumber: trackingNumber
        });
        await notification.save();
        
        res.json({
            success: true,
            trackingNumber,
            shipment,
            cost: totalCost,
            balance: user.balance
        });
    } catch (err) {
        res.status(500).json({ error: 'Error creating shipment: ' + err.message });
    }
});

// ==================== TRACKING API ====================

app.get('/api/track/:trackingNumber', async (req, res) => {
    const { trackingNumber } = req.params;
    
    try {
        const found = await Shipment.findOne({ trackingNumber });
        if (found) {
            return res.json(found);
        }

        const dynamicData = generateDynamicTracking(trackingNumber);
        await new Shipment(dynamicData).save();
        return res.json(dynamicData);
    } catch (err) {
        console.error('Tracking error:', err);
        res.status(500).json({ error: 'Database error. Please try again later.' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            name: mongoose.connection.name || 'N/A',
            host: mongoose.connection.host || 'N/A'
        }
    });
});

// ==================== FRONTEND ROUTES ====================

app.get('/', (_req, res) => res.redirect('/track'));
app.get('/track', (_req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/style.css', (_req, res) => res.sendFile(path.join(frontendPath, 'style.css')));
app.get('/script.js', (_req, res) => res.sendFile(path.join(frontendPath, 'script.js')));
app.get('/manifest.json', (_req, res) => res.sendFile(path.join(frontendPath, 'manifest.json')));
app.get('/service-worker.js', (_req, res) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(frontendPath, 'service-worker.js'));
});

// ==================== START SERVER ====================
console.clear();

if (!process.env.MONGO_URI) {
    console.error('\n❌ MONGO_URI is not defined in .env file!');
    console.error('   Please create a .env file in the parent directory with your MongoDB connection string.\n');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
    dbName: 'trax_db'
})
    .then(async () => {
        console.log('✅ MongoDB connected successfully');
        console.log(`   Database: ${mongoose.connection.name}`);
        
        try {
            const col = mongoose.connection.collection('shipments');
            const indexes = await col.indexes();
            if (indexes.find(i => i.name === 'trackingId_1')) {
                await col.dropIndex('trackingId_1');
                console.log('✅ Cleaned up old index');
            }
        } catch (err) {}

        await initializeSampleData();

        app.listen(PORT, () => {
            console.log(`\n🚀 Route 3 Smart Cargo Tracking System`);
            console.log(`========================================`);
            console.log(`📍 Server:    http://localhost:${PORT}`);
            console.log(`📍 App:       http://localhost:${PORT}/track`);
            console.log(`📍 Health:    http://localhost:${PORT}/api/health`);
            console.log(`========================================\n`);
            console.log(`💡 HOW TO USE:`);
            console.log(`   1. Go to http://localhost:${PORT}/track`);
            console.log(`   2. Click "Sign Up" to create your own account`);
            console.log(`   3. Use your email and password to login`);
            console.log(`   4. Track shipments using tracking numbers`);
            console.log(`   5. Click the + button at the bottom right to create shipments`);
            console.log(`   6. Edit your profile from the Profile page`);
            console.log(`   7. Use Rate Calculator to estimate shipping costs`);
            console.log(`   8. Create support tickets for assistance`);
            console.log(`========================================\n`);
        });
    })
    .catch(err => {
        console.error(`\n❌ MongoDB connection failed!`);
        console.error(`   Error: ${err.message}`);
        console.error(`\n   Please check:`);
        console.error(`   1. Your internet connection`);
        console.error(`   2. MongoDB Atlas credentials in .env file`);
        console.error(`   3. Network whitelist (add your IP to MongoDB Atlas)`);
        console.error(`   4. Database user permissions\n`);
        process.exit(1);
    });