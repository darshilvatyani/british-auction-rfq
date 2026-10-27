import pool from '../db/pool.js';
import { findExpiredRfqs, lockRfq, markRfqClosed } from '../db/rfqQueries.js';
import { recordClosure } from '../db/activityQueries.js';
import { publishAuctionUpdate } from '../sockets/auctionSocket.js';

export async function closeAuction(rfqId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const row = await lockRfq(rfqId, client);

    if (!row || row.closed_at) {
      await client.query('COMMIT');
      return null;
    }

    // A bid may have extended the deadline while this transaction waited for the lock.
    const closed = await markRfqClosed(rfqId, client);

    if (closed) {
      await recordClosure(closed, client);
    }

    await client.query('COMMIT');
    if (closed) {
      publishAuctionUpdate(rfqId, 'AUCTION_CLOSED');
    }
    return closed ? {
      rfqId: closed.id,
      closedAt: closed.closed_at.toISOString(),
      closeReason: closed.close_reason,
    } : null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closeExpiredAuctions() {
  const expired = await findExpiredRfqs();
  const closed = [];
  const errors = [];

  for (const rfq of expired) {
    try {
      const result = await closeAuction(rfq.id);

      if (result) {
        closed.push(result);
      }
    } catch (err) {
      errors.push(new Error(`Could not close RFQ ${rfq.id}.`, { cause: err }));
    }
  }

  if (errors.length) {
    throw new AggregateError(errors, 'Some expired auctions could not be closed.');
  }

  return closed;
}
