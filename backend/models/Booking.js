import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupLocation: { type: String, required: true, trim: true, maxlength: 60 },
    days: { type: Number, required: true, min: 1 },
    pricePerDay: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  },
  { timestamps: true }
);

bookingSchema.index({ car: 1, pickupDate: 1, returnDate: 1 });

export default mongoose.model('Booking', bookingSchema);
