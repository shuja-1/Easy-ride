import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { splitPayout } from '../utils/payout.js';

const router = express.Router();

const razorpayEnabled = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const rzp = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

// Customer: start a UPI payment for an approved booking
router.post(
  '/create-order',
  protect,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, customer: req.user._id }).populate(
      'car',
      'name image location'
    );

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'approved') {
      return res.status(400).json({ message: 'Payment is available after the provider approves your booking' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This booking is already paid' });
    }

    if (razorpayEnabled()) {
      const order = await rzp().orders.create({
        amount: Math.round(booking.totalPrice * 100),
        currency: 'INR',
        receipt: `easyride_${booking._id}`,
        notes: {
          bookingId: String(booking._id),
          car: booking.car?.name || 'Car rental',
        },
      });

      const payment = await Payment.create({
        booking: booking._id,
        customer: req.user._id,
        amount: booking.totalPrice,
        ...splitPayout(booking.totalPrice),
        mode: 'razorpay',
        orderId: order.id,
      });

      return res.json({
        mode: 'razorpay',
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentRecordId: payment._id,
        platformFee: payment.platformFee,
        providerAmount: payment.providerAmount,
        booking: { id: booking._id, totalPrice: booking.totalPrice },
      });
    }

    // Demo UPI simulation: used only when Razorpay keys are not configured.
    const transactionRef = `ER${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
    const upiId = process.env.UPI_ID || 'easyride@okaxis';
    const payment = await Payment.create({
      booking: booking._id,
      customer: req.user._id,
      amount: booking.totalPrice,
      ...splitPayout(booking.totalPrice),
      mode: 'demo',
      upiId,
      transactionRef,
    });

    const params = new URLSearchParams({
      pa: upiId,
      pn: process.env.UPI_NAME || 'EasyRide Car Rentals',
      am: booking.totalPrice.toFixed(2),
      cu: 'INR',
      tn: `EasyRide booking ${booking._id}`,
      tr: transactionRef,
    });

    res.json({
      mode: 'demo',
      paymentRecordId: payment._id,
      amount: booking.totalPrice,
      platformFee: payment.platformFee,
      providerAmount: payment.providerAmount,
      upiId,
      transactionRef,
      upiUri: `upi://pay?${params.toString()}`,
      booking: { id: booking._id, totalPrice: booking.totalPrice },
    });
  })
);

// Customer: verify Razorpay signature/amount OR confirm demo UPI transfer
router.post(
  '/verify',
  protect,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    const { paymentRecordId, razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionRef } =
      req.body;

    const payment = await Payment.findOne({ _id: paymentRecordId, customer: req.user._id });
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });
    if (payment.status === 'paid') return res.status(400).json({ message: 'Payment already verified' });

    const booking = await Booking.findById(payment.booking);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This booking is already paid' });
    }
    if (payment.amount !== booking.totalPrice) {
      payment.status = 'failed';
      payment.failureReason = 'Amount mismatch';
      await payment.save();
      return res.status(400).json({ message: 'Payment amount does not match the booking total' });
    }

    Object.assign(payment, splitPayout(booking.totalPrice));

    if (payment.mode === 'razorpay') {
      if (!razorpayEnabled()) {
        return res.status(503).json({ message: 'Razorpay is not configured on this server' });
      }
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing Razorpay payment details' });
      }
      if (razorpay_order_id !== payment.orderId) {
        return res.status(400).json({ message: 'Order does not belong to this booking' });
      }

      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const expectedBuffer = Buffer.from(expected);
      const receivedBuffer = Buffer.from(String(razorpay_signature));
      const validSignature =
        expectedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

      if (!validSignature) {
        payment.status = 'failed';
        payment.failureReason = 'Invalid payment signature';
        await payment.save();
        return res.status(400).json({ message: 'Payment verification failed. Invalid signature' });
      }

      let rzpPayment;
      try {
        rzpPayment = await rzp().payments.fetch(razorpay_payment_id);
      } catch {
        return res.status(502).json({ message: 'Could not confirm the payment with Razorpay. Please retry' });
      }

      const isCaptured = ['captured', 'authorized'].includes(rzpPayment.status);
      if (!isCaptured || Number(rzpPayment.amount) !== Math.round(payment.amount * 100)) {
        payment.status = 'failed';
        payment.failureReason = 'Payment not captured or amount mismatch';
        await payment.save();
        return res.status(400).json({ message: 'Payment was not successful. No amount has been charged' });
      }

      payment.status = 'paid';
      payment.paymentId = rzpPayment.id;
      payment.signature = razorpay_signature;
      payment.transactionRef = rzpPayment.id;
      await payment.save();

      booking.paymentStatus = 'paid';
      await booking.save();

      return res.json({
        success: true,
        message: 'UPI payment verified successfully',
        payment: {
          id: payment._id,
          amount: payment.amount,
          platformFee: payment.platformFee,
          providerAmount: payment.providerAmount,
          transactionRef: payment.transactionRef,
        },
      });
    }

    // Demo mode is deliberately disabled once Razorpay keys exist.
    if (razorpayEnabled()) {
      return res.status(400).json({ message: 'Demo payments are disabled when Razorpay is configured' });
    }

    const cleanRef = String(transactionRef || '').trim();
    if (!/^[A-Za-z0-9-]{6,35}$/.test(cleanRef)) {
      return res.status(400).json({ message: 'Enter the 6–35 character UPI transaction reference shown in your app' });
    }

    payment.status = 'paid';
    payment.paymentId = `demo_${cleanRef}`;
    payment.transactionRef = cleanRef;
    await payment.save();

    booking.paymentStatus = 'paid';
    await booking.save();

    res.json({
      success: true,
      message: 'Payment recorded and verified',
      payment: {
        id: payment._id,
        amount: payment.amount,
        platformFee: payment.platformFee,
        providerAmount: payment.providerAmount,
        transactionRef: cleanRef,
      },
    });
  })
);

// Customer: own payment history
router.get(
  '/mine',
  protect,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    const payments = await Payment.find({ customer: req.user._id })
      .select('-signature -orderId')
      .populate({
        path: 'booking',
        select: 'pickupDate returnDate days totalPrice status paymentStatus car',
        populate: { path: 'car', select: 'name image location' },
      })
      .sort({ createdAt: -1 });
    res.json({ payments });
  })
);

export default router;
