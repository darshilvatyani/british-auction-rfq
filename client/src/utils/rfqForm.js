import { parseLocalDateTime } from './formatDate.js';

export const initialRfqValues = {
  name: '',
  referenceId: '',
  currency: 'INR',
  pickupDate: '',
  bidStartTime: '',
  bidCloseTime: '',
  britishAuctionEnabled: true,
  forcedCloseTime: '',
  triggerWindowMinutes: '10',
  extensionMinutes: '5',
  extensionTrigger: 'ANY_BID',
};

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getRfqErrors(values) {
  const errors = {};

  if (!values.name.trim() || values.name.trim().length > 150) {
    errors.name = 'Enter an RFQ name, up to 150 characters.';
  }

  if (!values.referenceId.trim() || values.referenceId.trim().toUpperCase().length > 60) {
    errors.referenceId = 'Enter a reference ID, up to 60 characters.';
  }

  if (!/^[A-Z]{3}$/.test(values.currency)) {
    errors.currency = 'Choose a currency.';
  }

  if (!isValidDate(values.pickupDate)) {
    errors.pickupDate = 'Choose a valid pickup or service date.';
  }

  const start = parseLocalDateTime(values.bidStartTime);
  const close = parseLocalDateTime(values.bidCloseTime);

  if (!start) {
    errors.bidStartTime = 'Choose a valid bid start date and time.';
  }

  if (!close) {
    errors.bidCloseTime = 'Choose a valid bid close date and time.';
  } else if (start && close <= start) {
    errors.bidCloseTime = 'Bid close time must be later than bid start time.';
  }

  if (values.britishAuctionEnabled) {
    const forced = parseLocalDateTime(values.forcedCloseTime);

    if (!forced) {
      errors.forcedCloseTime = 'Choose a valid forced close date and time.';
    } else if (close && forced <= close) {
      errors.forcedCloseTime = 'Forced close time must be later than bid close time.';
    }

    for (const field of ['triggerWindowMinutes', 'extensionMinutes']) {
      const value = Number(values[field]);

      if (!Number.isInteger(value) || value <= 0 || value > 2147483647) {
        errors[field] = 'Enter a positive whole number of minutes.';
      }
    }

    if (!['ANY_BID', 'ANY_RANK_CHANGE', 'L1_CHANGE'].includes(values.extensionTrigger)) {
      errors.extensionTrigger = 'Choose an extension trigger.';
    }
  }

  return errors;
}

export function buildRfqPayload(values) {
  const data = {
    name: values.name.trim(),
    referenceId: values.referenceId.trim().toUpperCase(),
    currency: values.currency,
    pickupDate: values.pickupDate,
    bidStartTime: parseLocalDateTime(values.bidStartTime).toISOString(),
    bidCloseTime: parseLocalDateTime(values.bidCloseTime).toISOString(),
    britishAuctionEnabled: values.britishAuctionEnabled,
  };

  if (values.britishAuctionEnabled) {
    data.forcedCloseTime = parseLocalDateTime(values.forcedCloseTime).toISOString();
    data.triggerWindowMinutes = Number(values.triggerWindowMinutes);
    data.extensionMinutes = Number(values.extensionMinutes);
    data.extensionTrigger = values.extensionTrigger;
  }

  return data;
}
