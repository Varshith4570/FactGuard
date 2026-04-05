const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const verifyRoutes = require('./routes/verify');
require('dns').setDefaultResultOrder('ipv4first');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve frontend from Express
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);

// Fallback: serve index.html for any unknown route
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 FactGuard server running on http://localhost:${PORT}`));
