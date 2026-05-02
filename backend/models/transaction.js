const mongoose = require('mongoose');

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

transactionSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);