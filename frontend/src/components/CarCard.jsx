import { Link } from 'react-router-dom';
import { assetUrl } from '../api.js';
import { inr } from '../utils.js';
import Icon from './Icon.jsx';

export default function CarCard({ car, index = 0, showStatus = false }) {
  return (
    <Link
      to={`/cars/${car._id}`}
      className="car-card"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="car-card-media">
        <img src={assetUrl(car.image)} alt={`${car.name} available for rent`} loading="lazy" />
        <span className="car-type-pill">{car.type}</span>
        {showStatus && <span className={`listing-pill listing-${car.status}`}>{car.status}</span>}
        {!car.isAvailable && <span className="unavailable-veil">Currently unavailable</span>}
      </div>
      <div className="car-card-body">
        <div className="car-card-heading">
          <div>
            <h3>{car.name}</h3>
            <p className="car-model">{car.model}</p>
          </div>
          <span className="verified-pill" title="Verified provider">
            <Icon name="shield" size={13} /> Verified
          </span>
        </div>

        <div className="car-meta">
          <span>
            <Icon name="mapPin" size={14} /> {car.location}
          </span>
          <span>
            <Icon name="users" size={14} /> {car.seats} seats
          </span>
          <span>
            <Icon name="fuel" size={14} /> {car.fuelType}
          </span>
        </div>

        <div className="car-card-footer">
          <div className="car-price">
            {inr(car.pricePerDay)} <small>/ day</small>
          </div>
          <span className="card-cta">
            View & Book <Icon name="arrowRight" size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
