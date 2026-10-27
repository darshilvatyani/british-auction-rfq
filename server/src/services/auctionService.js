const minuteInMs = 60000;

export function calculateQuoteTotal(quote) {
  const charges = [quote.freightCharges, quote.originCharges, quote.destinationCharges];

  if (charges.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) {
    throw new RangeError('Charges must be non-negative safe integers.');
  }

  const total = charges.reduce((sum, amount) => sum + amount, 0);

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new RangeError('Quote total must be positive and at most 9007199254740991 minor units.');
  }

  return total;
}

export function getSupplierRanks(bids) {
  const currentQuotes = new Map();

  for (const bid of bids) {
    const previous = currentQuotes.get(bid.supplierId);
    const bidTime = new Date(bid.submittedAt).getTime();
    const previousTime = previous ? new Date(previous.submittedAt).getTime() : -Infinity;

    if (!previous || bidTime > previousTime || (bidTime === previousTime && bid.id > previous.id)) {
      currentQuotes.set(bid.supplierId, bid);
    }
  }

  return [...currentQuotes.values()]
    .sort((first, second) => first.totalAmount - second.totalAmount
      || new Date(first.submittedAt) - new Date(second.submittedAt)
      || first.id - second.id)
    .map((bid, index) => ({ ...bid, rank: `L${index + 1}` }));
}

export function hasRankChanged(previousRanks, nextRanks) {
  return previousRanks.length !== nextRanks.length
    || previousRanks.some((bid, index) => bid.supplierId !== nextRanks[index].supplierId);
}

export function isBiddingOpen(rfq, bidTime) {
  const time = new Date(bidTime).getTime();
  return !rfq.closedAt
    && time >= new Date(rfq.bidStartTime).getTime()
    && time < new Date(rfq.currentCloseTime).getTime()
    && (!rfq.britishAuctionEnabled || time < new Date(rfq.forcedCloseTime).getTime());
}

export function shouldExtendAuction(rfq, bidTime, previousRanks, nextRanks) {
  if (!rfq.britishAuctionEnabled || !isBiddingOpen(rfq, bidTime)) {
    return false;
  }

  const remainingTime = new Date(rfq.currentCloseTime) - new Date(bidTime);

  if (remainingTime > rfq.triggerWindowMinutes * minuteInMs) {
    return false;
  }

  switch (rfq.extensionTrigger) {
    case 'ANY_BID':
      return true;
    case 'ANY_RANK_CHANGE':
      return hasRankChanged(previousRanks, nextRanks);
    case 'L1_CHANGE':
      return previousRanks[0]?.supplierId !== nextRanks[0]?.supplierId;
    default:
      return false;
  }
}

export function getNextCloseTime(rfq) {
  const currentClose = new Date(rfq.currentCloseTime).getTime();

  if (!rfq.britishAuctionEnabled) {
    return new Date(currentClose);
  }

  return new Date(Math.min(
    currentClose + rfq.extensionMinutes * minuteInMs,
    new Date(rfq.forcedCloseTime).getTime(),
  ));
}

export function getAuctionExtension(rfq, bidTime, previousRanks, nextRanks) {
  if (!shouldExtendAuction(rfq, bidTime, previousRanks, nextRanks)) {
    return null;
  }

  const nextCloseTime = getNextCloseTime(rfq);

  if (nextCloseTime.getTime() <= new Date(rfq.currentCloseTime).getTime()) {
    return null;
  }

  const window = `${rfq.triggerWindowMinutes} ${rfq.triggerWindowMinutes === 1 ? 'minute' : 'minutes'}`;
  const reasons = {
    ANY_BID: `Bid received in the last ${window}.`,
    ANY_RANK_CHANGE: `Supplier rankings changed in the last ${window}.`,
    L1_CHANGE: `Lowest-priced supplier changed in the last ${window}.`,
  };

  return {
    reason: reasons[rfq.extensionTrigger],
    previousCloseTime: new Date(rfq.currentCloseTime).toISOString(),
    newCloseTime: nextCloseTime.toISOString(),
  };
}
