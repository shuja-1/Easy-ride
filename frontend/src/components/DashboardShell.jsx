import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPath, initials, roleLabel } from '../utils.js';
import Icon from './Icon.jsx';
import { Logo } from './Navbar.jsx';

export default function DashboardShell({ title, subtitle, tabs, active, onChange, children, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-head">
          <Logo />
          <span className="dash-role-pill">{roleLabel(user.role)}</span>
        </div>

        <div className="dash-user">
          <span className="avatar">{initials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`dash-nav-item ${active === tab.id ? 'active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <Icon name={tab.icon} size={18} />
              <span>{tab.label}</span>
              {tab.count > 0 && <span className="dash-count">{tab.count}</span>}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <Link to={dashboardPath(user.role)} className="dash-foot-link" onClick={() => onChange('overview')}>
            <Icon name="dashboard" size={17} /> Overview
          </Link>
          <Link to="/" className="dash-foot-link">
            <Icon name="arrowRight" size={17} /> Back to website
          </Link>
          <button type="button" className="dash-foot-link" onClick={handleLogout}>
            <Icon name="logout" size={17} /> Logout
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-heading">
            <span className="dash-kicker">{roleLabel(user.role)} dashboard</span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="dash-topbar-actions">
            {actions}
            <Link to="/cars" className="btn btn-outline btn-sm dash-browse">
              <Icon name="search" size={15} /> Browse cars
            </Link>
          </div>
        </header>
        <main className="dash-content">{children}</main>
      </div>
    </div>
  );
}
