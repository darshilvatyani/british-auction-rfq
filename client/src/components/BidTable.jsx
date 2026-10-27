import { formatMoney } from '../utils/formatMoney.js';
import { formatDateTime } from '../utils/formatDate.js';

export default function BidTable({ bids, currency, history = false }) {
  if (bids.length === 0) {
    return <p className="section-note">{history ? 'No submissions yet.' : 'No supplier quotes yet.'}</p>;
  }

  return (
    <>
      <div className="table-wrapper" role="region" aria-label={history ? 'Bid history table' : 'Supplier rankings table'} tabIndex={0}>
        <table className="auction-table bid-table">
          <caption className="sr-only">{history ? 'All accepted quote submissions' : 'Current supplier quotes sorted by total price'}</caption>
          <thead>
            <tr>
              {!history && <th scope="col">Rank</th>}
              <th scope="col">Supplier / carrier</th>
              <th scope="col" className="number-cell">Freight</th>
              <th scope="col" className="number-cell">Origin</th>
              <th scope="col" className="number-cell">Destination</th>
              <th scope="col" className="number-cell">Total</th>
              <th scope="col">Transit</th>
              <th scope="col">Quote valid until</th>
              {history && <th scope="col">Submitted</th>}
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => (
              <tr key={bid.id}>
                {!history && <td><strong>{bid.rank}</strong></td>}
                <td><strong>{bid.supplierName}</strong><span className="reference-id">{bid.carrierName}</span></td>
                <td className="number-cell">{formatMoney(bid.freightCharges, currency)}</td>
                <td className="number-cell">{formatMoney(bid.originCharges, currency)}</td>
                <td className="number-cell">{formatMoney(bid.destinationCharges, currency)}</td>
                <td className="number-cell"><strong>{formatMoney(bid.totalAmount, currency)}</strong></td>
                <td>{bid.transitDays} {bid.transitDays === 1 ? 'day' : 'days'}</td>
                <td><time dateTime={bid.quoteValidUntil}>{formatDateTime(bid.quoteValidUntil)}</time></td>
                {history && <td><time dateTime={bid.submittedAt}>{formatDateTime(bid.submittedAt)}</time></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-scroll-hint">Scroll sideways to see all quote details.</p>
    </>
  );
}
