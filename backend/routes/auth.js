const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) return res.status(400).json({ error: 'Email or Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ name, username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        // Search by username or email
        const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User with this email not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({ error: 'Server SMTP is not configured. Cannot send email.' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER || 'no-reply@factguard.com',
            to: user.email,
            subject: 'FactGuard Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}\n\nIt is valid for 10 minutes.`
        };
        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent to your email.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });
        
        res.json({ message: 'OTP verified successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
