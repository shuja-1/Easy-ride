import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import DashboardShell from '../components/DashboardShell.jsx';
import EmptyState from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dateLabel, inr, roleLabel } from '../utils.js';

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'listings', label: 'Car listings', icon: 'car' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar' },
  { id: 'payments', label: 'Payments', icon: 'creditCard' },
];

const compactMoney = (value) => {
  if (!value) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₹${value}`;
};

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabs.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';

  const [stats, setStats] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [roleFilter, setRoleFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('pending');
  const [bookingFilter, setBookingFilter] = useState('all');

  const [userAction, setUserAction] = useState(null);
  const [userBusy, setUserBusy] = useState(false);
  const [rejectCar, setRejectCar] = useState(null);
  const [reason, setReason] = useState('');
  const [deleteCar, setDeleteCar] = useState(null);
  const [carBusy, setCarBusy] = useState('');
  const [updatingBooking, setUpdatingBooking] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const [statsData, userData, carData, bookingData, paymentData] = await Promise.all([
          api('/admin/stats'),
          api('/admin/users'),
          api('/admin/cars'),
          api('/admin/bookings'),
          api('/admin/payments'),
        ]);
        setStats(statsData.stats);
        setRevenueByMonth(statsData.revenueByMonth);
        setUsers(userData.users);
        setCars(carData.cars);
        setBookings(bookingData.bookings);
        setPayments(paymentData.payments);
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

  const changeTab = (nextTab) => {
    setSearchParams(nextTab === 'overview' ? {} : { tab: nextTab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredUsers = useMemo(
    () => (roleFilter === 'all' ? users : users.filter((item) => item.role === roleFilter)),
    [users, roleFilter],
  );

  const listingCounts = useMemo(
    () => ({
      all: cars.length,
      pending: cars.filter((car) => car.status === 'pending').length,
      approved: cars.filter((car) => car.status === 'approved').length,
      rejected: cars.filter((car) => car.status === 'rejected').length,
    }),
    [cars],
  );

  const filteredCars = useMemo(
    () => (listingFilter === 'all' ? cars : cars.filter((car) => car.status === listingFilter)),
    [cars, listingFilter],
  );

  const filteredBookings = useMemo(
    () =>
      bookingFilter === 'all'
        ? bookings
        : bookings.filter((booking) => booking.status === bookingFilter),
    [bookings, bookingFilter],
  );

  const pendingCars = useMemo(() => cars.filter((car) => car.status === 'pending'), [cars]);
  const pendingRequests = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings],
  );
  const paidPayments = payments.filter((payment) => payment.status === 'paid');
  const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const feePercent = stats?.platformFeePercent ?? 5;
  const feeOf = (payment) => payment.platformFee ?? Math.round(payment.amount * feePercent) / 100;
  const providerOf = (payment) =>
    payment.providerAmount ?? Math.round(payment.amount * (100 - feePercent)) / 100;
  const round2 = (value) => Math.round(value * 100) / 100;
  const platformEarnings = round2(paidPayments.reduce((sum, payment) => sum + feeOf(payment), 0));
  const providerPayouts = round2(paidPayments.reduce((sum, payment) => sum + providerOf(payment), 0));
  const maxRevenue = Math.max(...revenueByMonth.map((month) => month.revenue), 1);

  const runUserAction = async () => {
    const { type, account } = userAction;
    setUserBusy(true);
    try {
      if (type === 'delete') {
        await api(`/admin/users/${account.id}`, { method: 'DELETE' });
        toast('Account and related records deleted', 'success');
      } else {
        const data = await api(`/admin/users/${account.id}/block`, {
          method: 'PATCH',
          body: { isBlocked: !account.isBlocked },
        });
        toast(data.message, 'success');
      }
      setUserAction(null);
      await load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setUserBusy(false);
    }
  };

  const setCarStatus = async (car, status, rejectionReason = '') => {
    setCarBusy(car._id);
    try {
      const data = await api(`/admin/cars/${car._id}/status`, {
        method: 'PATCH',
        body: { status, rejectionReason },
      });
      toast(data.message || `Listing ${status}`, 'success');
      setRejectCar(null);
      setReason('');
      await load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setCarBusy('');
    }
  };

  const runDeleteCar = async () => {
    setCarBusy(deleteCar._id);
    try {
      const data = await api(`/cars/${deleteCar._id}`, { method: 'DELETE' });
      toast(data.message || 'Listing deleted', 'success');
      setDeleteCar(null);
      await load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setCarBusy('');
    }
  };

  const setBookingStatus = async (booking, status) => {
    setUpdatingBooking(booking._id);
    try {
      const data = await api(`/admin/bookings/${booking._id}`, {
        method: 'PATCH',
        body: { status },
      });
      toast(data.message || 'Booking updated', 'success');
      await load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setUpdatingBooking('');
    }
  };

  const shellTabs = tabs.map((item) => {
    if (item.id === 'listings' && listingCounts.pending) {
      return { ...item, count: listingCounts.pending };
    }
    return item;
  });

  return (
    <DashboardShell
      title={`${user.name.split(' ')[0]}'s admin console`}
      subtitle={`Signed in as ${user.name} · full platform control`}
      tabs={shellTabs}
      active={tab}
      onChange={changeTab}
      actions={
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
          <Icon name="refresh" size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      {loading || !stats ? (
        <div className="skeleton-stack">
          <div className="skeleton stats-skeleton" />
          <div className="skeleton chart-skeleton" />
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              <section className="admin-hero">
                <div>
                  <span className="eyebrow eyebrow-dark">Platform health</span>
                  <h2>Everything is in one place.</h2>
                  <p>
                    Monitor revenue, users, listings and bookings. Approve car listings and keep
                    the marketplace trustworthy.
                  </p>
                </div>
                <div className="admin-hero-metrics">
                  <div>
                    <span>Total collected</span>
                    <strong>{inr(totalRevenue)}</strong>
                  </div>
                  <div>
                    <span>Platform fee ({feePercent}%)</span>
                    <strong>{inr(platformEarnings)}</strong>
                  </div>
                  <div>
                    <span>Provider payouts</span>
                    <strong>{inr(providerPayouts)}</strong>
                  </div>
                </div>
              </section>

              {(pendingCars.length > 0 || pendingRequests.length > 0) && (
                <div className="admin-attention">
                  {pendingCars.length > 0 && (
                    <button className="attention-item" onClick={() => changeTab('listings')}>
                      <span className="attention-icon amber"><Icon name="image" size={18} /></span>
                      <span>
                        <strong>{pendingCars.length} listing pending approval</strong>
                        <small>Review photos and details before going live</small>
                      </span>
                      <Icon name="arrowRight" size={16} />
                    </button>
                  )}
                  {pendingRequests.length > 0 && (
                    <button className="attention-item" onClick={() => changeTab('bookings')}>
                      <span className="attention-icon blue"><Icon name="calendar" size={18} /></span>
                      <span>
                        <strong>{pendingRequests.length} booking awaiting provider action</strong>
                        <small>Monitor or update status if needed</small>
                      </span>
                      <Icon name="arrowRight" size={16} />
                    </button>
                  )}
                </div>
              )}

              <section className="stats-grid stats-grid-3">
                <StatCard
                  icon="users"
                  label="Customers"
                  value={stats.customers}
                  hint="Registered renters"
                />
                <StatCard
                  icon="building"
                  label="Car providers"
                  value={stats.providers}
                  hint="Fleet owners"
                  tone="navy"
                />
                <StatCard
                  icon="car"
                  label="Available cars"
                  value={stats.approvedCars}
                  hint={`${stats.totalCars} total listings`}
                  tone="green"
                />
                <StatCard
                  icon="calendar"
                  label="Total bookings"
                  value={stats.totalBookings}
                  hint={`${stats.activeBookings} active`}
                  tone="amber"
                />
                <StatCard
                  icon="wallet"
                  label="Collected"
                  value={inr(totalRevenue)}
                  hint={`Platform fee ${inr(platformEarnings)}`}
                  tone="blue"
                />
                <StatCard
                  icon="building"
                  label="Provider payouts"
                  value={inr(providerPayouts)}
                  hint={`${round2(100 - feePercent)}% of collected`}
                  tone="navy"
                />
              </section>

              <div className="dash-columns dash-columns-wide">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Revenue trend</h2>
                      <p>Gross customer payments over the last 6 months</p>
                    </div>
                    <span className="panel-pill">{compactMoney(totalRevenue)} gross</span>
                  </div>
                  <div className="revenue-chart">
                    {revenueByMonth.map((month) => (
                      <div className="rev-col" key={month.month}>
                        <span className="rev-value">{month.revenue ? compactMoney(month.revenue) : ''}</span>
                        <div className="rev-bar-wrap">
                          <div
                            className={`rev-bar ${month.revenue ? '' : 'empty'}`}
                            style={{
                              height: `${month.revenue ? Math.max((month.revenue / maxRevenue) * 100, 6) : 2}%`,
                            }}
                            title={`${month.month}: ${inr(month.revenue)} · ${month.payments} payments`}
                          />
                        </div>
                        <span className="rev-label">{month.month}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Pending listings</h2>
                      <p>Approve to publish in the public fleet</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => changeTab('listings')}>
                      All listings <Icon name="arrowRight" size={14} />
                    </button>
                  </div>
                  {pendingCars.length === 0 ? (
                    <EmptyState
                      icon="checkCircle"
                      title="All caught up"
                      message="No car listings are waiting for approval."
                    />
                  ) : (
                    <div className="mini-list">
                      {pendingCars.slice(0, 4).map((car) => (
                        <div className="mini-row mini-row-action" key={car._id}>
                          <span className="mini-thumb">
                            <img src={assetUrl(car.image)} alt="" />
                          </span>
                          <div className="mini-row-main">
                            <strong>{car.name}</strong>
                            <span>
                              {car.provider?.name} · {inr(car.pricePerDay)}/day · {car.location}
                            </span>
                          </div>
                          <div className="mini-actions">
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => setCarStatus(car, 'approved')}
                              disabled={carBusy === car._id}
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Recent bookings</h2>
                    <p>The latest activity across the platform</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => changeTab('bookings')}>
                    View all <Icon name="arrowRight" size={14} />
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Car</th>
                        <th>Dates</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 5).map((booking) => (
                        <tr key={booking._id}>
                          <td data-label="Customer">
                            <strong>{booking.customer?.name}</strong>
                            <span className="cell-sub">{booking.customer?.email}</span>
                          </td>
                          <td data-label="Car">{booking.car?.name || 'Car'}</td>
                          <td data-label="Dates">
                            {dateLabel(booking.pickupDate)} → {dateLabel(booking.returnDate)}
                          </td>
                          <td data-label="Amount"><strong>{inr(booking.totalPrice)}</strong></td>
                          <td data-label="Status"><StatusBadge status={booking.status} /></td>
                          <td data-label="Payment"><StatusBadge status={booking.paymentStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {tab === 'users' && (
            <section className="page-block">
              <div className="panel-head">
                <div>
                  <h2>Users</h2>
                  <p>Manage customer and provider accounts registered on EasyRide</p>
                </div>
                <div className="filter-chips">
                  {['all', 'customer', 'provider'].map((role) => (
                    <button
                      key={role}
                      className={`chip ${roleFilter === role ? 'active' : ''}`}
                      onClick={() => setRoleFilter(role)}
                    >
                      {role === 'all' ? `All (${users.length})` : `${roleLabel(role)}s`}
                    </button>
                  ))}
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon="users"
                  title="No accounts to show"
                  message="No users match this filter right now."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Contact</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th className="th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((account) => (
                        <tr key={account.id}>
                          <td data-label="Account">
                            <strong>{account.name}</strong>
                            <span className="cell-sub">#{account.id.slice(-6).toUpperCase()}</span>
                          </td>
                          <td data-label="Contact">
                            {account.email}
                            <span className="cell-sub">{account.phone}</span>
                          </td>
                          <td data-label="Role"><span className={`role-tag ${account.role}`}>{roleLabel(account.role)}</span></td>
                          <td data-label="Joined">{dateLabel(account.createdAt)}</td>
                          <td data-label="Status">
                            <StatusBadge status={account.isBlocked ? 'blocked' : 'active'} />
                          </td>
                          <td data-label="Actions">
                            <div className="table-actions">
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() =>
                                  setUserAction({
                                    type: account.isBlocked ? 'unblock' : 'block',
                                    account,
                                  })
                                }
                              >
                                <Icon name="ban" size={13} /> {account.isBlocked ? 'Unblock' : 'Block'}
                              </button>
                              <button
                                className="btn btn-danger-ghost btn-xs"
                                onClick={() => setUserAction({ type: 'delete', account })}
                              >
                                <Icon name="trash" size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'listings' && (
            <section className="page-block">
              <div className="panel-head">
                <div>
                  <h2>Car listings</h2>
                  <p>Approve, reject or remove cars submitted by providers</p>
                </div>
                <div className="filter-chips">
                  {['pending', 'approved', 'rejected', 'all'].map((status) => (
                    <button
                      key={status}
                      className={`chip ${listingFilter === status ? 'active' : ''}`}
                      onClick={() => setListingFilter(status)}
                    >
                      {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)} (
                      {listingCounts[status]})
                    </button>
                  ))}
                </div>
              </div>

              {filteredCars.length === 0 ? (
                <EmptyState
                  icon="car"
                  title="No listings here"
                  message="No cars match this status. Check another filter."
                />
              ) : (
                <div className="admin-listing-list">
                  {filteredCars.map((car) => (
                    <article className="admin-listing" key={car._id}>
                      <div className="admin-listing-media">
                        <img src={assetUrl(car.image)} alt={car.name} loading="lazy" />
                      </div>
                      <div className="admin-listing-body">
                        <div className="admin-listing-top">
                          <div>
                            <h3>{car.name}</h3>
                            <span>{car.model} · {car.regNumber}</span>
                          </div>
                          <div className="booking-badges">
                            <StatusBadge status={car.status} />
                            <span className={`badge ${car.isAvailable ? 'badge-paid' : 'badge-unpaid'}`}>
                              {car.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </div>
                        <div className="admin-listing-meta">
                          <span><Icon name="building" size={14} /> {car.provider?.name}</span>
                          <span><Icon name="mapPin" size={14} /> {car.location}</span>
                          <span><Icon name="car" size={14} /> {car.type} · {car.fuelType}</span>
                          <span><Icon name="wallet" size={14} /> {inr(car.pricePerDay)}/day</span>
                        </div>
                        {car.status === 'rejected' && car.rejectionReason && (
                          <p className="rejection-note">
                            <Icon name="xCircle" size={14} /> {car.rejectionReason}
                          </p>
                        )}
                        <div className="admin-listing-actions">
                          {car.status !== 'approved' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setCarStatus(car, 'approved')}
                              disabled={carBusy === car._id}
                            >
                              <Icon name="check" size={14} /> Approve
                            </button>
                          )}
                          {car.status !== 'rejected' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setRejectCar(car);
                                setReason('');
                              }}
                              disabled={carBusy === car._id}
                            >
                              <Icon name="xCircle" size={14} /> Reject
                            </button>
                          )}
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            onClick={() => setDeleteCar(car)}
                            disabled={carBusy === car._id}
                          >
                            <Icon name="trash" size={14} /> Delete
                          </button>
                          {car.status === 'approved' && (
                            <a
                              href={`/cars/${car._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              <Icon name="eye" size={14} /> View
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'bookings' && (
            <section className="page-block">
              <div className="panel-head">
                <div>
                  <h2>All bookings</h2>
                  <p>Monitor the full booking lifecycle and update status when needed</p>
                </div>
                <div className="filter-chips">
                  {['all', 'pending', 'approved', 'completed', 'cancelled', 'rejected'].map((status) => (
                    <button
                      key={status}
                      className={`chip ${bookingFilter === status ? 'active' : ''}`}
                      onClick={() => setBookingFilter(status)}
                    >
                      {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No bookings in this view"
                  message="Try another status filter."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Car / provider</th>
                        <th>Dates</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td data-label="Customer">
                            <strong>{booking.customer?.name}</strong>
                            <span className="cell-sub">{booking.customer?.phone}</span>
                          </td>
                          <td data-label="Car / provider">
                            <strong>{booking.car?.name || 'Car'}</strong>
                            <span className="cell-sub">by {booking.provider?.name}</span>
                          </td>
                          <td data-label="Dates">
                            {dateLabel(booking.pickupDate)} → {dateLabel(booking.returnDate)}
                            <span className="cell-sub">{booking.days} days · {inr(booking.totalPrice)}</span>
                          </td>
                          <td data-label="Amount"><strong>{inr(booking.totalPrice)}</strong></td>
                          <td data-label="Payment"><StatusBadge status={booking.paymentStatus} /></td>
                          <td data-label="Status">
                            <select
                              className="table-select"
                              value={booking.status}
                              disabled={updatingBooking === booking._id}
                              onChange={(event) => setBookingStatus(booking, event.target.value)}
                            >
                              {['pending', 'approved', 'rejected', 'completed', 'cancelled'].map(
                                (status) => (
                                  <option key={status} value={status}>
                                    {status[0].toUpperCase() + status.slice(1)}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'payments' && (
            <section className="page-block">
              <div className="panel-head">
                <div>
                  <h2>Payment records</h2>
                  <p>Every payment attempt, including verified, pending and failed UPI payments</p>
                </div>
                <span className="panel-pill">
                  {inr(platformEarnings)} platform fee · {feePercent}% of each payment
                </span>
              </div>

              <section className="stats-grid stats-grid-4 payment-stats">
                <StatCard icon="wallet" label="Verified revenue" value={inr(totalRevenue)} tone="green" />
                <StatCard
                  icon="sparkle"
                  label={`Platform fee (${feePercent}%)`}
                  value={inr(platformEarnings)}
                  hint="Retained by EasyRide"
                  tone="blue"
                />
                <StatCard
                  icon="building"
                  label="Provider payouts"
                  value={inr(providerPayouts)}
                  hint="Net share owed to providers"
                  tone="navy"
                />
                <StatCard
                  icon="checkCircle"
                  label="Paid records"
                  value={paidPayments.length}
                />
                <StatCard
                  icon="clock"
                  label="Pending"
                  value={payments.filter((payment) => payment.status === 'pending').length}
                  tone="amber"
                />
                <StatCard
                  icon="xCircle"
                  label="Failed"
                  value={payments.filter((payment) => payment.status === 'failed').length}
                  tone="rose"
                />
              </section>

              {payments.length === 0 ? (
                <EmptyState
                  icon="creditCard"
                  title="No payment records yet"
                  message="Payments initiated by customers will appear here with their verification status."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Booking / car</th>
                        <th>Amount</th>
                        <th>Platform fee</th>
                        <th>Provider payout</th>
                        <th>Mode</th>
                        <th>Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td data-label="Date">{dateLabel(payment.createdAt)}</td>
                          <td data-label="Customer">
                            <strong>{payment.customer?.name}</strong>
                            <span className="cell-sub">{payment.customer?.email}</span>
                          </td>
                          <td data-label="Booking / car">
                            {payment.booking?.car?.name || 'Car rental'}
                            <span className="cell-sub">
                              #{payment.booking?._id?.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td data-label="Amount"><strong>{inr(payment.amount)}</strong></td>
                          <td data-label="Platform fee">
                            {payment.status === 'paid' ? inr(feeOf(payment)) : '—'}
                          </td>
                          <td data-label="Provider payout">
                            {payment.status === 'paid' ? inr(providerOf(payment)) : '—'}
                          </td>
                          <td data-label="Mode">{payment.mode === 'razorpay' ? 'Razorpay' : 'Demo UPI'}</td>
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
        </>
      )}

      {userAction && (
        <Modal
          title={
            userAction.type === 'delete'
              ? 'Delete this account?'
              : userAction.type === 'block'
                ? 'Block this account?'
                : 'Unblock this account?'
          }
          subtitle={`${userAction.account.name} · ${userAction.account.email}`}
          onClose={() => setUserAction(null)}
        >
          <div className="confirm-box">
            <span className={`confirm-icon ${userAction.type === 'delete' ? 'danger' : ''}`}>
              <Icon name={userAction.type === 'delete' ? 'trash' : 'ban'} size={22} />
            </span>
            <p>
              {userAction.type === 'delete'
                ? 'This permanently deletes the account plus its cars, bookings and payment records. Accounts with active bookings cannot be deleted.'
                : userAction.type === 'block'
                  ? 'A blocked account cannot log in or make new requests. Existing records are kept.'
                  : 'The account will be able to log in and use EasyRide again.'}
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setUserAction(null)} disabled={userBusy}>
              Cancel
            </button>
            <button
              className={`btn ${userAction.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
              onClick={runUserAction}
              disabled={userBusy}
            >
              {userBusy
                ? 'Working…'
                : userAction.type === 'delete'
                  ? 'Delete account'
                  : userAction.type === 'block'
                    ? 'Block account'
                    : 'Unblock account'}
            </button>
          </div>
        </Modal>
      )}

      {rejectCar && (
        <Modal
          title="Reject this listing?"
          subtitle={`${rejectCar.name} · ${rejectCar.provider?.name}`}
          onClose={() => setRejectCar(null)}
        >
          <p className="modal-lead">
            The provider will see this reason on their dashboard. You can approve the car later.
          </p>
          <label className="field">
            <span className="field-label">Reason for rejection</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Photos are unclear or the registration number is missing"
              maxLength={200}
            />
          </label>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setRejectCar(null)} disabled={Boolean(carBusy)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setCarStatus(rejectCar, 'rejected', reason)}
              disabled={Boolean(carBusy)}
            >
              {carBusy ? 'Rejecting…' : 'Reject listing'}
            </button>
          </div>
        </Modal>
      )}

      {deleteCar && (
        <Modal
          title="Delete this listing?"
          subtitle={`${deleteCar.name} · ${deleteCar.regNumber}`}
          onClose={() => setDeleteCar(null)}
        >
          <div className="confirm-box">
            <span className="confirm-icon danger"><Icon name="trash" size={22} /></span>
            <p>
              The car and its image will be removed permanently. Listings with active bookings
              cannot be deleted.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteCar(null)} disabled={Boolean(carBusy)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={runDeleteCar} disabled={Boolean(carBusy)}>
              {carBusy ? 'Deleting…' : 'Delete listing'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
