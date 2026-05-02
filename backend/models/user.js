const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    balance: { type: Number, default: 0, min: 0 },
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

module.exports = mongoose.model('User', userSchema);