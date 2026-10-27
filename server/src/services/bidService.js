import pool from '../db/pool.js';
import { getDatabaseTime } from '../db/clock.js';
import * as bidQueries from '../db/bidQueries.js';
import * as activityQueries from '../db/activityQueries.js';
import { lockRfq, updateRfqAfterBid } from '../db/rfqQueries.js';
import { findSupplierById } from '../db/supplierQueries.js';
import { validateBid } from '../validation/bidValidation.js';
import { createHttpError } from '../utils/httpError.js';
import { parseId } from '../utils/parseId.js';
import { formatBid } from '../utils/formatBid.js';
import { formatRfq } from '../utils/formatRfq.js';
import { getSupplierRanks, getAuctionExtension, isBiddingOpen } from './auctionService.js';
import { publishAuctionUpdate } from '../sockets/auctionSocket.js';

function matchesSubmission(bid, data) {
  return bid.carrierName === data.carrierName
    && bid.freightCharges === data.freightCharges
    && bid.originCharges === data.originCharges
    && bid.destinationCharges === data.destinationCharges
    && bid.transitDays === data.transitDays
    && bid.quoteValidUntil === data.quoteValidUntil.toISOString();
}

function buildResponse(row, bid, rankings, extension, replayed, time) {
  const rfq = formatRfq(row, time);
  rfq.lowestBid = rankings[0]?.totalAmount ?? null;
  return { bid, rankings, rfq, extension, replayed, serverTime: time.toISOString() };
}

export async function submitBid(rfqId, body) {
  const id = parseId(rfqId, 'RFQ ID');
  const { data, errors } = validateBid(body);

  if (Object.keys(errors).length) {
    throw createHttpError(400, 'Please check the quote fields.', errors);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const row = await lockRfq(id, client);

    if (!row) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const existing = await bidQueries.findBidByRequest(id, data.supplierId, data.requestId, client);

    if (existing) {
      const bid = formatBid(existing);

      if (!matchesSubmission(bid, data)) {
        throw createHttpError(409, 'This request ID was already used for a different quote.');
      }

      const currentBids = await bidQueries.getCurrentBids(id, client);
      const rankings = getSupplierRanks(currentBids.map(formatBid));
      const extension = await activityQueries.findBidExtension(bid.id, client);
      const time = await getDatabaseTime(client);
      const result = buildResponse(row, bid, rankings, extension, true, time);
      await client.query('COMMIT');
      return result;
    }

    const supplier = await findSupplierById(data.supplierId, client);

    if (!supplier) {
      throw createHttpError(404, 'Supplier not found.');
    }

    const currentBids = await bidQueries.getCurrentBids(id, client);
    const previousRanks = getSupplierRanks(currentBids.map(formatBid));
    const previousQuote = previousRanks.find((bid) => bid.supplierId === data.supplierId);

    // Read the wall clock after waiting for the RFQ lock, immediately before acceptance.
    const bidTime = await getDatabaseTime(client);
    const rfq = formatRfq(row, bidTime);

    if (!isBiddingOpen(rfq, bidTime)) {
      throw createHttpError(409, rfq.status === 'Upcoming' ? 'Bidding has not started yet.' : 'Bidding is closed.');
    }

    if (data.quoteValidUntil <= bidTime) {
      throw createHttpError(400, 'Please check the quote fields.', {
        quoteValidUntil: 'Quote validity must be later than the submission time.',
      });
    }

    if (previousQuote && data.totalAmount >= previousQuote.totalAmount) {
      throw createHttpError(400, 'A revised quote must be lower than your previous accepted total.', {
        totalAmount: 'Lower your previous total to submit a revised quote.',
      });
    }

    const inserted = await bidQueries.insertBid(id, data, bidTime, client);
    const bid = formatBid({ ...inserted, supplier_name: supplier.name, supplier_code: supplier.code });
    const nextRanks = getSupplierRanks([
      ...previousRanks.filter((quote) => quote.supplierId !== data.supplierId),
      bid,
    ]);
    const extension = getAuctionExtension(rfq, bidTime, previousRanks, nextRanks);
    const updated = await updateRfqAfterBid(id, extension?.newCloseTime ?? rfq.currentCloseTime, bidTime, client);

    await activityQueries.recordBidActivity(id, bid.id, supplier, bidTime, client);

    if (extension) {
      await activityQueries.recordExtension(id, bid.id, supplier.id, extension, bidTime, client);
    }

    const serverTime = await getDatabaseTime(client);
    const result = buildResponse(updated, bid, nextRanks, extension, false, serverTime);
    await client.query('COMMIT');
    publishAuctionUpdate(id, 'BID_SUBMITTED');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
