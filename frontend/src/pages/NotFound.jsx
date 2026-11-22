import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  return (
    <div className="container not-found">
      <span className="not-found-code">404</span>
      <h1>This road leads nowhere.</h1>
      <p>The page you’re looking for doesn’t exist or may have moved. Let’s get you back on track.</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">
          Back home <Icon name="arrowRight" size={16} />
        </Link>
        <Link to="/cars" className="btn btn-outline">
          Browse cars
        </Link>
      </div>
    </div>
  );
}
