import pool from './pool.js';

const rfqFields = `
  id, name, reference_id, bid_start_time, initial_close_time, current_close_time,
  forced_close_time, pickup_date::text AS pickup_date, currency,
  british_auction_enabled, trigger_window_minutes, extension_minutes,
  extension_trigger, closed_at, close_reason, created_at, updated_at
`;

const selectRfqs = `
  SELECT ${rfqFields}, quotes.lowest_bid
  FROM rfqs
  LEFT JOIN LATERAL (
    SELECT MIN(total_amount) AS lowest_bid
    FROM (
      SELECT DISTINCT ON (supplier_id) total_amount
      FROM bids
      WHERE rfq_id = rfqs.id
      ORDER BY supplier_id, submitted_at DESC, id DESC
    ) current_quotes
  ) quotes ON TRUE
`;

export async function insertRfq(rfq) {
  const result = await pool.query(`
    INSERT INTO rfqs (
      name, reference_id, bid_start_time, initial_close_time, current_close_time,
      forced_close_time, pickup_date, currency, british_auction_enabled,
      trigger_window_minutes, extension_minutes, extension_trigger
    )
    VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING ${rfqFields}, NULL::BIGINT AS lowest_bid
  `, [
    rfq.name, rfq.referenceId, rfq.bidStartTime, rfq.bidCloseTime,
    rfq.forcedCloseTime, rfq.pickupDate, rfq.currency, rfq.britishAuctionEnabled,
    rfq.triggerWindowMinutes, rfq.extensionMinutes, rfq.extensionTrigger,
  ]);

  return result.rows[0];
}

export async function listRfqs() {
  const result = await pool.query(`
    ${selectRfqs}
    WHERE british_auction_enabled = TRUE
    ORDER BY created_at DESC, id DESC
  `);
  return result.rows;
}

export async function findRfqById(id) {
  const result = await pool.query(`${selectRfqs} WHERE id = $1`, [id]);
  return result.rows[0];
}

export async function lockRfq(id, client) {
  const result = await client.query(`
    SELECT ${rfqFields}
    FROM rfqs
    WHERE id = $1
    FOR UPDATE
  `, [id]);
  return result.rows[0];
}

export async function updateRfqAfterBid(id, closeTime, bidTime, client) {
  const result = await client.query(`
    UPDATE rfqs
    SET current_close_time = $2, updated_at = $3
    WHERE id = $1
    RETURNING ${rfqFields}
  `, [id, closeTime, bidTime]);
  return result.rows[0];
}

export async function rfqExists(id, client) {
  const result = await client.query('SELECT id FROM rfqs WHERE id = $1', [id]);
  return result.rows.length > 0;
}

export async function findExpiredRfqs() {
  const result = await pool.query(`
    SELECT id FROM rfqs
    WHERE closed_at IS NULL AND current_close_time <= NOW()
    ORDER BY current_close_time, id
  `);
  return result.rows;
}

export async function markRfqClosed(id, client) {
  const result = await client.query(`
    UPDATE rfqs
    SET closed_at = clock_timestamp(), updated_at = clock_timestamp(),
      close_reason = CASE
        WHEN british_auction_enabled AND current_close_time = forced_close_time THEN 'FORCED'
        ELSE 'NORMAL'
      END
    WHERE id = $1 AND closed_at IS NULL AND current_close_time <= clock_timestamp()
    RETURNING ${rfqFields}
  `, [id]);
  return result.rows[0];
}
