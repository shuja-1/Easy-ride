import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { removeUploadedImage } from '../middleware/upload.js';
import { splitPayout, PLATFORM_FEE_PERCENT } from '../utils/payout.js';

const router = express.Router();
router.use(protect, authorize('admin'));

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [customers, providers, totalCars, approvedCars, pendingCars, totalBookings, activeBookings, paidPayments] =
      await Promise.all([
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'provider' }),
        Car.countDocuments(),
        Car.countDocuments({ status: 'approved' }),
        Car.countDocuments({ status: 'pending' }),
        Booking.countDocuments(),
        Booking.countDocuments({ status: { $in: ['pending', 'approved'] } }),
        Payment.find({ status: 'paid' }).select('amount platformFee providerAmount createdAt').lean(),
      ]);

    const revenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const platformEarnings = paidPayments.reduce((sum, payment) => {
      const split = payment.platformFee === undefined ? splitPayout(payment.amount) : payment;
      return sum + split.platformFee;
    }, 0);
    const providerPayouts = paidPayments.reduce((sum, payment) => {
      const split = payment.providerAmount === undefined ? splitPayout(payment.amount) : payment;
      return sum + split.providerAmount;
    }, 0);
    const round2 = (value) => Math.round(value * 100) / 100;
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const monthly = await Payment.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          revenue: { $sum: '$amount' },
          payments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const months = [];
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = monthly.find((item) => item._id === key);
      months.push({
        month: d.toLocaleString('en-IN', { month: 'short' }),
        revenue: found?.revenue || 0,
        payments: found?.payments || 0,
      });
    }

    const [recentBookings, pendingList] = await Promise.all([
      Booking.find()
        .populate('customer', 'name email')
        .populate('car', 'name image')
        .sort({ createdAt: -1 })
        .limit(5),
      Car.find({ status: 'pending' }).populate('provider', 'name email').sort({ createdAt: 1 }).limit(5),
    ]);

    res.json({
      stats: {
        customers,
        providers,
        totalCars,
        approvedCars,
        pendingCars,
        totalBookings,
        activeBookings,
        revenue,
        platformEarnings: round2(platformEarnings),
        providerPayouts: round2(providerPayouts),
        platformFeePercent: PLATFORM_FEE_PERCENT,
        paidPayments: paidPayments.length,
      },
      revenueByMonth: months,
      recentBookings,
      pendingCars: pendingList,
    });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const filter = ['customer', 'provider', 'admin'].includes(req.query.role)
      ? { role: req.query.role }
      : { role: { $in: ['customer', 'provider'] } };
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ users: users.map((user) => user.toSafeObject()) });
  })
);

router.patch(
  '/users/:id/block',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be blocked' });
    }

    user.isBlocked = Boolean(req.body.isBlocked);
    await user.save();
    res.json({ user: user.toSafeObject(), message: user.isBlocked ? 'Account blocked' : 'Account unblocked' });
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be deleted' });
    }

    const activeBookings = await Booking.countDocuments({
      $or: [{ customer: user._id }, { provider: user._id }],
      status: { $in: ['pending', 'approved'] },
    });
    if (activeBookings > 0) {
      return res.status(400).json({ message: 'This account has active bookings. Resolve them first' });
    }

    const cars = await Car.find({ provider: user._id });
    const carIds = cars.map((car) => car._id);
    const bookings = await Booking.find({
      $or: [{ customer: user._id }, { provider: user._id }, { car: { $in: carIds } }],
    }).select('_id');

    await Payment.deleteMany({
      $or: [{ customer: user._id }, { booking: { $in: bookings.map((booking) => booking._id) } }],
    });
    await Booking.deleteMany({ _id: { $in: bookings.map((booking) => booking._id) } });
    cars.forEach((car) => removeUploadedImage(car.image));
    await Car.deleteMany({ provider: user._id });
    await user.deleteOne();

    res.json({ message: 'Account and related records deleted' });
  })
);

router.get(
  '/cars',
  asyncHandler(async (req, res) => {
    const filter = ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? { status: req.query.status }
      : {};
    const cars = await Car.find(filter)
      .populate('provider', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ cars });
  })
);

router.patch(
  '/cars/:id/status',
  asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    car.status = status;
    car.rejectionReason = status === 'rejected' ? String(rejectionReason || 'Does not meet our listing guidelines').trim() : '';
    await car.save();
    res.json({ car, message: `Listing ${status}` });
  })
);

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find()
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('car', 'name image regNumber location')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  })
);

router.patch(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status' });
    }

    const booking = await Booking.findById(req.params.id).populate('car', 'status');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (status === 'approved' && booking.car?.status !== 'approved') {
      return res.status(400).json({ message: 'Approve the car listing first' });
    }
    if (status === 'completed' && booking.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Only paid bookings can be marked completed' });
    }

    booking.status = status;
    await booking.save();
    res.json({ booking, message: `Booking marked ${status}` });
  })
);

router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const payments = await Payment.find()
      .select('-signature -orderId')
      .populate('customer', 'name email phone')
      .populate({
        path: 'booking',
        select: 'pickupDate returnDate totalPrice car',
        populate: { path: 'car', select: 'name image regNumber' },
      })
      .sort({ createdAt: -1 });
    res.json({ payments });
  })
);

export default router;
