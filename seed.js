require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./models/User');
const Apartment = require('./models/Apartment');
const MeetUp = require('./models/MeetUp');

const seed = async () => {
  const originalUri = process.env.MONGO_URI || '';

  const buildNonSrvUri = async (srvUri) => {
    const u = new URL(srvUri);
    const username = decodeURIComponent(u.username || '');
    const password = decodeURIComponent(u.password || '');
    const host = u.hostname;
    const dbName = (u.pathname || '/').replace(/^\//, '') || 'leasetogether';

    const resolver = new dns.promises.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

    const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
    if (!srvRecords?.length) throw new Error('Could not resolve MongoDB SRV records');

    const hosts = srvRecords
      .map((r) => `${r.name}:${r.port || 27017}`)
      .sort()
      .join(',');

    const merged = new URLSearchParams(u.searchParams);
    try {
      const txtRecords = await resolver.resolveTxt(host);
      const txt = (txtRecords || []).flat().join('&');
      if (txt) {
        const txtParams = new URLSearchParams(txt);
        for (const [k, v] of txtParams.entries()) {
          if (!merged.has(k)) merged.set(k, v);
        }
      }
    } catch {
      // ignore
    }

    if (!merged.has('tls') && !merged.has('ssl')) merged.set('tls', 'true');

    const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
    const qs = merged.toString();
    return `mongodb://${auth}${hosts}/${dbName}${qs ? `?${qs}` : ''}`;
  };

  const uriToUse = originalUri.startsWith('mongodb+srv://') ? await buildNonSrvUri(originalUri) : originalUri;

  await mongoose.connect(uriToUse);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Apartment.deleteMany({});
  await MeetUp.deleteMany({});

  const apartments = await Apartment.create([
    { name: 'Sunrise Residences', address: '123 Oak Ave', city: 'Austin', state: 'TX', zipCode: '78701', accessCode: 'SUNRISE24' },
    { name: 'Blue Lake Apartments', address: '456 Maple St', city: 'Denver', state: 'CO', zipCode: '80201', accessCode: 'BLUELAKE24' },
    { name: 'The Grove Community', address: '789 Pine Rd', city: 'Seattle', state: 'WA', zipCode: '98101', accessCode: 'GROVE24' },
  ]);
  console.log('Apartments seeded');

  await User.create({
    firstName: 'Admin',
    lastInitial: 'U',
    email: 'admin@leasetogether.com',
    password: 'admin123',
    role: 'admin',
    apartment: apartments[0]._id,
    apartmentName: apartments[0].name,
    age: 30,
    isOpenToRoommate: false,
  });

  await User.create([
    {
      firstName: 'Alex',
      lastInitial: 'R',
      email: 'alex@example.com',
      password: 'password123',
      apartment: apartments[0]._id,
      apartmentName: apartments[0].name,
      age: 24,
      major: 'Business',
      bio: 'Love the gym and gaming on weekends.',
      moveInTimeframe: 'ASAP',
      intent: 'Looking for a Roommate',
      isOpenToRoommate: true,
      socialVibe: 'Chill but down for plans',
      weekendPlans: 'Small hangouts / kickbacks',
      energyLevel: 'Balanced',
      conflictStyle: 'Talk it out calmly',
      personalSpace: 'Balanced',
      lifestylePace: 'Balanced',
      rechargeStyle: 'Music / hobbies',
      roommateValue: 'Respect',
      dailyRoutine: 'Flexible',
      communicationStyle: 'Text',
      hobbies: 'Gym, Gaming',
    },
    {
      firstName: 'Jordan',
      lastInitial: 'L',
      email: 'jordan@example.com',
      password: 'password123',
      apartment: apartments[0]._id,
      apartmentName: apartments[0].name,
      age: 26,
      major: 'Nursing',
      bio: 'Early bird, clean, and respectful.',
      moveInTimeframe: 'Within 1 month',
      intent: 'Looking to Swap Rooms',
      isOpenToRoommate: true,
      socialVibe: 'Lowkey & selective',
      weekendPlans: 'Resetting / catching up',
      energyLevel: 'Calm',
      conflictStyle: 'Say it right away',
      personalSpace: 'I need my space',
      lifestylePace: 'Chill / slow-paced',
      rechargeStyle: 'Alone time',
      roommateValue: 'Cleanliness',
      dailyRoutine: 'Structured',
      communicationStyle: 'In person',
      hobbies: 'Reading, Yoga',
    },
    {
      firstName: 'Sam',
      lastInitial: 'C',
      email: 'sam@example.com',
      password: 'password123',
      apartment: apartments[1]._id,
      apartmentName: apartments[1].name,
      age: 22,
      major: 'Psychology',
      bio: 'Student, love going out on weekends.',
      moveInTimeframe: '1-3 months',
      intent: 'Lease Available',
      isOpenToRoommate: true,
      socialVibe: 'Always outside / social',
      weekendPlans: 'Going out / parties',
      energyLevel: 'High energy',
      conflictStyle: 'Avoid it if possible',
      personalSpace: 'I like being around people',
      lifestylePace: 'Always moving',
      rechargeStyle: 'Being social',
      roommateValue: 'Similar lifestyle',
      dailyRoutine: 'No real routine',
      communicationStyle: 'Text',
      hobbies: 'Sports, Going out',
    },
    {
      firstName: 'Morgan',
      lastInitial: 'K',
      email: 'morgan@example.com',
      password: 'password123',
      apartment: apartments[1]._id,
      apartmentName: apartments[1].name,
      age: 28,
      major: 'Finance',
      bio: 'Night shift worker, quiet and clean.',
      moveInTimeframe: 'ASAP',
      intent: 'Looking for a Roommate',
      isOpenToRoommate: false,
      socialVibe: 'Homebody 100%',
      weekendPlans: 'Gaming / Netflix',
      energyLevel: 'Calm',
      conflictStyle: 'Need time first',
      personalSpace: 'I need my space',
      lifestylePace: 'Chill / slow-paced',
      rechargeStyle: 'Sleep',
      roommateValue: 'Peace & quiet',
      dailyRoutine: 'Structured',
      communicationStyle: 'Text',
      hobbies: 'Netflix, Music',
    },
  ]);

  console.log('Seed complete.');
  console.log('Admin: admin@leasetogether.com / admin123');
  console.log('Sample user: alex@example.com / password123');
  console.log('Access codes: SUNRISE24, BLUELAKE24, GROVE24');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
