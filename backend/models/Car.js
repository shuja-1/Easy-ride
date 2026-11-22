import mongoose from 'mongoose';

const carSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Car name is required'], trim: true, maxlength: 80 },
    model: { type: String, required: [true, 'Model is required'], trim: true, maxlength: 60 },
    regNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    type: {
      type: String,
      required: true,
      enum: ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Luxury', 'Electric'],
    },
    pricePerDay: { type: Number, required: true, min: [1, 'Price must be positive'] },
    fuelType: {
      type: String,
      required: true,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'],
    },
    seats: { type: Number, required: true, min: 1, max: 10 },
    location: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 700 },
    image: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '', maxlength: 200 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

carSchema.index({ location: 1, type: 1, status: 1 });

export default mongoose.model('Car', carSchema);
