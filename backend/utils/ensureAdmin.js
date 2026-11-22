import User from '../models/User.js';

export const ensureAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const admin = await User.findOne({ role: 'admin' });
  if (admin) return;

  await User.create({
    name: ADMIN_NAME || 'EasyRide Admin',
    email: ADMIN_EMAIL,
    phone: '9000000000',
    password: ADMIN_PASSWORD,
    role: 'admin',
  });
  console.log(`Admin account ready → ${ADMIN_EMAIL}`);
};
