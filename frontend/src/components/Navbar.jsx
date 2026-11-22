import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPath, initials, roleLabel } from '../utils.js';
import Icon from './Icon.jsx';

export function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label="EasyRide home">
      <span className="logo-mark">
        <Icon name="car" size={22} strokeWidth={2} />
      </span>
      <span className="logo-text">
        Easy<span>Ride</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container navbar-inner">
        <Logo />

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/cars" className="nav-link">
            Explore Cars
          </NavLink>
          <Link to="/#services" className="nav-link">
            Services
          </Link>
          <Link to="/#about" className="nav-link">
            About Us
          </Link>
          <Link to="/#contact" className="nav-link">
            Contact
          </Link>
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link to={dashboardPath(user.role)} className="user-chip">
                <span className="avatar">{initials(user.name)}</span>
                <span className="user-chip-text">
                  <strong>{user.name.split(' ')[0]}</strong>
                  <small>{roleLabel(user.role)}</small>
                </span>
              </Link>
              <Link to={dashboardPath(user.role)} className="btn btn-ghost btn-sm nav-dashboard">
                <Icon name="dashboard" size={16} /> Dashboard
              </Link>
              <button className="btn btn-dark btn-sm nav-logout" onClick={handleLogout}>
                <Icon name="logout" size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign up <Icon name="arrowRight" size={15} />
              </Link>
            </>
          )}
        </div>

        <button
          className={`nav-toggle ${open ? 'open' : ''}`}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <nav aria-label="Mobile navigation">
          <NavLink to="/" end onClick={() => setOpen(false)}>
            <Icon name="car" size={18} /> Home
          </NavLink>
          <NavLink to="/cars" onClick={() => setOpen(false)}>
            <Icon name="search" size={18} /> Explore Cars
          </NavLink>
          <Link to="/#services" onClick={() => setOpen(false)}>
            <Icon name="settings" size={18} /> Services
          </Link>
          <Link to="/#about" onClick={() => setOpen(false)}>
            <Icon name="shield" size={18} /> About Us
          </Link>
          <Link to="/#contact" onClick={() => setOpen(false)}>
            <Icon name="mail" size={18} /> Contact
          </Link>
          {user ? (
            <>
              <NavLink to={dashboardPath(user.role)} onClick={() => setOpen(false)}>
                <Icon name="dashboard" size={18} /> My Dashboard
              </NavLink>
              <button onClick={handleLogout}>
                <Icon name="logout" size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Icon name="user" size={18} /> Login
              </Link>
              <Link to="/signup" className="mobile-signup" onClick={() => setOpen(false)}>
                <Icon name="arrowRight" size={18} /> Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
