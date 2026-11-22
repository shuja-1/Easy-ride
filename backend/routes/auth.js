import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { signToken } from '../utils/helpers.js';

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, role } = req.body;
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!['customer', 'provider'].includes(role)) {
      return res.status(400).json({ message: 'Choose a valid account type' });
    }
    if (await User.findOne({ email: cleanEmail })) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role,
    });

    res.status(201).json({ token: signToken(user), user: user.toSafeObject() });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin' });
    }

    res.json({ token: signToken(user), user: user.toSafeObject() });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toSafeObject() });
  })
);

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const { name, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (name !== undefined) {
      if (!String(name).trim() || String(name).trim().length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters' });
      }
      user.name = String(name).trim();
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return res.status(400).json({ message: 'Enter a valid 10-digit Indian phone number' });
      }
      user.phone = cleanPhone;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Enter your current password' });
      }
      if (!(await user.matchPassword(currentPassword))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      user.password = newPassword;
    }

    await user.save();
    res.json({ user: user.toSafeObject(), message: 'Profile updated successfully' });
  })
);

export default router;
