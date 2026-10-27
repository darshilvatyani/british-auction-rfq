import * as rfqQueries from '../db/rfqQueries.js';
import { validateRfq } from '../validation/rfqValidation.js';
import { createHttpError } from '../utils/httpError.js';
import { formatRfq } from '../utils/formatRfq.js';
import { parseId } from '../utils/parseId.js';
import { publishAuctionUpdate } from '../sockets/auctionSocket.js';

export async function createRfq(body) {
  const { data, errors } = validateRfq(body);

  if (Object.keys(errors).length) {
    throw createHttpError(400, 'Please check the RFQ fields.', errors);
  }

  const row = await rfqQueries.insertRfq(data);
  publishAuctionUpdate(row.id, 'RFQ_CREATED');
  const now = new Date();
  return { rfq: formatRfq(row, now), serverTime: now.toISOString() };
}

export async function getRfqs() {
  const rows = await rfqQueries.listRfqs();
  const now = new Date();
  return { rfqs: rows.map((row) => formatRfq(row, now)), serverTime: now.toISOString() };
}

export async function getRfq(id) {
  const row = await rfqQueries.findRfqById(parseId(id, 'RFQ ID'));

  if (!row) {
    throw createHttpError(404, 'RFQ not found.');
  }

  const now = new Date();
  return { rfq: formatRfq(row, now), serverTime: now.toISOString() };
}
