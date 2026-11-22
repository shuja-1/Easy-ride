import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Car from './models/Car.js';

const password = process.env.DEMO_PASSWORD || 'Demo@123';

const ensureUser = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;
  return User.create({ ...data, password: data.password || password });
};

const cars = [
  {
    name: 'Maruti Suzuki Swift Dzire',
    model: '2024 VXi',
    regNumber: 'MH 01 DZ 2800',
    type: 'Sedan',
    pricePerDay: 2800,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Mumbai',
    description:
      'A practical, fuel-efficient sedan for city commutes and weekend getaways. Comfortable seating, a large boot and easy driving make it a reliable everyday choice.',
    image: '/uploads/cars/maruti-dzire.jpg',
    status: 'approved',
  },
  {
    name: 'Hyundai Verna',
    model: '2020 SX (O)',
    regNumber: 'DL 02 VR 3300',
    type: 'Sedan',
    pricePerDay: 3300,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Delhi',
    description:
      'A refined premium sedan with a smooth petrol engine, comfortable cabin and solid highway manners. Ideal for business travel and family journeys.',
    image: '/uploads/cars/hyundai-verna.jpg',
    status: 'approved',
  },
  {
    name: 'Toyota Fortuner',
    model: '2023 Legender 4x4',
    regNumber: 'RJ 14 FT 6500',
    type: 'SUV',
    pricePerDay: 6500,
    fuelType: 'Diesel',
    seats: 7,
    location: 'Jaipur',
    description:
      'A commanding full-size SUV built for long road trips and mountain escapes. Seven seats, strong diesel torque and go-anywhere capability with premium comfort.',
    image: '/uploads/cars/toyota-fortuner.jpg',
    status: 'approved',
  },
  {
    name: 'Hyundai Creta',
    model: '2024 SX (O)',
    regNumber: 'KA 04 CR 3900',
    type: 'SUV',
    pricePerDay: 3900,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Bengaluru',
    description:
      'India’s favourite mid-size SUV with a modern cabin, panoramic sunroof and smooth city manners. A versatile pick for family trips and daily drives.',
    image: '/uploads/cars/hyundai-creta.jpg',
    status: 'approved',
  },
  {
    name: 'Toyota Innova Crysta',
    model: '2023 2.4 ZX',
    regNumber: 'TN 10 IN 4500',
    type: 'MPV',
    pricePerDay: 4500,
    fuelType: 'Diesel',
    seats: 7,
    location: 'Chennai',
    description:
      'The trusted people-mover for family holidays and airport transfers. Spacious captain seats, excellent ride comfort and proven long-distance reliability.',
    image: '/uploads/cars/toyota-innova.jpg',
    status: 'approved',
  },
  {
    name: 'Mercedes-Benz E-Class',
    model: '2024 E200',
    regNumber: 'MH 02 ME 1200',
    type: 'Luxury',
    pricePerDay: 12000,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Mumbai',
    description:
      'Executive luxury with a whisper-quiet cabin, advanced driver assistance and first-class rear comfort. Perfect for weddings, corporate travel and special events.',
    image: '/uploads/cars/mercedes-eclass.jpg',
    status: 'approved',
  },
  {
    name: 'BMW 5 Series',
    model: '2024 520i M Sport',
    regNumber: 'DL 05 BM 1150',
    type: 'Luxury',
    pricePerDay: 11500,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Delhi',
    description:
      'A driver’s delight with sporty handling, a tech-loaded cabin and elegant design. The ideal luxury sedan for business meetings and premium weekend drives.',
    image: '/uploads/cars/bmw-5-series.jpg',
    status: 'approved',
  },
  {
    name: 'Maruti Suzuki Swift',
    model: '2024 ZXi',
    regNumber: 'MH 14 SW 2200',
    type: 'Hatchback',
    pricePerDay: 2200,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Pune',
    description:
      'A nimble and efficient hatchback made for busy city streets. Easy to park, light on fuel and surprisingly fun to drive on short weekend trips.',
    image: '/uploads/cars/maruti-swift.jpg',
    status: 'approved',
  },
  {
    name: 'Tata Nexon EV',
    model: '2024 Empowered+',
    regNumber: 'TS 08 NE 3000',
    type: 'Electric',
    pricePerDay: 3000,
    fuelType: 'Electric',
    seats: 5,
    location: 'Hyderabad',
    description:
      'A practical electric SUV with a quiet cabin, instant torque and a 400 km real-world range. Charge at home or at any of our partner fast-charging hubs.',
    image: '/uploads/cars/tata-nexon-ev.jpg',
    status: 'approved',
  },
  {
    name: 'Mahindra Thar',
    model: '2024 LX 4x4',
    regNumber: 'GA 03 TH 4800',
    type: 'SUV',
    pricePerDay: 4800,
    fuelType: 'Diesel',
    seats: 4,
    location: 'Goa',
    description:
      'A lifestyle off-roader built for beach drives and hill trails. Four-wheel drive, a rugged stance and a convertible feel make every trip memorable.',
    image: '/uploads/cars/mahindra-thar.jpg',
    status: 'pending',
  },
  {
    name: 'Honda City',
    model: '2024 ZX CVT',
    regNumber: 'GJ 01 HC 3200',
    type: 'Sedan',
    pricePerDay: 3200,
    fuelType: 'Petrol',
    seats: 5,
    location: 'Ahmedabad',
    description:
      'A comfortable and feature-rich sedan with smooth automatic transmission and excellent rear-seat comfort. Awaiting final admin review before it goes live.',
    image: '/uploads/cars/honda-city.jpg',
    status: 'pending',
  },
];

const seed = async () => {
  await connectDB();

  const admin = await ensureUser({
    name: process.env.ADMIN_NAME || 'EasyRide Admin',
    email: process.env.ADMIN_EMAIL || 'admin@easyride.com',
    phone: '9000000000',
    role: 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  });

  const provider = await ensureUser({
    name: 'Arjun Mehta',
    email: 'provider@easyride.com',
    phone: '9812345670',
    role: 'provider',
  });

  const providerTwo = await ensureUser({
    name: 'Priya Nair',
    email: 'priya@easyride.com',
    phone: '9812345671',
    role: 'provider',
  });

  await ensureUser({
    name: 'Riya Sharma',
    email: 'customer@easyride.com',
    phone: '9812345672',
    role: 'customer',
  });

  let inserted = 0;
  for (const [index, car] of cars.entries()) {
    const exists = await Car.findOne({ regNumber: car.regNumber });
    if (!exists) {
      await Car.create({
        ...car,
        provider: index % 3 === 0 ? providerTwo._id : provider._id,
      });
      inserted += 1;
    }
  }

  console.log('\nEasyRide demo data ready');
  console.log(`Admin     : ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log(`Provider  : provider@easyride.com / ${password}`);
  console.log(`Provider  : priya@easyride.com / ${password}`);
  console.log(`Customer  : customer@easyride.com / ${password}`);
  const approvedCount = await Car.countDocuments({ status: 'approved' });
  const pendingCount = await Car.countDocuments({ status: 'pending' });
  console.log(`Cars added: ${inserted} (${approvedCount} approved, ${pendingCount} awaiting approval)\n`);

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
