import jwt from 'jsonwebtoken';

export const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const calculateDays = (pickupDate, returnDate) => {
  const ms = new Date(returnDate) - new Date(pickupDate);
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

export const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
