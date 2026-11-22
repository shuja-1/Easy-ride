import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { assetUrl } from '../api.js';
import Icon from '../components/Icon.jsx';
import { Logo } from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dashboardPath } from '../utils.js';

const demoAccounts = [
  { role: 'Customer', email: 'customer@easyride.com', password: 'Demo@123', icon: 'user' },
  { role: 'Provider', email: 'provider@easyride.com', password: 'Demo@123', icon: 'building' },
  { role: 'Admin', email: 'admin@easyride.com', password: 'Admin@123', icon: 'shield' },
];

export default function Login() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
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
    setBusy(true);
    setError('');
    try {
      const loggedIn = await login(form);
      toast(`Welcome back, ${loggedIn.name.split(' ')[0]}`, 'success');
      const from = location.state?.from;
      navigate(from || dashboardPath(loggedIn.role), { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <Logo light />
          <div className="auth-aside-copy">
            <span className="eyebrow eyebrow-dark">Welcome back</span>
            <h1>Your keys are waiting.</h1>
            <p>
              Sign in to manage bookings, approve requests, track payments or keep the
              marketplace running.
            </p>
            <ul className="auth-points">
              <li><Icon name="checkCircle" size={16} /> One account, one dashboard</li>
              <li><Icon name="checkCircle" size={16} /> Secure UPI payment records</li>
              <li><Icon name="checkCircle" size={16} /> Bookings only for approved cars</li>
            </ul>
          </div>
          <figure className="auth-aside-photo">
            <img src={assetUrl('/uploads/cars/hyundai-verna.jpg')} alt="Hyundai Verna on EasyRide" />
            <figcaption>
              <span className="float-icon"><Icon name="shield" size={16} /></span>
              Admin-verified listings and providers
            </figcaption>
          </figure>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            <h2>Log in to EasyRide</h2>
            <p>New here? <Link to="/signup">Create an account</Link></p>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label className="field">
              <span className="field-label">Email address</span>
              <div className="input-icon-wrap">
                <Icon name="mail" size={17} />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update('email')}
                  required
                />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <div className="input-icon-wrap">
                <Icon name="shield" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={update('password')}
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

            {error && (
              <p className="form-error">
                <Icon name="xCircle" size={15} /> {error}
              </p>
            )}

            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="demo-box">
            <div className="demo-head">
              <span>Demo accounts</span>
              <small>Click to autofill</small>
            </div>
            <div className="demo-grid">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  className="demo-account"
                  onClick={() =>
                    setForm({ email: account.email, password: account.password })
                  }
                >
                  <span className="demo-icon"><Icon name={account.icon} size={15} /></span>
                  <span>
                    <strong>{account.role}</strong>
                    <small>{account.email}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
