export const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export const isoDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

export const addDaysISO = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};

export const todayISO = () => isoDate(new Date());
export const tomorrowISO = () => addDaysISO(new Date(), 1);

export const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
};

export const roleLabel = (role) =>
  ({ customer: 'Customer', provider: 'Car Provider', admin: 'Administrator' })[role] || role;

export const dashboardPath = (role) =>
  ({ customer: '/dashboard', provider: '/provider', admin: '/admin' })[role] || '/';

export const statusLabel = (status = '') =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const CAR_TYPES = ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Luxury', 'Electric'];
export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
