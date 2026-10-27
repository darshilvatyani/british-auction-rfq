export async function findBidByRequest(rfqId, supplierId, requestId, client) {
  const result = await client.query(`
    SELECT bids.*, suppliers.name AS supplier_name, suppliers.code AS supplier_code
    FROM bids
    JOIN suppliers ON suppliers.id = bids.supplier_id
    WHERE bids.rfq_id = $1 AND bids.supplier_id = $2 AND bids.request_id = $3
  `, [rfqId, supplierId, requestId]);
  return result.rows[0];
}

export async function getCurrentBids(rfqId, client) {
  const result = await client.query(`
    SELECT DISTINCT ON (bids.supplier_id)
      bids.*, suppliers.name AS supplier_name, suppliers.code AS supplier_code
    FROM bids
    JOIN suppliers ON suppliers.id = bids.supplier_id
    WHERE bids.rfq_id = $1
    ORDER BY bids.supplier_id, bids.submitted_at DESC, bids.id DESC
  `, [rfqId]);
  return result.rows;
}

export async function insertBid(rfqId, bid, submittedAt, client) {
  const result = await client.query(`
    INSERT INTO bids (
      rfq_id, supplier_id, request_id, carrier_name, freight_charges,
      origin_charges, destination_charges, transit_days, quote_valid_until, submitted_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    rfqId, bid.supplierId, bid.requestId, bid.carrierName, bid.freightCharges,
    bid.originCharges, bid.destinationCharges, bid.transitDays, bid.quoteValidUntil, submittedAt,
  ]);
  return result.rows[0];
}

export async function getBidHistory(rfqId, client) {
  const result = await client.query(`
    SELECT bids.*, suppliers.name AS supplier_name, suppliers.code AS supplier_code
    FROM bids
    JOIN suppliers ON suppliers.id = bids.supplier_id
    WHERE bids.rfq_id = $1
    ORDER BY bids.submitted_at DESC, bids.id DESC
  `, [rfqId]);
  return result.rows;
}
