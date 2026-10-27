import pool from '../db/pool.js';
import { rfqExists } from '../db/rfqQueries.js';
import { getBidHistory } from '../db/bidQueries.js';
import { getActivityHistory } from '../db/activityQueries.js';
import { getDatabaseTime } from '../db/clock.js';
import { formatBid } from '../utils/formatBid.js';
import { formatActivity } from '../utils/formatActivity.js';
import { parseId } from '../utils/parseId.js';
import { createHttpError } from '../utils/httpError.js';
import { getSupplierRanks } from './auctionService.js';

async function readHistory(rfqId, read) {
  const id = parseId(rfqId, 'RFQ ID');
  const client = await pool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

    if (!await rfqExists(id, client)) {
      throw createHttpError(404, 'RFQ not found.');
    }

    const data = await read(id, client);
    const time = await getDatabaseTime(client);
    await client.query('COMMIT');
    return { ...data, serverTime: time.toISOString() };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getBids(rfqId) {
  return readHistory(rfqId, async (id, client) => {
    const rows = await getBidHistory(id, client);
    const history = rows.map(formatBid);
    return { rankings: getSupplierRanks(history), history };
  });
}

export async function getActivities(rfqId) {
  return readHistory(rfqId, async (id, client) => {
    const rows = await getActivityHistory(id, client);
    return { activities: rows.map(formatActivity) };
  });
}
