import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction.js';
import StatusBadge from '../components/StatusBadge.jsx';
import AuctionTimer from '../components/AuctionTimer.jsx';
import BidForm from '../components/BidForm.jsx';
import BidTable from '../components/BidTable.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import { getAuctionStatus } from '../utils/auctionTime.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import { formatMoney } from '../utils/formatMoney.js';

const triggerLabels = {
  ANY_BID: 'Any bid',
  ANY_RANK_CHANGE: 'Any supplier rank change',
  L1_CHANGE: 'Lowest bidder (L1) change',
};

export default function AuctionDetails() {
  const { rfqId } = useParams();
  return <Auction key={rfqId} rfqId={rfqId} />;
}

function Auction({ rfqId }) {
  const location = useLocation();
  const { rfq, rankings, history, activities, now, connection, isLoading, error, refresh } = useAuction(rfqId);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    document.title = rfq ? `${rfq.referenceId} | RFQ Auctions` : 'RFQ details | RFQ Auctions';
  }, [rfq]);

  return (
    <>
      <Link className="back-link" to="/rfqs">Back to auctions</Link>
      {!rfq && <div className="page-heading"><h1>RFQ details</h1></div>}
      {location.state?.created && <div className="notice notice--success" role="status">RFQ created.</div>}
      {error && <div className="notice notice--error" role="alert">{error} <button className="text-button" onClick={refresh}>Try again</button></div>}
      {isLoading && !rfq && <p className="loading-state" role="status">Loading RFQ...</p>}
      {rfq && (
        <>
          <div className="page-heading page-heading--actions">
            <div><h1>{rfq.name}</h1><p>{rfq.referenceId}</p></div>
            <div className="live-actions">
              <span className="connection-state" role="status">{connection === 'polling' ? 'Auto-refresh on' : connection === 'live' ? 'Live updates on' : connection === 'connecting' ? 'Connecting...' : 'Reconnecting · Refresh available'}</span>
              <button className="button" onClick={refresh}>Refresh</button>
            </div>
          </div>
          <section className="details-section auction-overview" aria-label="Auction overview">
            <AuctionTimer rfq={rfq} now={now} />
            <dl className="details-grid overview-grid">
              <div><dt>Status</dt><dd><StatusBadge status={getAuctionStatus(rfq, now)} /></dd></div>
              <div><dt>Current lowest bid</dt><dd><strong>{rfq.lowestBid === null ? 'No bids yet' : formatMoney(rfq.lowestBid, rfq.currency)}</strong></dd></div>
              <div><dt>Current bid close</dt><dd>{formatDateTime(rfq.currentCloseTime)}</dd></div>
              <div><dt>Forced close</dt><dd>{rfq.britishAuctionEnabled ? formatDateTime(rfq.forcedCloseTime) : 'Not applicable'}</dd></div>
            </dl>
          </section>
          <details className="details-section rfq-information">
            <summary>RFQ information</summary>
            <dl className="details-grid">
              <div><dt>Bid starts</dt><dd>{formatDateTime(rfq.bidStartTime)}</dd></div>
              <div><dt>Initial bid close</dt><dd>{formatDateTime(rfq.initialCloseTime)}</dd></div>
              <div><dt>Pickup / service date</dt><dd>{formatDate(rfq.pickupDate)}</dd></div>
              <div><dt>Currency</dt><dd>{rfq.currency}</dd></div>
              <div><dt>Auction type</dt><dd>{rfq.britishAuctionEnabled ? 'British Auction' : 'Fixed close'}</dd></div>
              {rfq.britishAuctionEnabled && <>
                <div><dt>Trigger window</dt><dd>{rfq.triggerWindowMinutes} minutes</dd></div>
                <div><dt>Extension duration</dt><dd>{rfq.extensionMinutes} minutes</dd></div>
                <div><dt>Extension trigger</dt><dd>{triggerLabels[rfq.extensionTrigger]}</dd></div>
              </>}
            </dl>
          </details>
          <section className="quotes-section" aria-labelledby="rankings-heading">
            <h2 id="rankings-heading">Supplier quotes <span className="muted">({rankings.length})</span></h2>
            <p className="section-note">Latest quote per supplier. Lowest total ranks first; earlier quotes win ties.</p>
            <BidTable bids={rankings} currency={rfq.currency} />
          </section>
          <div className="auction-columns">
            <BidForm rfq={rfq} rankings={rankings} now={now} onSubmitted={refresh} />
            <ActivityLog activities={activities} />
          </div>
          <details className="details-section bid-history">
            <summary>Bid history ({history.length})</summary>
            <BidTable bids={history} currency={rfq.currency} history />
          </details>
        </>
      )}
      <p className="page-note">Times are shown in your local time ({timeZone}). The server checks the bidding deadline when accepting each quote.</p>
    </>
  );
}
