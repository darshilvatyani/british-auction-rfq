import { formatDateTime } from '../utils/formatDate.js';

const labels = {
  BID_SUBMITTED: 'Quote submitted',
  AUCTION_EXTENDED: 'Auction extended',
  AUCTION_CLOSED: 'Auction closed',
};

export default function ActivityLog({ activities }) {
  return (
    <section className="details-section activity-section" aria-labelledby="activity-heading">
      <h2 id="activity-heading">Activity</h2>
      {activities.length === 0 ? <p className="section-note">No auction activity yet.</p> : (
        <div className="activity-scroll" tabIndex={0} role="region" aria-label="Auction activity history">
          <ol className="activity-list">
            {activities.map((entry) => (
              <li key={entry.id}>
                <div className="activity-heading"><strong>{labels[entry.eventType]}</strong><time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time></div>
                <p>{entry.reason}</p>
                {entry.newCloseTime && <p className="activity-deadline">Close: {formatDateTime(entry.previousCloseTime)} → {formatDateTime(entry.newCloseTime)}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
