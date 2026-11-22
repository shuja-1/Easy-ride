import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import CarCard from '../components/CarCard.jsx';
import DashboardShell from '../components/DashboardShell.jsx';
import EmptyState, { SkeletonGrid } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dashboardPath, dateLabel, inr, roleLabel, todayISO } from '../utils.js';

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'cars', label: 'Available cars', icon: 'car' },
  { id: 'bookings', label: 'My bookings', icon: 'calendar' },
  { id: 'payments', label: 'Payments', icon: 'creditCard' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

function BookingItem({ booking, onPay, onCancel }) {
  const car = booking.car;
  const canPay = booking.status === 'approved' && booking.paymentStatus === 'unpaid';
  const canCancel =
    ['pending', 'approved'].includes(booking.status) && booking.paymentStatus === 'unpaid';
  return (
    <article className="booking-item">
      <div className="booking-thumb">
        {car?.image ? (
          <img src={assetUrl(car.image)} alt={car.name} loading="lazy" />
        ) : (
          <span className="booking-thumb-fallback"><Icon name="car" size={26} /></span>
        )}
      </div>
      <div className="booking-body">
        <div className="booking-top">
          <div>
            <h3>{car?.name || 'Car listing removed'}</h3>
            <span className="booking-ref">Booking #{booking._id.slice(-6).toUpperCase()}</span>
          </div>
          <div className="booking-badges">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} />
          </div>
        </div>

        <div className="booking-meta">
          <span><Icon name="calendar" size={15} /> {dateLabel(booking.pickupDate)} → {dateLabel(booking.returnDate)}</span>
          <span><Icon name="clock" size={15} /> {booking.days} day{booking.days === 1 ? '' : 's'}</span>
          <span><Icon name="mapPin" size={15} /> {booking.pickupLocation}</span>
          <span><Icon name="building" size={15} /> {booking.provider?.name || 'Provider'}</span>
        </div>

        <div className="booking-foot">
          <div className="booking-total">
            <span>Total</span>
            <strong>{inr(booking.totalPrice)}</strong>
          </div>
          <div className="booking-actions">
            {booking.status === 'pending' && (
              <span className="booking-hint">Awaiting provider approval</span>
            )}
            {canCancel && (
              <button className="btn btn-ghost btn-sm" onClick={() => onCancel(booking)}>
                Cancel
              </button>
            )}
            {canPay && (
              <button className="btn btn-primary btn-sm" onClick={() => onPay(booking)}>
                <Icon name="creditCard" size={15} /> Pay Now
              </button>
            )}
            {car && (
              <Link to={`/cars/${car._id}`} className="btn btn-outline btn-sm">
                View car
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatCard({ icon, label, value, hint, tone = 'blue' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span className="stat-icon"><Icon name={icon} size={20} /></span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabs.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [profile, setProfile] = useState({
    name: user.name,
    phone: user.phone,
    currentPassword: '',
    newPassword: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const [bookingData, paymentData, carData] = await Promise.all([
          api('/bookings/mine'),
          api('/payments/mine'),
          api('/cars'),
        ]);
        setBookings(bookingData.bookings);
        setPayments(paymentData.payments);
        setCars(carData.cars);
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['pending', 'approved'].includes(booking.status)),
    [bookings],
  );
  const paidTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );
  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.status === 'approved' &&
            booking.pickupDate.slice(0, 10) >= todayISO(),
        )
        .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))[0],
    [bookings],
  );

  const changeTab = (nextTab) => {
    setSearchParams(nextTab === 'overview' ? {} : { tab: nextTab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await api(`/bookings/${cancelBooking._id}/cancel`, { method: 'PATCH' });
      toast('Booking cancelled', 'success');
      setCancelBooking(null);
      load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handlePaid = () => {
    toast('Payment recorded against your booking', 'success');
    load(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    try {
      const body = { name: profile.name, phone: profile.phone };
      if (profile.newPassword) {
        body.currentPassword = profile.currentPassword;
        body.newPassword = profile.newPassword;
      }
      const data = await api('/auth/me', { method: 'PUT', body });
      setUser(data.user);
      setProfile((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      toast('Profile updated successfully', 'success');
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const shellTabs = tabs.map((item) => {
    if (item.id === 'bookings' && activeBookings.length) {
      return { ...item, count: activeBookings.length };
    }
    return item;
  });

  return (
    <DashboardShell
      title={`Welcome back, ${user.name.split(' ')[0]}`}
      subtitle={`${roleLabel(user.role)} account · ${user.email}`}
      tabs={shellTabs}
      active={tab}
      onChange={changeTab}
      actions={
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <Icon name="refresh" size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      {tab === 'overview' && (
        <>
          {upcoming ? (
            <section className="trip-banner">
              <div className="trip-copy">
                <span className="eyebrow eyebrow-dark">Upcoming trip</span>
                <h2>{upcoming.car?.name || 'Your booked car'}</h2>
                <p>
                  {dateLabel(upcoming.pickupDate)} → {dateLabel(upcoming.returnDate)} ·{' '}
                  {upcoming.days} day{upcoming.days === 1 ? '' : 's'} · {upcoming.pickupLocation}
                </p>
                <div className="trip-actions">
                  {upcoming.paymentStatus === 'unpaid' ? (
                    <button className="btn btn-white btn-sm" onClick={() => setPaymentBooking(upcoming)}>
                      <Icon name="creditCard" size={15} /> Pay {inr(upcoming.totalPrice)}
                    </button>
                  ) : (
                    <span className="trip-paid"><Icon name="checkCircle" size={16} /> Payment complete</span>
                  )}
                  <button className="btn btn-glass btn-sm" onClick={() => changeTab('bookings')}>
                    All bookings
                  </button>
                </div>
              </div>
              <div className="trip-visual">
                <img src={assetUrl(upcoming.car?.image)} alt={upcoming.car?.name || 'Booked car'} />
              </div>
            </section>
          ) : (
            <section className="trip-banner trip-banner-empty">
              <div className="trip-copy">
                <span className="eyebrow eyebrow-dark">Ready for a drive?</span>
                <h2>Your next trip starts with the right car.</h2>
                <p>Browse the verified fleet and send your first booking request.</p>
                <div className="trip-actions">
                  <Link to="/cars" className="btn btn-white btn-sm">
                    Explore cars <Icon name="arrowRight" size={15} />
                  </Link>
                </div>
              </div>
              <div className="trip-visual">
                <img src={assetUrl('/uploads/cars/hyundai-creta.jpg')} alt="Hyundai Creta" />
              </div>
            </section>
          )}

          <section className="stats-grid stats-grid-4">
            <StatCard
              icon="calendar"
              label="Total bookings"
              value={bookings.length}
              hint={`${activeBookings.length} active`}
            />
            <StatCard
              icon="clock"
              label="Pending approval"
              value={bookings.filter((booking) => booking.status === 'pending').length}
              hint="Provider reviews these"
              tone="amber"
            />
            <StatCard
              icon="checkCircle"
              label="Completed trips"
              value={bookings.filter((booking) => booking.status === 'completed').length}
              hint="Finished rentals"
              tone="green"
            />
            <StatCard
              icon="wallet"
              label="Amount paid"
              value={inr(paidTotal)}
              hint={`${payments.filter((payment) => payment.status === 'paid').length} UPI payments`}
              tone="blue"
            />
          </section>

          <div className="dash-columns">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Recent bookings</h2>
                  <p>Your latest rental requests</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => changeTab('bookings')}>
                  View all <Icon name="arrowRight" size={14} />
                </button>
              </div>
              {loading ? (
                <div className="skeleton-stack">
                  <div className="skeleton line" />
                  <div className="skeleton line" />
                  <div className="skeleton line line-sm" />
                </div>
              ) : bookings.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No bookings yet"
                  message="Find a car you like and request it with your dates."
                  action={<Link to="/cars" className="btn btn-primary btn-sm">Browse cars</Link>}
                />
              ) : (
                <div className="mini-list">
                  {bookings.slice(0, 4).map((booking) => (
                    <div className="mini-row" key={booking._id}>
                      <span className="mini-thumb">
                        {booking.car?.image ? (
                          <img src={assetUrl(booking.car.image)} alt="" />
                        ) : (
                          <Icon name="car" size={18} />
                        )}
                      </span>
                      <div className="mini-row-main">
                        <strong>{booking.car?.name || 'Car'}</strong>
                        <span>
                          {dateLabel(booking.pickupDate)} → {dateLabel(booking.returnDate)}
                        </span>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Quick actions</h2>
                  <p>Everything you need, one click away</p>
                </div>
              </div>
              <div className="quick-grid">
                <button className="quick-card" onClick={() => changeTab('cars')}>
                  <span className="quick-icon"><Icon name="search" size={20} /></span>
                  <strong>Find a car</strong>
                  <span>{cars.length} approved cars ready to book</span>
                </button>
                <button className="quick-card" onClick={() => changeTab('bookings')}>
                  <span className="quick-icon"><Icon name="calendar" size={20} /></span>
                  <strong>Manage bookings</strong>
                  <span>Pay, cancel or review your requests</span>
                </button>
                <button className="quick-card" onClick={() => changeTab('payments')}>
                  <span className="quick-icon"><Icon name="creditCard" size={20} /></span>
                  <strong>Payment history</strong>
                  <span>{payments.length} records saved</span>
                </button>
                <button className="quick-card" onClick={() => changeTab('profile')}>
                  <span className="quick-icon"><Icon name="user" size={20} /></span>
                  <strong>Update profile</strong>
                  <span>Keep your contact details current</span>
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {tab === 'cars' && (
        <section className="page-block">
          <div className="panel-head">
            <div>
              <h2>Available cars</h2>
              <p>Admin-approved cars you can book right now</p>
            </div>
            <Link to="/cars" className="btn btn-outline btn-sm">
              Full search <Icon name="search" size={14} />
            </Link>
          </div>
          {loading ? (
            <SkeletonGrid count={6} />
          ) : (
            <div className="car-grid">
              {cars.map((car, index) => (
                <CarCard key={car._id} car={car} index={index} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'bookings' && (
        <section className="page-block">
          <div className="panel-head">
            <div>
              <h2>My bookings</h2>
              <p>Rental requests, approvals and payment status in one place</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton-stack">
              <div className="skeleton booking-skeleton" />
              <div className="skeleton booking-skeleton" />
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="You haven't booked a car yet"
              message="Explore the fleet, pick your dates and send a request. Payment is only needed after the provider approves."
              action={<Link to="/cars" className="btn btn-primary">Browse cars</Link>}
            />
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => (
                <BookingItem
                  key={booking._id}
                  booking={booking}
                  onPay={setPaymentBooking}
                  onCancel={setCancelBooking}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'payments' && (
        <section className="page-block">
          <div className="panel-head">
            <div>
              <h2>Payment history</h2>
              <p>Every UPI payment verified on the server is listed below</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton-stack">
              <div className="skeleton line" />
              <div className="skeleton line" />
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon="creditCard"
              title="No payments yet"
              message="Once a provider approves your booking, you can pay by UPI from the bookings tab."
              action={<button className="btn btn-primary" onClick={() => changeTab('bookings')}>Go to bookings</button>}
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Car / booking</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td data-label="Date">{dateLabel(payment.createdAt)}</td>
                      <td data-label="Car / booking">
                        <strong>{payment.booking?.car?.name || 'Car rental'}</strong>
                        <span className="cell-sub">
                          #{payment.booking?._id?.slice(-6).toUpperCase() || payment._id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td data-label="Amount">
                        <strong>{inr(payment.amount)}</strong>
                        {payment.platformFee !== undefined && (
                          <span className="cell-sub">
                            Platform {inr(payment.platformFee)} · Provider {inr(payment.providerAmount)}
                          </span>
                        )}
                      </td>
                      <td data-label="Mode">{payment.mode === 'razorpay' ? 'Razorpay UPI' : 'Demo UPI'}</td>
                      <td data-label="Reference" className="cell-mono">
                        {payment.transactionRef || payment.upiId || '—'}
                      </td>
                      <td data-label="Status"><StatusBadge status={payment.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'profile' && (
        <section className="page-block">
          <div className="panel-head">
            <div>
              <h2>Profile</h2>
              <p>Your account details and security settings</p>
            </div>
          </div>
          <div className="profile-grid">
            <div className="profile-card">
              <span className="avatar avatar-xl">{user.name.slice(0, 1)}</span>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className="badge badge-approved">{roleLabel(user.role)} account</span>
              <div className="profile-facts">
                <div>
                  <span>Phone</span>
                  <strong>{user.phone}</strong>
                </div>
                <div>
                  <span>Member since</span>
                  <strong>{dateLabel(user.createdAt)}</strong>
                </div>
                <div>
                  <span>Account status</span>
                  <strong>Active</strong>
                </div>
              </div>
              <Link to={dashboardPath(user.role)} className="btn btn-ghost btn-block">
                <Icon name="dashboard" size={16} /> Dashboard home
              </Link>
            </div>

            <form className="form-card" onSubmit={saveProfile}>
              <h3>Edit details</h3>
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Full name</span>
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Mobile number</span>
                  <input
                    value={profile.phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                    required
                  />
                </label>
                <label className="field field-full">
                  <span className="field-label">Email (read-only)</span>
                  <input value={user.email} disabled />
                </label>
              </div>

              <h4 className="form-section-title">Change password</h4>
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Current password</span>
                  <input
                    type="password"
                    value={profile.currentPassword}
                    onChange={(event) =>
                      setProfile({ ...profile, currentPassword: event.target.value })
                    }
                    placeholder="Only needed to change password"
                    autoComplete="current-password"
                  />
                </label>
                <label className="field">
                  <span className="field-label">New password</span>
                  <input
                    type="password"
                    value={profile.newPassword}
                    onChange={(event) =>
                      setProfile({ ...profile, newPassword: event.target.value })
                    }
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </label>
              </div>

              {profileError && (
                <p className="form-error">
                  <Icon name="xCircle" size={15} /> {profileError}
                </p>
              )}

              <button className="btn btn-primary" disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </section>
      )}

      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onPaid={handlePaid}
        />
      )}

      {cancelBooking && (
        <Modal
          title="Cancel this booking?"
          subtitle={`Booking #${cancelBooking._id.slice(-6).toUpperCase()} · ${cancelBooking.car?.name || 'Car'}`}
          onClose={() => setCancelBooking(null)}
        >
          <div className="confirm-box">
            <span className="confirm-icon"><Icon name="xCircle" size={24} /></span>
            <p>
              This request for {dateLabel(cancelBooking.pickupDate)} →{' '}
              {dateLabel(cancelBooking.returnDate)} will be cancelled. You can always book the
              same car again for new dates.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setCancelBooking(null)}>
              Keep booking
            </button>
            <button className="btn btn-danger" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Yes, cancel booking'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
