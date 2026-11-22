import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { assetUrl } from '../api.js';
import Icon from '../components/Icon.jsx';
import { Logo } from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dashboardPath } from '../utils.js';

export default function Signup() {
  const { user, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    role: searchParams.get('role') === 'provider' ? 'provider' : 'customer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError('Enter a valid 10-digit Indian mobile number (starting with 6–9).');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const created = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      });
      toast(`Account created. Welcome, ${created.name.split(' ')[0]}!`, 'success');
      navigate(dashboardPath(created.role), { replace: true });
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page auth-page-signup">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <Logo light />
          <div className="auth-aside-copy">
            <span className="eyebrow eyebrow-dark">Join EasyRide</span>
            <h1>Two ways to get moving.</h1>
            <p>
              Rent a car for your next trip, or list your own cars and manage bookings as a
              provider.
            </p>
            <ul className="auth-points">
              <li><Icon name="checkCircle" size={16} /> Customers book and pay by UPI</li>
              <li><Icon name="checkCircle" size={16} /> Providers manage cars and requests</li>
              <li><Icon name="checkCircle" size={16} /> Admins verify every listing</li>
            </ul>
          </div>
          <figure className="auth-aside-photo">
            <img src={assetUrl('/uploads/cars/maruti-dzire.jpg')} alt="Maruti Suzuki Swift Dzire on EasyRide" />
            <figcaption>
              <span className="float-icon"><Icon name="car" size={16} /></span>
              Everyday cars, ready for the road
            </figcaption>
          </figure>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            <h2>Create your account</h2>
            <p>Already registered? <Link to="/login">Log in instead</Link></p>
          </div>

          <div className="role-picker" role="radiogroup" aria-label="Account type">
            <button
              type="button"
              className={`role-option ${form.role === 'customer' ? 'selected' : ''}`}
              onClick={() => setForm((current) => ({ ...current, role: 'customer' }))}
              role="radio"
              aria-checked={form.role === 'customer'}
            >
              <span className="role-icon"><Icon name="user" size={18} /></span>
              <span>
                <strong>I want to rent</strong>
                <small>Customer account</small>
              </span>
              {form.role === 'customer' && <Icon name="checkCircle" size={17} />}
            </button>
            <button
              type="button"
              className={`role-option ${form.role === 'provider' ? 'selected' : ''}`}
              onClick={() => setForm((current) => ({ ...current, role: 'provider' }))}
              role="radio"
              aria-checked={form.role === 'provider'}
            >
              <span className="role-icon"><Icon name="building" size={18} /></span>
              <span>
                <strong>I own cars</strong>
                <small>Provider account</small>
              </span>
              {form.role === 'provider' && <Icon name="checkCircle" size={17} />}
            </button>
          </div>

          <form onSubmit={submit} className="auth-form">
            <div className="form-grid">
              <label className="field field-full">
                <span className="field-label">Full name</span>
                <input
                  value={form.name}
                  onChange={update('name')}
                  placeholder="e.g. Riya Sharma"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Email address</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Mobile number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="10-digit number"
                  maxLength={10}
                  autoComplete="tel-national"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Password</span>
                <div className="input-icon-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
                  </button>
                </div>
              </label>
              <label className="field">
                <span className="field-label">Confirm password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>

            {error && (
              <p className="form-error">
                <Icon name="xCircle" size={15} /> {error}
              </p>
            )}

            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Creating account…' : `Create ${form.role} account`}
            </button>
            <p className="auth-fineprint">
              By creating an account you agree to use EasyRide responsibly. Admin accounts are
              created by the platform only.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
