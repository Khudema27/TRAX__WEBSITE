const mongoose = require('mongoose');

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
}, { timestamps: true, collection: 'shipments' });

module.exports = mongoose.model('Shipment', shipmentSchema);