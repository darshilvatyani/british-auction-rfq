export function createClockSample(serverTime, sentAt, receivedAt) {
  const time = Date.parse(serverTime);

  if (!Number.isFinite(time)) {
    throw new Error('The server returned an invalid time. Please refresh.');
  }

  return {
    serverTime: time + Math.max(0, receivedAt - sentAt) / 2,
    sampledAt: receivedAt,
  };
}

export function getServerNow(clock, monotonicNow) {
  return clock.serverTime + Math.max(0, monotonicNow - clock.sampledAt);
}

export function getAuctionStatus(rfq, now) {
  if (rfq.closedAt) {
    return rfq.closeReason === 'FORCED' ? 'Force Closed' : 'Closed';
  }

  if (now < Date.parse(rfq.bidStartTime)) return 'Upcoming';
  const close = Date.parse(rfq.currentCloseTime);
  const forced = rfq.britishAuctionEnabled ? Date.parse(rfq.forcedCloseTime) : Infinity;
  if (now < Math.min(close, forced)) return 'Active';

  return rfq.britishAuctionEnabled && close >= forced
    ? 'Force Closed' : 'Closed';
}

export function getNextBoundary(rfq, now) {
  if (rfq.closedAt) return null;
  if (now < Date.parse(rfq.bidStartTime)) return Date.parse(rfq.bidStartTime);
  const close = rfq.britishAuctionEnabled
    ? Math.min(Date.parse(rfq.currentCloseTime), Date.parse(rfq.forcedCloseTime))
    : Date.parse(rfq.currentCloseTime);
  if (now < close) return close;
  return null;
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  return days ? `${days}d ${time}` : time;
}
