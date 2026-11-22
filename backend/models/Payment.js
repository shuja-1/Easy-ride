import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    platformFeePercent: { type: Number, min: 0, max: 100 },
    platformFee: { type: Number, min: 0 },
    providerAmount: { type: Number, min: 0 },
    mode: { type: String, enum: ['razorpay', 'demo'], required: true },
    orderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    signature: { type: String, default: '' },
    upiId: { type: String, default: '' },
    transactionRef: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    failureReason: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ customer: 1, status: 1 });

export default mongoose.model('Payment', paymentSchema);
