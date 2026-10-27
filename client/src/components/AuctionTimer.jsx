import { formatDuration, getAuctionStatus, getNextBoundary } from '../utils/auctionTime.js';

export default function AuctionTimer({ rfq, now }) {
  const status = getAuctionStatus(rfq, now);
  const boundary = getNextBoundary(rfq, now);

  return (
    <div className="auction-timer">
      <span className="overview-label">{status === 'Upcoming' ? 'Bidding starts in' : 'Time remaining'}</span>
      <span className="timer-value">{boundary === null ? 'Bidding closed' : formatDuration(boundary - now)}</span>
    </div>
  );
}
