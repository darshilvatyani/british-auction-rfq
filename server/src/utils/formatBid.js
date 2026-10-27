export function formatBid(row) {
  return {
    id: row.id,
    rfqId: row.rfq_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierCode: row.supplier_code,
    requestId: row.request_id,
    carrierName: row.carrier_name,
    freightCharges: Number(row.freight_charges),
    originCharges: Number(row.origin_charges),
    destinationCharges: Number(row.destination_charges),
    totalAmount: Number(row.total_amount),
    transitDays: row.transit_days,
    quoteValidUntil: row.quote_valid_until.toISOString(),
    submittedAt: row.submitted_at.toISOString(),
  };
}
