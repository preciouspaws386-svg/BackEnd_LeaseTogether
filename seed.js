require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./models/User');
const Apartment = require('./models/Apartment');
const MeetUp = require('./models/MeetUp');
const AccessCode = require('./models/AccessCode');
const School = require('./models/School');
const Listing = require('./models/Listing');

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
  await AccessCode.deleteMany({});
  await School.deleteMany({});
  await Listing.deleteMany({});

  const apartments = await Apartment.create([
    { name: 'Sunrise Residences', address: '123 Oak Ave', city: 'Austin', state: 'TX', zipCode: '78701', accessCode: 'SUNRISE24', phoneNumber: '512-555-0100', websiteLink: 'https://sunriseresidences.com' },
    { name: 'Blue Lake Apartments', address: '456 Maple St', city: 'Denver', state: 'CO', zipCode: '80201', accessCode: 'BLUELAKE24', phoneNumber: '303-555-0200', websiteLink: 'https://bluelakeapartments.com' },
    { name: 'The Grove Community', address: '789 Pine Rd', city: 'Seattle', state: 'WA', zipCode: '98101', accessCode: 'GROVE24', phoneNumber: '206-555-0300', websiteLink: 'https://grovecommunity.com' },
  ]);
  console.log('Apartments seeded');

  // Seed schools with new schema
  const schools = await School.create([
    {
      name: 'University of Texas at Austin',
      state: 'TX',
      onCampusLocations: ['San Jacinto Hall', 'Moore Hall', 'Duren Hall', 'Kinsolving Hall', 'Littlefield House'],
      offCampusPartners: [apartments[0]._id]
    },
    {
      name: 'University of Colorado Boulder',
      state: 'CO',
      onCampusLocations: ['Baker Hall', 'Cheyenne Arapaho Hall', 'Fiske Hall', 'Liberty Hall'],
      offCampusPartners: [apartments[1]._id]
    },
    {
      name: 'University of Washington',
      state: 'WA',
      onCampusLocations: ['Husky Hall', 'Lander Hall', 'McMahon Hall', 'Popkin Hall'],
      offCampusPartners: [apartments[2]._id]
    },
    {
      name: 'University of Michigan',
      state: 'MI',
      onCampusLocations: ['Bursley Hall', 'Markley Hall', 'North Campus Housing'],
      offCampusPartners: []
    },
    {
      name: 'University of California Los Angeles',
      state: 'CA',
      onCampusLocations: ['Rieber Hall', 'Sproul Hall', 'Hedco Hall'],
      offCampusPartners: []
    },
    {
      name: 'New York University',
      state: 'NY',
      onCampusLocations: ['Brittany Hall', 'Cayuga Hall', 'Washington Square Village'],
      offCampusPartners: []
    },
    {
      name: 'University of Florida',
      state: 'FL',
      onCampusLocations: ['Broward Hall', 'Graham Hall', 'Keys Complex'],
      offCampusPartners: []
    },
    {
      name: 'Ohio State University',
      state: 'OH',
      onCampusLocations: ['Lincoln Tower', 'Scott Hall', 'Worthington Hall'],
      offCampusPartners: []
    }
  ]);
  console.log('Schools seeded');

  // Seed access codes with new schema
  const accessCodes = await AccessCode.create([
    // Public one-time codes
    { code: 'PUBLIC001', type: 'public', status: 'active' },
    { code: 'PUBLIC002', type: 'public', status: 'active' },
    { code: 'PUBLIC003', type: 'public', status: 'active' },
    { code: 'PUBLIC004', type: 'public', status: 'active' },
    { code: 'PUBLIC005', type: 'public', status: 'active' },
    // Landlord codes
    { code: 'LANDLORD001', type: 'landlord', status: 'active' },
    { code: 'LANDLORD002', type: 'landlord', status: 'active' },
    // Private multi-use codes
    { code: 'PRIVATEUT01', type: 'private', status: 'active', apartmentId: apartments[0]._id },
    { code: 'PRIVATECO01', type: 'private', status: 'active', apartmentId: apartments[1]._id },
    { code: 'PRIVATEWA01', type: 'private', status: 'active', apartmentId: apartments[2]._id },
  ]);
  console.log('Access codes seeded');

  // Seed listings
  const listings = await Listing.create([
    {
      school: schools[0]._id,
      type: 'Room',
      listingCategory: 'For Rent',
      furnished: true,
      pricePerMonth: 1200,
      deposit: 1200,
      bedrooms: '2',
      petFriendly: false,
      utilitiesIncluded: true,
      distanceFromSchool: '1 mile',
      parking: true,
      photos: ['https://example.com/image1.jpg'],
      description: 'Beautiful 2 bedroom apartment walking distance to campus. Fully furnished with modern amenities.',
      contactPhone: '512-555-0123',
      isAvailable: true,
      accessCode: 'LANDLORD001',
    },
    {
      school: schools[1]._id,
      type: 'Whole House',
      listingCategory: 'Sublease',
      furnished: false,
      pricePerMonth: 800,
      deposit: 800,
      bedrooms: '3+',
      petFriendly: true,
      utilitiesIncluded: false,
      distanceFromSchool: '3 miles',
      parking: true,
      photos: ['https://example.com/image2.jpg'],
      description: 'Perfect for students! Close to CU Boulder campus with mountain views.',
      contactPhone: '303-555-0456',
      isAvailable: true,
      accessCode: 'LANDLORD001',
    }
  ]);
  console.log('Listings seeded');

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
    school: schools[0]._id,
    campusPreference: 'Off Campus',
    memberSince: { month: 'January', year: 2023 },
    monthlyBudget: '$1200+',
    lgbtqFriendly: false,
    religion: 'No preference',
    transportation: ['Car'],
    socialMedia: {
      instagram: '@admin_leasetogether'
    },
    lifestyleVibes: {
      partyingFrequency: ['Not my thing'],
      drinking: ['Occasionally'],
      smoking: ['No'],
      marijuana: ['No'],
      roommatePartying: ['Totally fine'],
      roommateDrinking: ['Totally fine'],
      roommateSmoking: ['Only outside'],
      sleepSchedule: ['In bed before 11pm'],
      homeNoise: ['Quiet'],
      pets: ['Prefer no pets'],
      overnightGuests: ['Occasionally'],
      significantOther: ['Rarely']
    },
    livingTogether: {
      cleanliness: ['Super clean'],
      chores: ['Prefer a schedule'],
      sharedSpaces: ['Always clean'],
      foodSharing: ['Some shared items'],
      cooking: ['Every day'],
      homeTime: ['Balanced'],
      studyWork: ['Quiet and focused'],
      sharedItems: ['Some sharing'],
      bills: ['Very responsible / on time']
    },
    personalityVibe: {
      socialVibe: ['Chill but down for plans'],
      weekendPlans: ['Small hangouts / kickbacks'],
      energyLevel: ['Balanced'],
      conflictStyle: ['Talk it out calmly'],
      personalSpace: ['Balanced'],
      lifestylePace: ['Balanced'],
      rechargeStyle: ['Alone time'],
      roommateValue: ['Respect'],
      dailyRoutine: ['Structured'],
      communicationStyle: ['Text']
    },
    guestsAndVisitors: {
      guestFrequency: ['Occasionally'],
      overnightGuests: ['Sometimes']
    }
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
      intent: 'RM',
      isOpenToRoommate: true,
      school: schools[0]._id,
      campusPreference: 'Off Campus',
      memberSince: { month: 'January', year: 2024 },
      monthlyBudget: '$800–$1200',
      roommatePreference: 'No preference',
      lgbtqFriendly: true,
      religion: 'Christian',
      transportation: ['Car', 'Bike'],
      socialMedia: {
        instagram: '@alex_gamer24',
        snapchat: '@alexr24',
        tiktok: '@alexgamer'
      },
      lifestyleVibes: {
        partyingFrequency: ['A few times a month'],
        drinking: ['Socially'],
        smoking: ['No'],
        marijuana: ['No'],
        roommatePartying: ['Totally fine'],
        roommateDrinking: ['Totally fine'],
        roommateSmoking: ['Prefer not'],
        sleepSchedule: ['Midnight–1am'],
        homeNoise: ['Moderate'],
        pets: ['Fine with pets'],
        overnightGuestsOkay: ['Totally fine'],
        significantOther: ['Sometimes']
      },
      livingTogether: {
        cleanliness: ['Pretty clean'],
        chores: ['Split as needed'],
        sharedSpaces: ['Usually clean'],
        foodSharing: ['Share everything'],
        cooking: ['A few times a week'],
        homeTime: ['Balanced'],
        studyWork: ['Music/background noise'],
        sharedItems: ['Totally fine'],
        bills: ['Usually on top of it']
      },
      personalityVibe: {
        socialVibe: ['Always outside / social'],
        weekendPlans: ['Going out / parties'],
        energyLevel: ['High energy'],
        conflictStyle: ['Say it right away'],
        personalSpace: ["Doesn't matter"],
        lifestylePace: ['Always moving'],
        rechargeStyle: ['Being social'],
        roommateValue: ['Similar lifestyle'],
        dailyRoutine: ['Flexible'],
        communicationStyle: ['Text']
      },
      guestsAndVisitors: {
        guestFrequency: ['Often'],
        overnightGuests: ['Frequently']
      }
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
      intent: 'RS',
      isOpenToRoommate: true,
      school: schools[0]._id,
      campusPreference: 'On Campus',
      memberSince: { month: 'February', year: 2024 },
      monthlyBudget: '$500–$800',
      roommatePreference: 'Female',
      lgbtqFriendly: false,
      religion: 'Non-religious / Atheist',
      transportation: ['Walk', 'Bike'],
      socialMedia: {
        instagram: '@jordan_nurse'
      },
      lifestyleVibes: {
        partyingFrequency: ['Not my thing'],
        drinking: ['No'],
        smoking: ['No'],
        marijuana: ['No'],
        roommatePartying: ['Prefer not'],
        roommateDrinking: ['Prefer not'],
        roommateSmoking: ['Not okay'],
        sleepSchedule: ['In bed before 11pm'],
        homeNoise: ['Quiet'],
        pets: ['Have one (cat)'],
        overnightGuestsOkay: ['Rarely'],
        significantOther: ['No']
      },
      livingTogether: {
        cleanliness: ['Super clean'],
        chores: ['Prefer a schedule'],
        sharedSpaces: ['Always clean'],
        foodSharing: ['Prefer separate'],
        cooking: ['Every day'],
        homeTime: ['Mostly home'],
        studyWork: ['Quiet and focused'],
        sharedItems: ['Prefer separate'],
        bills: ['Very responsible / on time']
      },
      personalityVibe: {
        socialVibe: ['Homebody 100%'],
        weekendPlans: ['Resetting / catching up'],
        energyLevel: ['Calm'],
        conflictStyle: ['Need time first'],
        personalSpace: ['I need my space'],
        lifestylePace: ['Chill / slow-paced'],
        rechargeStyle: ['Alone time'],
        roommateValue: ['Cleanliness'],
        dailyRoutine: ['Structured'],
        communicationStyle: ['In person']
      },
      guestsAndVisitors: {
        guestFrequency: ['Rarely'],
        overnightGuests: ['Never']
      }
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
      intent: 'LT',
      isOpenToRoommate: true,
      school: schools[1]._id,
      campusPreference: 'No Preference',
      memberSince: { month: 'March', year: 2024 },
      monthlyBudget: '$800–$1200',
      roommatePreference: 'No preference',
      lgbtqFriendly: true,
      religion: 'Spiritual',
      transportation: ['Uber/Rideshare', 'Public Transit'],
      socialMedia: {
        facebook: 'sam.psych.student'
      },
      lifestyleVibes: {
        partyingFrequency: ['Every weekend'],
        drinking: ['Pretty often'],
        smoking: ['Occasionally'],
        marijuana: ['Occasionally'],
        roommatePartying: ['Totally fine'],
        roommateDrinking: ['Totally fine'],
        roommateSmoking: ['Only outside'],
        sleepSchedule: ['After 1am'],
        homeNoise: ['Loud/active'],
        pets: ['Planning to get one'],
        overnightGuestsOkay: ['Totally fine'],
        significantOther: ['Yes often']
      },
      livingTogether: {
        cleanliness: ['It is what it is'],
        chores: ["I'll do my part"],
        sharedSpaces: ['Sometimes messy'],
        foodSharing: ["Don't touch my stuff"],
        cooking: ['Rarely'],
        homeTime: ['In and out'],
        studyWork: ['Flexible'],
        sharedItems: ["Doesn't matter"],
        bills: ['Go with the flow']
      },
      personalityVibe: {
        socialVibe: ['Always outside / social'],
        weekendPlans: ['Going out / parties'],
        energyLevel: ['High energy'],
        conflictStyle: ['Avoid if possible'],
        personalSpace: ['I like being around people'],
        lifestylePace: ['Depends on the week'],
        rechargeStyle: ['Being social'],
        roommateValue: ['Peace & quiet'],
        dailyRoutine: ['No real routine'],
        communicationStyle: ['Depends']
      },
      guestsAndVisitors: {
        guestFrequency: ['Often'],
        overnightGuests: ['Frequently']
      }
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
      intent: 'RM',
      isOpenToRoommate: false,
      school: schools[1]._id,
      campusPreference: 'Off Campus',
      memberSince: { month: 'January', year: 2024 },
      monthlyBudget: '$1200+',
      roommatePreference: 'No preference',
      lgbtqFriendly: false,
      religion: 'No preference',
      transportation: ['Car'],
      socialMedia: {
        linkedin: 'morgan-finance'
      },
      lifestyleVibes: {
        partyingFrequency: ['Not my thing'],
        drinking: ['No'],
        smoking: ['No'],
        marijuana: ['No'],
        roommatePartying: ['Not okay'],
        roommateDrinking: ['Prefer not'],
        roommateSmoking: ['Not okay'],
        sleepSchedule: ['No consistent schedule'],
        homeNoise: ['Quiet'],
        pets: ['Prefer no pets'],
        overnightGuestsOkay: ['Rarely'],
        significantOther: ['No']
      },
      livingTogether: {
        cleanliness: ['Super clean'],
        chores: ['Prefer a schedule'],
        sharedSpaces: ['Always clean'],
        foodSharing: ['Prefer separate'],
        cooking: ['Every day'],
        homeTime: ['Barely there'],
        studyWork: ['Quiet and focused'],
        sharedItems: ['Prefer separate'],
        bills: ['Very responsible / on time']
      },
      personalityVibe: {
        socialVibe: ['Homebody 100%'],
        weekendPlans: ['Gaming / Netflix'],
        energyLevel: ['Calm'],
        conflictStyle: ['Need time first'],
        personalSpace: ['I need my space'],
        lifestylePace: ['Chill / slow-paced'],
        rechargeStyle: ['Sleep'],
        roommateValue: ['Peace & quiet'],
        dailyRoutine: ['Structured'],
        communicationStyle: ['Text']
      },
      guestsAndVisitors: {
        guestFrequency: ['Rarely'],
        overnightGuests: ['Never']
      }
    },
  ]);

  console.log('Seed complete.');
  console.log('Admin: admin@leasetogether.com / admin123');
  console.log('Sample users: alex@example.com, jordan@example.com, sam@example.com, morgan@example.com / password123');
  console.log('Public access codes: PUBLIC001, PUBLIC002, PUBLIC003, PUBLIC004, PUBLIC005');
  console.log('Landlord codes: LANDLORD001, LANDLORD002');
  console.log('Private codes: PRIVATEUT01 (Austin), PRIVATECO01 (Denver), PRIVATEWA01 (Seattle)');
  console.log('Apartments: SUNRISE24, BLUELAKE24, GROVE24');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
