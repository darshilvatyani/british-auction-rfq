export function formatRfq(row, now) {
  let status = 'Closed';
  const lowestBid = row.lowest_bid ?? null;

  if (now < row.bid_start_time) {
    status = 'Upcoming';
  } else if (now < row.current_close_time) {
    status = 'Active';
  } else if (
    row.british_auction_enabled
    && row.current_close_time.getTime() === row.forced_close_time.getTime()
  ) {
    status = 'Force Closed';
  }

  return {
    id: row.id,
    name: row.name,
    referenceId: row.reference_id,
    bidStartTime: row.bid_start_time.toISOString(),
    initialCloseTime: row.initial_close_time.toISOString(),
    currentCloseTime: row.current_close_time.toISOString(),
    forcedCloseTime: row.forced_close_time?.toISOString() ?? null,
    pickupDate: row.pickup_date,
    currency: row.currency,
    britishAuctionEnabled: row.british_auction_enabled,
    triggerWindowMinutes: row.trigger_window_minutes,
    extensionMinutes: row.extension_minutes,
    extensionTrigger: row.extension_trigger,
    lowestBid: lowestBid === null ? null : Number(lowestBid),
    status,
    closedAt: row.closed_at?.toISOString() ?? null,
    closeReason: row.close_reason,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
