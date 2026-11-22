import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import CarFormModal from '../components/CarFormModal.jsx';
import DashboardShell from '../components/DashboardShell.jsx';
import EmptyState from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dateLabel, inr } from '../utils.js';

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'fleet', label: 'My cars', icon: 'car' },
  { id: 'requests', label: 'Booking requests', icon: 'calendar' },
];

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

function RequestItem({ booking, acting, onDecide }) {
  const pending = booking.status === 'pending';
  const feePercent = booking.platformFeePercent ?? 5;
  const providerAmount =
    booking.providerAmount ?? Math.round(booking.totalPrice * (100 - feePercent)) / 100;
  return (
    <article className="request-item">
      <div className="request-head">
        <div className="request-car">
          <span className="mini-thumb">
            {booking.car?.image ? (
              <img src={assetUrl(booking.car.image)} alt="" />
            ) : (
              <Icon name="car" size={18} />
            )}
          </span>
          <div>
            <strong>{booking.car?.name || 'Car'}</strong>
            <span>
              {booking.car?.regNumber} · {booking.car?.location}
            </span>
          </div>
        </div>
        <div className="booking-badges">
          <StatusBadge status={booking.status} />
          <StatusBadge status={booking.paymentStatus} />
        </div>
      </div>

      <div className="request-details">
        <div>
          <span className="detail-label">Customer</span>
          <strong>{booking.customer?.name}</strong>
          <span className="detail-sub">{booking.customer?.phone}</span>
        </div>
        <div>
          <span className="detail-label">Dates</span>
          <strong>{dateLabel(booking.pickupDate)} → {dateLabel(booking.returnDate)}</strong>
          <span className="detail-sub">{booking.days} day{booking.days === 1 ? '' : 's'}</span>
        </div>
        <div>
          <span className="detail-label">Payout</span>
          <strong>{inr(providerAmount)}</strong>
          <span className="detail-sub">After {feePercent}% platform fee</span>
        </div>
        <div>
          <span className="detail-label">Requested</span>
          <strong>{dateLabel(booking.createdAt)}</strong>
          <span className="detail-sub">Booking #{booking._id.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      {pending && (
        <div className="request-actions">
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDecide(booking, 'rejected')}
            disabled={acting === booking._id}
          >
            <Icon name="xCircle" size={15} /> Reject
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onDecide(booking, 'approved')}
            disabled={acting === booking._id}
          >
            <Icon name="check" size={15} /> {acting === booking._id ? 'Updating…' : 'Approve request'}
          </button>
        </div>
      )}
      {booking.status === 'approved' && booking.paymentStatus === 'unpaid' && (
        <p className="request-note">
          <Icon name="clock" size={14} /> Approved — waiting for the customer to pay by UPI.
        </p>
      )}
      {booking.paymentStatus === 'paid' && (
        <p className="request-note paid">
          <Icon name="checkCircle" size={14} /> Payment verified — your payout is {inr(providerAmount)}.
        </p>
      )}
    </article>
  );
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabs.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';

  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [deletingCar, setDeletingCar] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [acting, setActing] = useState('');
  const [togglingId, setTogglingId] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [carData, bookingData] = await Promise.all([
          api('/cars/provider/mine'),
          api('/bookings/provider/all'),
        ]);
        setCars(carData.cars);
        setBookings(bookingData.bookings);
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const pendingRequests = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings],
  );
  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['pending', 'approved'].includes(booking.status)),
    [bookings],
  );
  const earnings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.paymentStatus === 'paid' && booking.status !== 'cancelled')
        .reduce((sum, booking) => sum + (booking.providerAmount ?? 0), 0),
    [bookings],
  );
  const feePercent = bookings.find((booking) => booking.platformFeePercent !== undefined)?.platformFeePercent ?? 5;
  const pendingCars = cars.filter((car) => car.status === 'pending');
  const approvedCars = cars.filter((car) => car.status === 'approved');

  const changeTab = (nextTab) => {
    setSearchParams(nextTab === 'overview' ? {} : { tab: nextTab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const decide = async (booking, status) => {
    setActing(booking._id);
    try {
      const data = await api(`/bookings/provider/${booking._id}`, {
        method: 'PATCH',
        body: { status },
      });
      toast(data.message || `Booking ${status}`);
      await load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setActing('');
    }
  };

  const openAddCar = () => {
    setEditingCar(null);
    setShowForm(true);
  };

  const openEditCar = (car) => {
    setEditingCar(car);
    setShowForm(true);
  };

  const toggleAvailability = async (car) => {
    setTogglingId(car._id);
    try {
      const data = new FormData();
      ['name', 'model', 'regNumber', 'type', 'pricePerDay', 'fuelType', 'seats', 'location', 'description'].forEach(
        (field) => data.append(field, car[field]),
      );
      data.append('isAvailable', String(!car.isAvailable));
      const result = await api(`/cars/${car._id}`, { method: 'PUT', body: data });
      setCars((current) => current.map((item) => (item._id === car._id ? result.car : item)));
      toast(`Listing marked ${result.car.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setTogglingId('');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const data = await api(`/cars/${deletingCar._id}`, { method: 'DELETE' });
      toast(data.message || 'Car deleted', 'success');
      setDeletingCar(null);
      await load(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const shellTabs = tabs.map((item) => {
    if (item.id === 'requests' && pendingRequests.length) {
      return { ...item, count: pendingRequests.length };
    }
    return item;
  });

  return (
    <DashboardShell
      title={`${user.name.split(' ')[0]}’s fleet`}
      subtitle="Manage your cars, availability and incoming booking requests"
      tabs={shellTabs}
      active={tab}
      onChange={changeTab}
      actions={
        <button className="btn btn-primary btn-sm" onClick={openAddCar}>
          <Icon name="plus" size={16} /> Add car
        </button>
      }
    >
      {loading ? (
        <div className="skeleton-stack">
          <div className="skeleton stats-skeleton" />
          <div className="skeleton booking-skeleton" />
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              <section className="provider-hero">
                <div>
                  <span className="eyebrow eyebrow-dark">Provider console</span>
                  <h2>Grow your rental business, one trip at a time.</h2>
                  <p>
                    Add your cars, keep availability accurate and approve booking requests.
                    Customers can only pay after you approve.
                  </p>
                  <div className="trip-actions">
                    <button className="btn btn-white btn-sm" onClick={openAddCar}>
                      <Icon name="plus" size={15} /> List a new car
                    </button>
                    <button className="btn btn-glass btn-sm" onClick={() => changeTab('requests')}>
                      View requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                    </button>
                  </div>
                </div>
                <div className="provider-hero-stats">
                  <div>
                    <span>Fleet size</span>
                    <strong>{cars.length}</strong>
                  </div>
                  <div>
                    <span>Live listings</span>
                    <strong>{approvedCars.filter((car) => car.isAvailable).length}</strong>
                  </div>
                  <div>
                    <span>Pending approvals</span>
                    <strong>{pendingRequests.length + pendingCars.length}</strong>
                  </div>
                </div>
              </section>

              {pendingCars.length > 0 && (
                <div className="alert alert-info">
                  <Icon name="clock" size={17} />
                  <span>
                    {pendingCars.length} listing{pendingCars.length === 1 ? ' is' : 's are'} awaiting
                    admin approval. It will appear in the public fleet once approved.
                  </span>
                </div>
              )}

              <section className="stats-grid stats-grid-4">
                <StatCard
                  icon="car"
                  label="Total cars"
                  value={cars.length}
                  hint={`${approvedCars.length} approved`}
                />
                <StatCard
                  icon="calendar"
                  label="Booking requests"
                  value={bookings.length}
                  hint={`${activeBookings.length} active`}
                />
                <StatCard
                  icon="clock"
                  label="Awaiting your action"
                  value={pendingRequests.length}
                  hint="Approve or reject"
                  tone="amber"
                />
                <StatCard
                  icon="wallet"
                  label="Net earnings"
                  value={inr(earnings)}
                  hint={`After ${feePercent}% platform fee`}
                  tone="green"
                />
              </section>

              <div className="dash-columns">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Pending requests</h2>
                      <p>Customers waiting for your decision</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => changeTab('requests')}>
                      View all <Icon name="arrowRight" size={14} />
                    </button>
                  </div>
                  {pendingRequests.length === 0 ? (
                    <EmptyState
                      icon="checkCircle"
                      title="No pending requests"
                      message="New booking requests will appear here for you to approve or reject."
                    />
                  ) : (
                    <div className="mini-list">
                      {pendingRequests.slice(0, 4).map((booking) => (
                        <div className="mini-row mini-row-action" key={booking._id}>
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
                              {booking.customer?.name} · {dateLabel(booking.pickupDate)} →{' '}
                              {dateLabel(booking.returnDate)}
                            </span>
                          </div>
                          <div className="mini-actions">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => decide(booking, 'rejected')}
                              disabled={acting === booking._id}
                            >
                              Reject
                            </button>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => decide(booking, 'approved')}
                              disabled={acting === booking._id}
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Your fleet</h2>
                      <p>A snapshot of your listings</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => changeTab('fleet')}>
                      Manage <Icon name="arrowRight" size={14} />
                    </button>
                  </div>
                  {cars.length === 0 ? (
                    <EmptyState
                      icon="car"
                      title="No cars listed yet"
                      message="Add your first car to start receiving bookings."
                      action={
                        <button className="btn btn-primary btn-sm" onClick={openAddCar}>
                          Add a car
                        </button>
                      }
                    />
                  ) : (
                    <div className="mini-list">
                      {cars.slice(0, 4).map((car) => (
                        <div className="mini-row" key={car._id}>
                          <span className="mini-thumb">
                            {car.image ? <img src={assetUrl(car.image)} alt="" /> : <Icon name="car" size={18} />}
                          </span>
                          <div className="mini-row-main">
                            <strong>{car.name}</strong>
                            <span>{car.location} · {inr(car.pricePerDay)}/day</span>
                          </div>
                          <StatusBadge status={car.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {tab === 'fleet' && (
            <section className="page-block">
              <div className="panel-head">
                <div>
                  <h2>My cars</h2>
                  <p>Edit details, change availability or remove a listing</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={openAddCar}>
                  <Icon name="plus" size={15} /> Add car
                </button>
              </div>

              {cars.length === 0 ? (
                <EmptyState
                  icon="car"
                  title="Start your fleet"
                  message="Upload a car with a clear photo, pricing and pickup city. An admin will review it before it goes live."
                  action={
                    <button className="btn btn-primary" onClick={openAddCar}>
                      Add your first car
                    </button>
                  }
                />
              ) : (
                <div className="manage-grid">
                  {cars.map((car) => (
                    <article className="manage-card" key={car._id}>
                      <div className="manage-media">
                        <img src={assetUrl(car.image)} alt={car.name} loading="lazy" />
                        <div className="manage-media-badges">
                          <StatusBadge status={car.status} />
                          <span className={`badge ${car.isAvailable ? 'badge-paid' : 'badge-unpaid'}`}>
                            {car.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                      <div className="manage-body">
                        <div className="manage-title">
                          <div>
                            <h3>{car.name}</h3>
                            <span>{car.model} · {car.regNumber}</span>
                          </div>
                          <strong className="manage-price">{inr(car.pricePerDay)}<small>/day</small></strong>
                        </div>

                        <div className="manage-specs">
                          <span><Icon name="car" size={14} /> {car.type}</span>
                          <span><Icon name="fuel" size={14} /> {car.fuelType}</span>
                          <span><Icon name="users" size={14} /> {car.seats}</span>
                          <span><Icon name="mapPin" size={14} /> {car.location}</span>
                        </div>

                        {car.status === 'rejected' && car.rejectionReason && (
                          <p className="rejection-note">
                            <Icon name="xCircle" size={14} /> {car.rejectionReason}
                          </p>
                        )}
                        {car.status === 'pending' && (
                          <p className="rejection-note pending">
                            <Icon name="clock" size={14} /> Waiting for admin approval
                          </p>
                        )}

                        <div className="manage-foot">
                          <button
                            className="switch"
                            role="switch"
                            aria-checked={car.isAvailable}
                            onClick={() => toggleAvailability(car)}
                            disabled={togglingId === car._id || car.status !== 'approved'}
                            title={
                              car.status !== 'approved'
                                ? 'Availability can be changed after approval'
                                : 'Toggle availability'
                            }
                          >
                            <span className="switch-track"><span className="switch-knob" /></span>
                            {car.isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                          <div className="manage-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => openEditCar(car)}>
                              <Icon name="edit" size={14} /> Edit
                            </button>
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => setDeletingCar(car)}>
                              <Icon name="trash" size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'requests' && (
            <section className="page-block">
              <div className="panel-head">
                <div>
                  <h2>Booking requests</h2>
                  <p>Approve requests to let customers pay, or reject dates you can’t fulfill</p>
                </div>
                {pendingRequests.length > 0 && (
                  <span className="panel-pill">{pendingRequests.length} pending</span>
                )}
              </div>

              {bookings.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No booking requests yet"
                  message="Once a customer requests one of your cars, it will appear here."
                  action={<Link to="/cars" className="btn btn-primary">View public fleet</Link>}
                />
              ) : (
                <div className="request-list">
                  {bookings.map((booking) => (
                    <RequestItem
                      key={booking._id}
                      booking={booking}
                      acting={acting}
                      onDecide={decide}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {showForm && (
        <CarFormModal
          car={editingCar}
          onClose={() => setShowForm(false)}
          onSaved={() => load(true)}
        />
      )}

      {deletingCar && (
        <Modal
          title="Delete this listing?"
          subtitle={`${deletingCar.name} · ${deletingCar.regNumber}`}
          onClose={() => setDeletingCar(null)}
        >
          <div className="confirm-box">
            <span className="confirm-icon danger"><Icon name="trash" size={22} /></span>
            <p>
              This removes the car and its photo from the platform. Cars with past bookings are
              marked unavailable instead of being deleted.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDeletingCar(null)} disabled={deleting}>
              Keep listing
            </button>
            <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete car'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
