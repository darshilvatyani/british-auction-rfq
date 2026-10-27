import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRfqs } from '../api/rfqApi.js';
import { watchAuction } from '../api/auctionSocket.js';
import { createClockSample, getAuctionStatus, getNextBoundary, getServerNow } from '../utils/auctionTime.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime } from '../utils/formatDate.js';
import { formatMoney } from '../utils/formatMoney.js';

export default function AuctionList() {
  const [rfqs, setRfqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshId, setRefreshId] = useState(0);
  const [connection, setConnection] = useState('connecting');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => watchAuction(null, () => setRefreshId((value) => value + 1), setConnection), []);

  useEffect(() => {
    document.title = 'Auctions | RFQ Auctions';
    const controller = new AbortController();
    let boundaryTimer;
    const sentAt = performance.now();

    getRfqs(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setLastUpdated(data.serverTime);
          setError('');
          const clock = createClockSample(data.serverTime, sentAt, performance.now());
          const now = getServerNow(clock, performance.now());
          setRfqs(data.rfqs.map((rfq) => ({ ...rfq, status: getAuctionStatus(rfq, now) })));
          const boundaries = data.rfqs.map((rfq) => getNextBoundary(rfq, now)).filter((value) => value !== null);
          if (boundaries.length) {
            boundaryTimer = setTimeout(() => setRefreshId((value) => value + 1), Math.min(2147483647, Math.max(0, Math.min(...boundaries) - now) + 50));
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
      clearTimeout(boundaryTimer);
    };
  }, [refreshId]);

  function refresh() {
    setIsLoading(true);
    setError('');
    setRefreshId((previous) => previous + 1);
  }

  return (
    <>
      <div className="page-heading page-heading--actions">
        <div>
          <h1>Auctions</h1>
          <p>British auctions and supplier quotes.</p>
        </div>
        <div className="live-actions">
          <span className="connection-state" role="status">{connection === 'live' ? 'Live updates on' : connection === 'connecting' ? 'Connecting...' : 'Reconnecting · Refresh available'}</span>
          <button className="button" onClick={refresh} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      {error && <div className="notice notice--error" role="alert">{error}</div>}
      {isLoading && rfqs.length === 0 && <p className="loading-state" role="status">Loading auctions...</p>}
      {!isLoading && !error && rfqs.length === 0 && (
        <section className="empty-state" aria-labelledby="empty-heading">
          <h2 id="empty-heading">No British auctions yet</h2>
          <p>Create an RFQ with British Auction enabled to start collecting quotes.</p>
          <Link className="button button--primary" to="/rfqs/new">Create your first RFQ</Link>
        </section>
      )}
      {rfqs.length > 0 && (
        <>
          <div className="table-wrapper" role="region" aria-label="Auctions table" tabIndex={0}>
            <table className="auction-table" aria-busy={isLoading}>
              <caption className="sr-only">British auctions, current lowest bids, and closing times</caption>
              <thead>
                <tr>
                  <th scope="col">RFQ</th>
                  <th scope="col" className="number-cell">Lowest bid</th>
                  <th scope="col">Bid closes</th>
                  <th scope="col">Forced close</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td className="rfq-cell">
                      <Link to={`/rfqs/${rfq.id}`}>{rfq.name}</Link>
                      <span className="reference-id">{rfq.referenceId}</span>
                    </td>
                    <td className="number-cell">
                      {rfq.lowestBid === null ? <span className="muted">No bids</span> : formatMoney(rfq.lowestBid, rfq.currency)}
                    </td>
                    <td><time dateTime={rfq.currentCloseTime}>{formatDateTime(rfq.currentCloseTime)}</time></td>
                    <td><time dateTime={rfq.forcedCloseTime}>{formatDateTime(rfq.forcedCloseTime)}</time></td>
                    <td><StatusBadge status={rfq.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-scroll-hint">Scroll sideways to see all columns.</p>
          <div className="table-footer">
            <span>{rfqs.length} {rfqs.length === 1 ? 'auction' : 'auctions'}</span>
            <span>Updated {formatDateTime(lastUpdated)}</span>
          </div>
        </>
      )}
      <p className="page-note">Times are shown in your local time ({timeZone}).</p>
    </>
  );
}
