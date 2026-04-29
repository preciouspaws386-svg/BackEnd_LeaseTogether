require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const apartmentRoutes = require('./routes/apartmentRoutes');
const meetupRoutes = require('./routes/meetupRoutes');
const adminRoutes = require('./routes/adminRoutes');
const listingRoutes = require('./routes/listingRoutes');
const schoolRoutes = require('./routes/schoolRoutes');

connectDB();

const app = express();

app.use(
  cors({
    origin: 'https://front-end-lease-together.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/meetups', meetupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/schools', schoolRoutes);

// Backwards-compatible mounts (frontend calls without /api)
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/apartments', apartmentRoutes);
app.use('/meetups', meetupRoutes);
app.use('/admin', adminRoutes);
app.use('/listings', listingRoutes);
app.use('/schools', schoolRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
