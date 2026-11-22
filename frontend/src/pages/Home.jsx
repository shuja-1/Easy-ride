import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import CarCard from '../components/CarCard.jsx';
import { SkeletonGrid } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { addDaysISO, CAR_TYPES, todayISO, tomorrowISO } from '../utils.js';

function SearchBar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({
    location: '',
    type: '',
    start: tomorrowISO(),
    end: addDaysISO(new Date(), 3),
  });

  useEffect(() => {
    api('/cars/locations')
      .then((data) => setLocations(data.locations))
      .catch(() => setLocations([]));
  }, []);

  const update = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (new Date(`${filters.end}T00:00:00`) <= new Date(`${filters.start}T00:00:00`)) {
      toast('Return date must be after the pickup date', 'error');
      return;
    }
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/cars?${params.toString()}`);
  };

  return (
    <form className="search-bar" onSubmit={submit}>
      <div className="search-field">
        <span className="search-field-icon">
          <Icon name="mapPin" size={17} />
        </span>
        <div>
          <label htmlFor="home-location">Pick-up city</label>
          <select id="home-location" value={filters.location} onChange={update('location')}>
            <option value="">Anywhere in India</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="search-field">
        <span className="search-field-icon">
          <Icon name="car" size={17} />
        </span>
        <div>
          <label htmlFor="home-type">Car type</label>
          <select id="home-type" value={filters.type} onChange={update('type')}>
            <option value="">All types</option>
            {CAR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="search-field">
        <span className="search-field-icon">
          <Icon name="calendar" size={17} />
        </span>
        <div>
          <label htmlFor="home-start">Pick-up date</label>
          <input
            id="home-start"
            type="date"
            min={todayISO()}
            value={filters.start}
            onChange={update('start')}
          />
        </div>
      </div>

      <div className="search-field">
        <span className="search-field-icon">
          <Icon name="calendar" size={17} />
        </span>
        <div>
          <label htmlFor="home-end">Return date</label>
          <input
            id="home-end"
            type="date"
            min={filters.start ? addDaysISO(filters.start, 1) : todayISO()}
            value={filters.end}
            onChange={update('end')}
          />
        </div>
      </div>

      <button className="btn btn-primary search-submit" type="submit">
        <Icon name="search" size={18} /> Search Cars
      </button>
    </form>
  );
}

const services = [
  {
    icon: 'shield',
    title: 'Verified listings',
    text: 'Every car and provider is reviewed by our admin team before it reaches the fleet.',
  },
  {
    icon: 'wallet',
    title: 'Transparent pricing',
    text: 'The daily rate and total are calculated on the server, so there are no surprise charges.',
  },
  {
    icon: 'creditCard',
    title: 'Secure UPI payments',
    text: 'Pay with UPI after your booking is approved, with Razorpay signature verification.',
  },
  {
    icon: 'calendar',
    title: 'Flexible booking requests',
    text: 'Choose your pickup and return dates, then cancel free of charge before payment.',
  },
];

const steps = [
  {
    icon: 'search',
    title: 'Find your car',
    text: 'Search by city, car type and rental dates to see only cars that are actually available.',
  },
  {
    icon: 'calendar',
    title: 'Request your dates',
    text: 'Pick your pickup and return dates and send a booking request to the car provider.',
  },
  {
    icon: 'creditCard',
    title: 'Pay after approval',
    text: 'Once the provider approves, pay securely by UPI. Your receipt is saved in your dashboard.',
  },
];

export default function Home() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [contact, setContact] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    api('/cars')
      .then((data) => setCars(data.cars.slice(0, 6)))
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const scrollToSearch = () => {
    document.getElementById('plan-trip')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const sendContact = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(`EasyRide enquiry from ${contact.name}`);
    const body = encodeURIComponent(`${contact.message}\n\nFrom: ${contact.name}\nEmail: ${contact.email}`);
    window.location.href = `mailto:support@easyride.com?subject=${subject}&body=${body}`;
    toast('Opening your email app to send the message', 'info');
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-glow" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-dark">
              <span className="live-dot" /> Self-drive car rentals across India
            </span>
            <h1>
              Your next drive,
              <br />
              <span>made easy.</span>
            </h1>
            <p className="hero-lead">
              Book well-maintained sedans, SUVs, MPVs and luxury cars from verified providers.
              Transparent pricing, a simple approval flow and secure UPI payments.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={scrollToSearch}>
                Rent Your Car Now <Icon name="arrowRight" size={18} />
              </button>
              <Link to="/cars" className="btn btn-glass btn-lg">
                Explore Fleet
              </Link>
            </div>
            <div className="hero-points">
              <span>
                <Icon name="checkCircle" size={16} /> Verified providers
              </span>
              <span>
                <Icon name="checkCircle" size={16} /> Secure UPI
              </span>
              <span>
                <Icon name="checkCircle" size={16} /> Free cancellation before payment
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src={assetUrl('/uploads/cars/toyota-fortuner.jpg')}
                alt="White Toyota Fortuner SUV available for rent on EasyRide"
              />
            </div>
            <div className="hero-float hero-float-top">
              <span className="float-icon">
                <Icon name="car" size={18} />
              </span>
              <div>
                <strong>7-seat comfort</strong>
                <span>Toyota Fortuner</span>
              </div>
              <span className="float-price">₹6,500<small>/day</small></span>
            </div>
            <div className="hero-float hero-float-bottom">
              <span className="upi-mark">UPI</span>
              <div>
                <strong>Secure payments</strong>
                <span>GPay · PhonePe · Paytm</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container" id="plan-trip">
          <SearchBar />
        </div>
      </section>

      <div className="trust-strip">
        <div className="container trust-inner">
          <span>
            <Icon name="shield" size={17} /> Admin-verified fleet
          </span>
          <span>
            <Icon name="creditCard" size={17} /> Verified UPI payments
          </span>
          <span>
            <Icon name="clock" size={17} /> Instant booking requests
          </span>
          <span>
            <Icon name="building" size={17} /> 8+ cities across India
          </span>
        </div>
      </div>

      <section className="section fleet-section" id="fleet">
        <div className="container">
          <div className="section-head split">
            <div>
              <span className="eyebrow">The fleet</span>
              <h2>Cars for every kind of journey</h2>
              <p>
                From efficient city hatchbacks to seven-seat family SUVs and executive sedans —
                all from verified providers.
              </p>
            </div>
            <Link to="/cars" className="btn btn-outline">
              View all cars <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="type-chips">
            {CAR_TYPES.map((type) => (
              <Link key={type} to={`/cars?type=${type}`} className="type-chip">
                {type}
              </Link>
            ))}
          </div>

          {loading ? <SkeletonGrid count={6} /> : <div className="car-grid">{cars.map((car, index) => (
            <CarCard key={car._id} car={car} index={index} />
          ))}</div>}
        </div>
      </section>

      <section className="section services-section" id="services">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow">Why EasyRide</span>
            <h2>Renting a car, without the runaround</h2>
            <p>
              Everything from discovery to payment is handled on one platform — for customers,
              car providers and admins.
            </p>
          </div>
          <div className="services-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service.title} style={{ animationDelay: `${index * 70}ms` }}>
                <span className="service-icon">
                  <Icon name={service.icon} size={22} />
                </span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-section" id="about">
        <div className="container about-grid">
          <div className="about-visual">
            <img
              src={assetUrl('/uploads/cars/mercedes-eclass.jpg')}
              alt="Mercedes-Benz E-Class listed on EasyRide"
              loading="lazy"
            />
            <div className="about-float">
              <span className="float-icon">
                <Icon name="shield" size={20} />
              </span>
              <div>
                <strong>Reviewed by admins</strong>
                <span>Each listing is checked before it goes live</span>
              </div>
            </div>
          </div>
          <div className="about-copy">
            <span className="eyebrow">About EasyRide</span>
            <h2>A simpler way to get behind the wheel</h2>
            <p>
              EasyRide connects customers with trusted car owners and rental providers. Customers
              can compare real cars, request dates and pay securely; providers get a dashboard to
              manage their fleet; admins keep the marketplace safe.
            </p>
            <ul className="check-list">
              <li>
                <span className="check-dot"><Icon name="check" size={13} /></span>
                Three separate roles: customer, car provider and administrator
              </li>
              <li>
                <span className="check-dot"><Icon name="check" size={13} /></span>
                Listings are approved before appearing in the public fleet
              </li>
              <li>
                <span className="check-dot"><Icon name="check" size={13} /></span>
                Every payment is verified on the backend and saved to your account
              </li>
            </ul>
            <div className="about-actions">
              <Link to="/cars" className="btn btn-dark">
                Browse the fleet <Icon name="arrowRight" size={16} />
              </Link>
              <Link to="/signup?role=provider" className="btn btn-ghost">
                List your car
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section steps-section">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow">How it works</span>
            <h2>Three steps to your next trip</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <article className="step-card" key={step.title}>
                <span className="step-number">0{index + 1}</span>
                <span className="step-icon">
                  <Icon name={step.icon} size={22} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <div className="cta-banner">
            <div>
              <span className="eyebrow eyebrow-dark">For car owners</span>
              <h2>Your car can earn while you don’t drive.</h2>
              <p>
                Join as a car provider, list your vehicle and manage booking requests from a
                dedicated dashboard. Your listing goes live after admin approval.
              </p>
            </div>
            <div className="cta-actions">
              <Link to="/signup?role=provider" className="btn btn-white btn-lg">
                Become a provider <Icon name="arrowRight" size={17} />
              </Link>
              <span className="cta-note">No listing fee in this demo</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section contact-section" id="contact">
        <div className="container contact-grid">
          <div className="contact-copy">
            <span className="eyebrow">Contact</span>
            <h2>Questions? We’re here to help.</h2>
            <p>
              Need help with a booking or want to list your car? Send us a message and our team
              will get back to you.
            </p>
            <div className="contact-cards">
              <a href="mailto:support@easyride.com" className="contact-item">
                <span className="contact-icon"><Icon name="mail" size={19} /></span>
                <div>
                  <span>Email us</span>
                  <strong>support@easyride.com</strong>
                </div>
              </a>
              <a href="tel:+919876543210" className="contact-item">
                <span className="contact-icon"><Icon name="phone" size={19} /></span>
                <div>
                  <span>Call us</span>
                  <strong>+91 98765 43210</strong>
                </div>
              </a>
              <div className="contact-item">
                <span className="contact-icon"><Icon name="mapPin" size={19} /></span>
                <div>
                  <span>Visit us</span>
                  <strong>EasyRide HQ, Bengaluru, India</strong>
                </div>
              </div>
            </div>
          </div>

          <form className="contact-form" onSubmit={sendContact}>
            <h3>Send a message</h3>
            <p>This opens your email app with the details filled in.</p>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Your name</span>
                <input
                  value={contact.name}
                  onChange={(event) => setContact({ ...contact, name: event.target.value })}
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(event) => setContact({ ...contact, email: event.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="field field-full">
                <span className="field-label">Message</span>
                <textarea
                  rows={4}
                  value={contact.message}
                  onChange={(event) => setContact({ ...contact, message: event.target.value })}
                  placeholder="Tell us what you need help with…"
                  required
                />
              </label>
            </div>
            <button className="btn btn-primary btn-block">
              Send message <Icon name="send" size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
