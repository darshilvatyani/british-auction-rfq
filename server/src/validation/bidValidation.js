import { readText, readTimestamp } from './fields.js';
import { calculateQuoteTotal } from '../services/auctionService.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateBid(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Send a quote object.' } };
  }

  const errors = {};
  const data = {
    supplierId: body.supplierId,
    requestId: body.requestId,
    carrierName: readText(body.carrierName, 'carrierName', 150, errors),
    freightCharges: body.freightCharges,
    originCharges: body.originCharges,
    destinationCharges: body.destinationCharges,
    transitDays: body.transitDays,
    quoteValidUntil: readTimestamp(body.quoteValidUntil, 'quoteValidUntil', errors),
  };

  if (!Number.isInteger(data.supplierId) || data.supplierId <= 0 || data.supplierId > 2147483647) {
    errors.supplierId = 'Enter a positive supplier ID up to 2147483647.';
  }

  if (typeof data.requestId !== 'string' || !uuidPattern.test(data.requestId)) {
    errors.requestId = 'Provide a UUID request ID for this submission.';
  } else {
    data.requestId = data.requestId.toLowerCase();
  }

  for (const field of ['freightCharges', 'originCharges', 'destinationCharges']) {
    if (!Number.isSafeInteger(data[field]) || data[field] < 0) {
      errors[field] = 'Enter a non-negative whole number in minor units, up to 9007199254740991.';
    }
  }

  if (!Number.isInteger(data.transitDays) || data.transitDays <= 0 || data.transitDays > 2147483647) {
    errors.transitDays = 'Enter a positive whole number of transit days, up to 2147483647.';
  }

  if (!errors.freightCharges && !errors.originCharges && !errors.destinationCharges) {
    try {
      data.totalAmount = calculateQuoteTotal(data);
    } catch (err) {
      errors.totalAmount = err.message;
    }
  }

  return { data, errors };
}
