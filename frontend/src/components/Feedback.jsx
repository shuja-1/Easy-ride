import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'car', title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="car-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton skeleton-media" />
          <div className="skeleton-body">
            <div className="skeleton skeleton-line wide" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
