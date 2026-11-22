import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPath } from '../utils.js';

export function PageLoader({ text = 'Loading EasyRide…' }) {
  return (
    <div className="page-loader">
      <span className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPath(user.role)} replace />;

  return children;
}
