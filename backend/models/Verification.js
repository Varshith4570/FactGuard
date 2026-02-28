const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inputType: { type: String, enum: ['url', 'file'], required: true },
    input: { type: String },
    transcript: { type: String },
    claims: [String],
    verificationScore: { type: Number },
    details: { type: Object },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Verification', VerificationSchema);
