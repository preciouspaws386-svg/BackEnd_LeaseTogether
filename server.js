require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const User = require('./models/User');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const apartmentRoutes = require('./routes/apartmentRoutes');
const meetupRoutes = require('./routes/meetupRoutes');
const adminRoutes = require('./routes/adminRoutes');
const listingRoutes = require('./routes/listingRoutes');
const schoolRoutes = require('./routes/schoolRoutes');

const app = express();
/**
 * Access-code policy:
 * Access codes grant 7 days free trial, then subscription kicks in.
 */
const ADMIN_EMAIL = 'admin@leasetogether.com';
const ADMIN_PASSWORD = 'admin123';

const ensureAdminAccount = async () => {
  const adminEmail = ADMIN_EMAIL.toLowerCase().trim();
  let admin = await User.findOne({ email: adminEmail }).select('+password');
  if (!admin) {
    admin = new User({
      firstName: 'Admin',
      lastInitial: 'U',
      email: adminEmail,
      password: ADMIN_PASSWORD,
      role: 'admin',
      subscriptionActive: true,
      trialActive: true,
      isDisabled: false,
      isOpenToRoommate: false,
    });
  } else {
    admin.firstName = admin.firstName || 'Admin';
    admin.lastInitial = admin.lastInitial || 'U';
    admin.role = 'admin';
    admin.isDisabled = false;
    admin.subscriptionActive = true;
    admin.trialActive = true;
    admin.password = ADMIN_PASSWORD;
  }
  await admin.save();
};

const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

const envOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  ...(process.env.ALLOWED_ORIGINS || '').split(','),
]
  .map(normalizeOrigin)
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  'https://front-end-lease-together.vercel.app',
  'https://www.roomiez.shop',
  'https://roomiez.shop',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...envOrigins,
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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
const start = async () => {
  await connectDB();
  await ensureAdminAccount();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
