import express from 'express';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { calculateDays, startOfToday } from '../utils/helpers.js';
import { splitPayout } from '../utils/payout.js';

const router = express.Router();

const parseDate = (value) => {
  const raw = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
};

const carFields = 'name model image type pricePerDay fuelType seats location regNumber';

// Customer: create booking
router.post(
  '/',
  protect,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    const { carId, pickupDate, returnDate } = req.body;
    if (!carId || !pickupDate || !returnDate) {
      return res.status(400).json({ message: 'Car and rental dates are required' });
    }

    const car = await Car.findById(carId);
    if (!car || car.status !== 'approved' || !car.isAvailable) {
      return res.status(404).json({ message: 'This car is not available for booking' });
    }

    const pickup = parseDate(pickupDate);
    const returnD = parseDate(returnDate);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnD.getTime())) {
      return res.status(400).json({ message: 'Invalid rental dates' });
    }
    if (pickup < startOfToday()) {
      return res.status(400).json({ message: 'Pickup date cannot be in the past' });
    }
    if (returnD <= pickup) {
      return res.status(400).json({ message: 'Return date must be after the pickup date' });
    }

    const days = calculateDays(pickup, returnD);
    if (days > 60) {
      return res.status(400).json({ message: 'Rental period cannot exceed 60 days' });
    }

    const overlap = await Booking.findOne({
      car: car._id,
      status: { $in: ['pending', 'approved'] },
      pickupDate: { $lt: returnD },
      returnDate: { $gt: pickup },
    });
    if (overlap) {
      return res.status(409).json({ message: 'This car is already booked for the selected dates' });
    }

    const booking = await Booking.create({
      customer: req.user._id,
      car: car._id,
      provider: car.provider,
      pickupDate: pickup,
      returnDate: returnD,
      pickupLocation: car.location,
      days,
      pricePerDay: car.pricePerDay,
      totalPrice: days * car.pricePerDay,
    });

    await booking.populate([
      { path: 'car', select: carFields },
      { path: 'provider', select: 'name phone' },
    ]);

    res.status(201).json({
      booking,
      message: 'Booking request sent. You can pay once the provider approves it',
    });
  })
);

// Customer: own bookings
router.get(
  '/mine',
  protect,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('car', carFields)
      .populate('provider', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  })
);

// Customer: cancel unpaid booking
router.patch(
  '/:id/cancel',
  protect,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!['pending', 'approved'].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking can no longer be cancelled' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Paid bookings cannot be cancelled online. Please contact support' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json({ booking, message: 'Booking cancelled' });
  })
);

// Provider: booking requests
router.get(
  '/provider/all',
  protect,
  authorize('provider'),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ provider: req.user._id })
      .populate('car', carFields)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({
      bookings: bookings.map((booking) => ({
        ...booking.toObject(),
        ...splitPayout(booking.totalPrice),
      })),
    });
  })
);

// Provider: approve or reject a pending request
router.patch(
  '/provider/:id',
  protect,
  authorize('provider'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, provider: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking request not found' });
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be updated' });
    }

    if (status === 'approved') {
      const car = await Car.findById(booking.car);
      if (!car || car.status !== 'approved' || !car.isAvailable) {
        return res.status(400).json({ message: 'The car is no longer available for this request' });
      }
      const clash = await Booking.findOne({
        _id: { $ne: booking._id },
        car: booking.car,
        status: 'approved',
        pickupDate: { $lt: booking.returnDate },
        returnDate: { $gt: booking.pickupDate },
      });
      if (clash) {
        return res.status(409).json({ message: 'Another approved booking overlaps these dates' });
      }
    }

    booking.status = status;
    await booking.save();
    await booking.populate([
      { path: 'car', select: carFields },
      { path: 'customer', select: 'name email phone' },
    ]);
    res.json({ booking, message: `Booking ${status}` });
  })
);

export default router;
