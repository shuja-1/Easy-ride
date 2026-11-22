import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { ensureAdmin } from './utils/ensureAdmin.js';
import authRoutes from './routes/auth.js';
import carRoutes from './routes/cars.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to backend/.env');
  process.exit(1);
}

const allowedOrigins = [
  ...(process.env.CLIENT_URL || 'http://localhost:5173').split(','),
  process.env.RENDER_EXTERNAL_URL,
]
  .map((origin) => origin && origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Blocked by CORS'));
    },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

fs.mkdirSync(path.join(__dirname, 'uploads', 'cars'), { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EasyRide API',
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    demoUpi: !process.env.RAZORPAY_KEY_ID,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFound);

const clientDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { maxAge: '1d', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await ensureAdmin();
  app.listen(PORT, () => console.log(`EasyRide API running → http://localhost:${PORT}`));
};

start();
