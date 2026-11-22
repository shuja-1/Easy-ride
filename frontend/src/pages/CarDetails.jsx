import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import CarCard from '../components/CarCard.jsx';
import EmptyState from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  addDaysISO,
  daysBetween,
  dashboardPath,
  dateLabel,
  inr,
  todayISO,
  tomorrowISO,
} from '../utils.js';

export default function CarDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [car, setCar] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const initialStart = searchParams.get('start') || tomorrowISO();
  const initialEnd = searchParams.get('end') || addDaysISO(initialStart, 2);
  const [dates, setDates] = useState({ start: initialStart, end: initialEnd });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/cars/${id}`)
      .then((data) => {
        if (!active) return;
        setCar(data.car);
        return api(`/cars?type=${encodeURIComponent(data.car.type)}`).then((result) => {
          if (active) {
            setSimilar(result.cars.filter((item) => item._id !== data.car._id).slice(0, 3));
          }
        });
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const days = useMemo(() => {
    if (!dates.start || !dates.end) return 0;
    if (dates.end <= dates.start) return 0;
    return daysBetween(dates.start, dates.end);
  }, [dates]);

  const total = days && car ? days * car.pricePerDay : 0;

  const updateDate = (field) => (event) => {
    const value = event.target.value;
    setBookingError('');
    setDates((current) => {
      if (field === 'start' && current.end <= value) {
        return { start: value, end: addDaysISO(value, 2) };
      }
      return { ...current, [field]: value };
    });
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: `/cars/${id}` } });
      return;
    }
    if (user.role !== 'customer') {
      toast(`Bookings need a customer account. You are signed in as a ${user.role}.`, 'error');
      return;
    }
    if (!dates.start || !dates.end || dates.end <= dates.start) {
      setBookingError('Return date must be after the pickup date.');
      return;
    }
    if (dates.start < todayISO()) {
      setBookingError('Pickup date cannot be in the past.');
      return;
    }
    setSubmitting(true);
    setBookingError('');
    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          carId: car._id,
          pickupDate: dates.start,
          returnDate: dates.end,
          pickupLocation: car.location,
        },
      });
      toast('Booking request sent to the provider', 'success');
      navigate('/dashboard?tab=bookings');
    } catch (submitError) {
      setBookingError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container section">
        <div className="detail-skeleton">
          <div className="skeleton detail-media-skeleton" />
          <div className="detail-skeleton-copy">
            <div className="skeleton line line-lg" />
            <div className="skeleton line" />
            <div className="skeleton line line-sm" />
            <div className="skeleton line" />
            <div className="skeleton line" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="container section">
        <EmptyState
          icon="car"
          title="This car is not available"
          message={error || 'The listing may have been removed or is awaiting admin approval.'}
          action={
            <Link to="/cars" className="btn btn-primary">
              Back to all cars
            </Link>
          }
        />
      </div>
    );
  }

  const specs = [
    { icon: 'car', label: 'Body type', value: car.type },
    { icon: 'fuel', label: 'Fuel', value: car.fuelType },
    { icon: 'users', label: 'Seats', value: `${car.seats} seats` },
    { icon: 'mapPin', label: 'Pick-up city', value: car.location },
  ];

  return (
    <div className="page-shell">
      <div className="container detail-breadcrumb">
        <Link to="/cars" className="back-link">
          <Icon name="arrowRight" size={15} /> Back to all cars
        </Link>
      </div>

      <div className="container detail-layout">
        <div className="detail-main">
          <div className="detail-media">
            <img src={assetUrl(car.image)} alt={`${car.name} ${car.model}`} />
            <span className="detail-type">{car.type}</span>
            {!car.isAvailable && <span className="detail-unavailable">Currently unavailable</span>}
          </div>

          <div className="detail-heading">
            <div>
              <div className="detail-title-row">
                <h1>{car.name}</h1>
                <span className="verified-pill">
                  <Icon name="shield" size={13} /> Verified
                </span>
              </div>
              <p className="detail-model">{car.model} · {car.location}</p>
            </div>
            <div className="detail-rate">
              <strong>{inr(car.pricePerDay)}</strong>
              <span>per day</span>
            </div>
          </div>

          <div className="spec-grid">
            {specs.map((spec) => (
              <div className="spec-card" key={spec.label}>
                <span className="spec-icon"><Icon name={spec.icon} size={19} /></span>
                <div>
                  <span>{spec.label}</span>
                  <strong>{spec.value}</strong>
                </div>
              </div>
            ))}
          </div>

          <section className="detail-block">
            <h2>About this car</h2>
            <p className="detail-description">{car.description}</p>
          </section>

          <section className="detail-block">
            <h2>Provider</h2>
            <div className="provider-card">
              <span className="avatar avatar-lg">{car.provider?.name?.slice(0, 1) || 'E'}</span>
              <div className="provider-info">
                <strong>{car.provider?.name || 'EasyRide provider'}</strong>
                <span>Listed with EasyRide · approved by admin</span>
              </div>
              <span className="badge badge-approved">Verified provider</span>
            </div>
          </section>

          <section className="detail-block">
            <h2>Booking & payment</h2>
            <ul className="check-list compact">
              <li>
                <span className="check-dot"><Icon name="check" size={13} /></span>
                Send a request, then pay by UPI once the provider approves it.
              </li>
              <li>
                <span className="check-dot"><Icon name="check" size={13} /></span>
                Free cancellation for unpaid bookings. Paid bookings cannot be cancelled online.
              </li>
              <li>
                <span className="check-dot"><Icon name="check" size={13} /></span>
                Your payment receipt is stored in your dashboard after verification.
              </li>
            </ul>
          </section>
        </div>

        <aside className="booking-card">
          <div className="booking-card-head">
            <div>
              <span>Daily rate</span>
              <strong>{inr(car.pricePerDay)}</strong>
            </div>
            <span className="verified-pill">
              <Icon name="star" size={13} /> EasyRide fleet
            </span>
          </div>

          <form onSubmit={submitBooking}>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Pick-up date</span>
                <input
                  type="date"
                  min={todayISO()}
                  value={dates.start}
                  onChange={updateDate('start')}
                />
              </label>
              <label className="field">
                <span className="field-label">Return date</span>
                <input
                  type="date"
                  min={addDaysISO(dates.start || todayISO(), 1)}
                  value={dates.end}
                  onChange={updateDate('end')}
                />
              </label>
            </div>

            <div className="price-breakdown">
              <div>
                <span>Pick-up</span>
                <strong>{dates.start ? dateLabel(dates.start) : '—'}</strong>
              </div>
              <div>
                <span>Return</span>
                <strong>{dates.end ? dateLabel(dates.end) : '—'}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{days ? `${days} day${days === 1 ? '' : 's'}` : '—'}</strong>
              </div>
              <div>
                <span>{inr(car.pricePerDay)} × {days || 0} days</span>
                <strong>{inr(total)}</strong>
              </div>
              <div className="price-total">
                <span>Total payable</span>
                <strong>{inr(total)}</strong>
              </div>
            </div>

            {bookingError && (
              <p className="form-error">
                <Icon name="xCircle" size={15} /> {bookingError}
              </p>
            )}

            {!user && (
              <p className="booking-note">
                <Icon name="user" size={15} /> Sign in as a customer to request this car.
              </p>
            )}
            {user && user.role !== 'customer' && (
              <p className="booking-note">
                <Icon name="dashboard" size={15} /> Switch to a customer account to book.
                <Link to={dashboardPath(user.role)}> Go to dashboard</Link>
              </p>
            )}

            <button
              className="btn btn-primary btn-block btn-lg"
              disabled={submitting || !car.isAvailable || user?.role === 'provider' || user?.role === 'admin'}
            >
              {!car.isAvailable
                ? 'Currently unavailable'
                : submitting
                  ? 'Sending request…'
                  : user
                    ? 'Request booking'
                    : 'Sign in to book'}
            </button>
            <p className="booking-fineprint">
              No payment is taken now. The provider reviews your dates first.
            </p>
          </form>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="section similar-section">
          <div className="container">
            <div className="section-head split">
              <div>
                <span className="eyebrow">You may also like</span>
                <h2>Similar {car.type.toLowerCase()} cars</h2>
              </div>
              <Link to={`/cars?type=${car.type}`} className="btn btn-outline">
                View all <Icon name="arrowRight" size={16} />
              </Link>
            </div>
            <div className="car-grid">
              {similar.map((item, index) => (
                <CarCard key={item._id} car={item} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
