const statusClasses = {
  Upcoming: 'status--upcoming',
  Active: 'status--active',
  Closed: 'status--closed',
  'Force Closed': 'status--forced',
};

export default function StatusBadge({ status }) {
  return <span className={`status ${statusClasses[status] || ''}`}>{status}</span>;
}
