import { statusLabel } from '../utils.js';

export default function StatusBadge({ status, label }) {
  return <span className={`badge badge-${status}`}>{label || statusLabel(status)}</span>;
}
