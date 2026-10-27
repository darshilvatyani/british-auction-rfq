import { isValidDate, readText, readTimestamp } from './fields.js';

const extensionTriggers = ['ANY_BID', 'ANY_RANK_CHANGE', 'L1_CHANGE'];

function readMinutes(value, field, errors) {
  if (!Number.isInteger(value) || value <= 0 || value > 2147483647) {
    errors[field] = 'Enter a positive whole number of minutes, up to 2147483647.';
    return null;
  }

  return value;
}

export function validateRfq(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Send an RFQ object.' } };
  }

  const errors = {};
  const data = {
    name: readText(body.name, 'name', 150, errors),
    referenceId: readText(body.referenceId, 'referenceId', 60, errors).toUpperCase(),
    bidStartTime: readTimestamp(body.bidStartTime, 'bidStartTime', errors),
    bidCloseTime: readTimestamp(body.bidCloseTime, 'bidCloseTime', errors),
    pickupDate: body.pickupDate,
    currency: body.currency === undefined ? 'INR' : body.currency,
    britishAuctionEnabled: body.britishAuctionEnabled === undefined ? true : body.britishAuctionEnabled,
    forcedCloseTime: null,
    triggerWindowMinutes: null,
    extensionMinutes: null,
    extensionTrigger: null,
  };

  if (data.referenceId.length > 60) {
    errors.referenceId = 'Reference ID must be at most 60 characters after conversion to uppercase.';
  }

  if (!isValidDate(data.pickupDate)) {
    errors.pickupDate = 'Enter a valid date in YYYY-MM-DD format.';
  }

  if (typeof data.currency !== 'string' || !/^[A-Za-z]{3}$/.test(data.currency)) {
    errors.currency = 'Enter a three-letter currency code, such as INR.';
  } else {
    data.currency = data.currency.toUpperCase();
  }

  if (typeof data.britishAuctionEnabled !== 'boolean') {
    errors.britishAuctionEnabled = 'Use true or false.';
  }

  if (data.bidStartTime && data.bidCloseTime && data.bidStartTime >= data.bidCloseTime) {
    errors.bidCloseTime = 'Bid close time must be later than bid start time.';
  }

  if (data.britishAuctionEnabled === true) {
    data.forcedCloseTime = readTimestamp(body.forcedCloseTime, 'forcedCloseTime', errors);
    data.triggerWindowMinutes = readMinutes(body.triggerWindowMinutes, 'triggerWindowMinutes', errors);
    data.extensionMinutes = readMinutes(body.extensionMinutes, 'extensionMinutes', errors);
    data.extensionTrigger = body.extensionTrigger;

    if (!extensionTriggers.includes(data.extensionTrigger)) {
      errors.extensionTrigger = `Choose ${extensionTriggers.join(', ')}.`;
    }

    if (data.forcedCloseTime && data.bidCloseTime && data.forcedCloseTime <= data.bidCloseTime) {
      errors.forcedCloseTime = 'Forced close time must be later than bid close time.';
    }
  }

  return { data, errors };
}
