/**
 * Run from server/: MONGO_URI=... node scripts/mongo-health-and-admin.js
 * Optional: ADMIN_EMAIL, ADMIN_PASSWORD (used only when creating/promoting admin).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI. Set it in .env or the environment.');
    process.exit(1);
  }

  await connectDB();

  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  console.log(`\nConnected. Active database: ${dbName}`);

  const collections = await db.listCollections().toArray();
  console.log(`\nCollections (${collections.length}):`);
  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const n = await db.collection(name).estimatedDocumentCount();
    console.log(`  - ${name}: ~${n} documents`);
  }

  const adminCount = await User.countDocuments({ role: 'admin' });
  console.log(`\nUsers with role "admin": ${adminCount}`);

  if (adminCount > 0) {
    const admins = await User.find({ role: 'admin' }).select('email').lean();
    admins.forEach((a) => console.log(`  - ${a.email}`));
    console.log('\nDone (admin already present).');
    await mongoose.connection.close();
    process.exit(0);
    return;
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@leasetogether.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  let existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.subscriptionActive = true;
    existing.isDisabled = false;
    if (process.env.ADMIN_PASSWORD) {
      existing.password = process.env.ADMIN_PASSWORD;
    }
    await existing.save();
    console.log(`\nPromoted existing account to admin: ${email}`);
  } else {
    await User.create({
      firstName: 'Admin',
      lastInitial: 'U',
      email,
      password,
      role: 'admin',
      subscriptionActive: true,
      trialActive: true,
      isOpenToRoommate: false,
    });
    console.log(`\nCreated admin user: ${email}`);
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.log('Initial password is the default from docs (change after login): admin123');
  }

  console.log('\nDone.');
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
