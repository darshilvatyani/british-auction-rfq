import { parseMoneyInput } from './formatMoney.js';
import { parseLocalDateTime } from './formatDate.js';

export const initialBidValues = {
  supplierId: '', carrierName: '', freightCharges: '', originCharges: '0',
  destinationCharges: '0', transitDays: '', quoteValidUntil: '',
};

export function getQuoteTotal(values, currency) {
  const amounts = ['freightCharges', 'originCharges', 'destinationCharges']
    .map((field) => parseMoneyInput(values[field], currency));
  if (amounts.some((amount) => amount === null)) return null;
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  return Number.isSafeInteger(total) ? total : null;
}

export function getBidErrors(values, currency, now, previousQuote, isRetry = false) {
  const errors = {};
  const supplierId = Number(values.supplierId);
  if (!Number.isInteger(supplierId) || supplierId <= 0 || supplierId > 2147483647) {
    errors.supplierId = 'Choose a supplier.';
  }
  if (!values.carrierName.trim() || values.carrierName.trim().length > 150) {
    errors.carrierName = 'Enter a carrier name, up to 150 characters.';
  }
  for (const field of ['freightCharges', 'originCharges', 'destinationCharges']) {
    if (parseMoneyInput(values[field], currency) === null) {
      errors[field] = 'Enter a non-negative amount using the currency decimal places.';
    }
  }
  const total = getQuoteTotal(values, currency);
  if (total === null || total <= 0) {
    errors.totalAmount = 'Enter a positive total within the supported amount limit.';
  } else if (!isRetry && previousQuote && total >= previousQuote.totalAmount) {
    errors.totalAmount = 'Your revised total must be lower than your current quote.';
  }
  const days = Number(values.transitDays);
  if (!Number.isInteger(days) || days <= 0 || days > 2147483647) {
    errors.transitDays = 'Enter a positive whole number of transit days.';
  }
  const validity = parseLocalDateTime(values.quoteValidUntil);
  if (!validity || (!isRetry && validity.getTime() <= now)) {
    errors.quoteValidUntil = 'Choose a quote validity later than the current time.';
  }
  return errors;
}

export function buildBidPayload(values, currency) {
  return {
    supplierId: Number(values.supplierId),
    carrierName: values.carrierName.trim(),
    freightCharges: parseMoneyInput(values.freightCharges, currency),
    originCharges: parseMoneyInput(values.originCharges, currency),
    destinationCharges: parseMoneyInput(values.destinationCharges, currency),
    transitDays: Number(values.transitDays),
    quoteValidUntil: parseLocalDateTime(values.quoteValidUntil).toISOString(),
  };
}
