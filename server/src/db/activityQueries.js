export async function recordBidActivity(rfqId, bidId, supplier, time, client) {
  await client.query(`
    INSERT INTO activities (rfq_id, supplier_id, bid_id, event_type, reason, created_at)
    VALUES ($1, $2, $3, 'BID_SUBMITTED', $4, $5)
  `, [rfqId, supplier.id, bidId, `Quote submitted by ${supplier.name}.`, time]);
}

export async function recordExtension(rfqId, bidId, supplierId, extension, time, client) {
  await client.query(`
    INSERT INTO activities (
      rfq_id, supplier_id, bid_id, event_type, reason,
      previous_close_time, new_close_time, created_at
    )
    VALUES ($1, $2, $3, 'AUCTION_EXTENDED', $4, $5, $6, $7)
  `, [
    rfqId, supplierId, bidId, extension.reason,
    extension.previousCloseTime, extension.newCloseTime, time,
  ]);
}

export async function findBidExtension(bidId, client) {
  const result = await client.query(`
    SELECT reason, previous_close_time, new_close_time
    FROM activities
    WHERE bid_id = $1 AND event_type = 'AUCTION_EXTENDED'
    ORDER BY id
    LIMIT 1
  `, [bidId]);
  const row = result.rows[0];
  return row ? {
    reason: row.reason,
    previousCloseTime: row.previous_close_time.toISOString(),
    newCloseTime: row.new_close_time.toISOString(),
  } : null;
}

export async function recordClosure(rfq, client) {
  const reason = rfq.close_reason === 'FORCED'
    ? 'Auction reached its forced close time.'
    : 'Auction reached its bid close time.';

  await client.query(`
    INSERT INTO activities (rfq_id, event_type, reason, created_at)
    SELECT id, 'AUCTION_CLOSED', $2, closed_at FROM rfqs WHERE id = $1
  `, [rfq.id, reason]);
}

export async function getActivityHistory(rfqId, client) {
  const result = await client.query(`
    SELECT activities.*, suppliers.name AS supplier_name, suppliers.code AS supplier_code
    FROM activities
    LEFT JOIN suppliers ON suppliers.id = activities.supplier_id
    WHERE activities.rfq_id = $1
    ORDER BY activities.created_at DESC, activities.id DESC
  `, [rfqId]);
  return result.rows;
}
