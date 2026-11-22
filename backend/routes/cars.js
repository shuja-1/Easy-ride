import express from 'express';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadCarImage, removeUploadedImage } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/error.js';
import { escapeRegex } from '../utils/helpers.js';

const router = express.Router();
const CAR_TYPES = ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Luxury', 'Electric'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];

const validateCar = (body) => {
  const name = String(body.name || '').trim();
  const model = String(body.model || '').trim();
  const regNumber = String(body.regNumber || '').trim().toUpperCase();
  const location = String(body.location || '').trim();
  const description = String(body.description || '').trim();
  const pricePerDay = Number(body.pricePerDay);
  const seats = Number(body.seats);

  if (!name || !model || !regNumber || !location || !description) {
    return 'All text fields are required';
  }
  if (!/^[A-Z0-9][A-Z0-9 -]{4,19}$/.test(regNumber)) {
    return 'Enter a valid registration number (example: MH 01 AB 1234)';
  }
  if (!CAR_TYPES.includes(body.type)) return 'Select a valid car type';
  if (!FUEL_TYPES.includes(body.fuelType)) return 'Select a valid fuel type';
  if (!Number.isFinite(pricePerDay) || pricePerDay < 1) return 'Enter a valid price per day';
  if (!Number.isInteger(seats) || seats < 1 || seats > 10) return 'Seats must be between 1 and 10';
  if (description.length < 20) return 'Description should be at least 20 characters';
  return null;
};

// Public: list approved cars with filters
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { location, type, q, start, end, minPrice, maxPrice, sort } = req.query;
    const query = { status: 'approved', isAvailable: true };

    if (type && CAR_TYPES.includes(type)) query.type = type;
    if (location) query.location = new RegExp(`^${escapeRegex(String(location).trim())}$`, 'i');
    if (q) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      query.$or = [{ name: rx }, { model: rx }, { location: rx }];
    }
    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
    }

    const sortMap = {
      price_asc: { pricePerDay: 1 },
      price_desc: { pricePerDay: -1 },
      oldest: { createdAt: 1 },
    };

    let cars = await Car.find(query)
      .populate('provider', 'name phone')
      .sort(sortMap[sort] || { createdAt: -1 })
      .limit(60);

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid rental dates' });
      }
      const bookedIds = await Booking.distinct('car', {
        car: { $in: cars.map((car) => car._id) },
        status: { $in: ['pending', 'approved'] },
        pickupDate: { $lt: endDate },
        returnDate: { $gt: startDate },
      });
      const booked = new Set(bookedIds.map(String));
      cars = cars.filter((car) => !booked.has(String(car._id)));
    }

    res.json({ cars, count: cars.length });
  })
);

router.get(
  '/locations',
  asyncHandler(async (req, res) => {
    const locations = await Car.distinct('location', { status: 'approved', isAvailable: true });
    res.json({ locations: locations.sort() });
  })
);

// Provider: own cars
router.get(
  '/provider/mine',
  protect,
  authorize('provider'),
  asyncHandler(async (req, res) => {
    const cars = await Car.find({ provider: req.user._id }).sort({ createdAt: -1 });
    res.json({ cars });
  })
);

// Public: single approved car
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const car = await Car.findOne({ _id: req.params.id, status: 'approved' }).populate(
      'provider',
      'name phone createdAt'
    );
    if (!car) return res.status(404).json({ message: 'Car not found or not approved yet' });
    res.json({ car });
  })
);

// Provider: add car
router.post(
  '/',
  protect,
  authorize('provider'),
  uploadCarImage,
  asyncHandler(async (req, res) => {
    const error = validateCar(req.body);
    if (error) {
      if (req.file) removeUploadedImage(`/uploads/cars/${req.file.filename}`);
      return res.status(400).json({ message: error });
    }
    if (!req.file) return res.status(400).json({ message: 'Car photo is required' });

    const regNumber = String(req.body.regNumber).trim().toUpperCase();
    if (await Car.findOne({ regNumber })) {
      removeUploadedImage(`/uploads/cars/${req.file.filename}`);
      return res.status(400).json({ message: 'This registration number is already listed' });
    }

    const car = await Car.create({
      provider: req.user._id,
      name: String(req.body.name).trim(),
      model: String(req.body.model).trim(),
      regNumber,
      type: req.body.type,
      pricePerDay: Number(req.body.pricePerDay),
      fuelType: req.body.fuelType,
      seats: Number(req.body.seats),
      location: String(req.body.location).trim(),
      description: String(req.body.description).trim(),
      image: `/uploads/cars/${req.file.filename}`,
      status: 'pending',
    });

    res.status(201).json({
      car,
      message: 'Car submitted for admin approval',
    });
  })
);

// Provider: edit own car
router.put(
  '/:id',
  protect,
  authorize('provider'),
  uploadCarImage,
  asyncHandler(async (req, res) => {
    const car = await Car.findOne({ _id: req.params.id, provider: req.user._id });
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const error = validateCar(req.body);
    if (error) {
      if (req.file) removeUploadedImage(`/uploads/cars/${req.file.filename}`);
      return res.status(400).json({ message: error });
    }

    const regNumber = String(req.body.regNumber).trim().toUpperCase();
    if (regNumber !== car.regNumber && (await Car.findOne({ regNumber }))) {
      if (req.file) removeUploadedImage(`/uploads/cars/${req.file.filename}`);
      return res.status(400).json({ message: 'This registration number is already listed' });
    }

    const oldImage = car.image;
    Object.assign(car, {
      name: String(req.body.name).trim(),
      model: String(req.body.model).trim(),
      regNumber,
      type: req.body.type,
      pricePerDay: Number(req.body.pricePerDay),
      fuelType: req.body.fuelType,
      seats: Number(req.body.seats),
      location: String(req.body.location).trim(),
      description: String(req.body.description).trim(),
      isAvailable: req.body.isAvailable === undefined ? car.isAvailable : req.body.isAvailable === 'true',
    });
    if (req.file) car.image = `/uploads/cars/${req.file.filename}`;

    await car.save();
    if (req.file && oldImage) removeUploadedImage(oldImage);

    res.json({ car, message: 'Car updated successfully' });
  })
);

// Provider (own) or admin: delete car
router.delete(
  '/:id',
  protect,
  authorize('provider', 'admin'),
  asyncHandler(async (req, res) => {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, provider: req.user._id };
    const car = await Car.findOne(filter);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const activeBookings = await Booking.countDocuments({
      car: car._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'This car has active bookings. Resolve them before deleting the listing',
      });
    }

    const completed = await Booking.countDocuments({ car: car._id });
    if (completed > 0) {
      car.isAvailable = false;
      await car.save();
      return res.json({ message: 'Car has past bookings, so it was marked unavailable instead of deleted' });
    }

    removeUploadedImage(car.image);
    await car.deleteOne();
    res.json({ message: 'Car deleted successfully' });
  })
);

export default router;
