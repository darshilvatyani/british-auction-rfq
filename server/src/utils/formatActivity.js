export function formatActivity(row) {
  return {
    id: row.id,
    rfqId: row.rfq_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierCode: row.supplier_code,
    bidId: row.bid_id,
    eventType: row.event_type,
    reason: row.reason,
    previousCloseTime: row.previous_close_time?.toISOString() ?? null,
    newCloseTime: row.new_close_time?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}
