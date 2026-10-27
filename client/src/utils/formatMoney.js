export function currencyDigits(currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
}

export function parseMoneyInput(value, currency = 'INR') {
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const digits = currencyDigits(currency);
  if (fraction.length > digits) return null;

  const amount = BigInt(whole || '0') * (10n ** BigInt(digits)) + BigInt(fraction.padEnd(digits, '0') || '0');
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}

export function formatMoneyInput(amount, currency = 'INR') {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Invalid currency amount.');
  const digits = currencyDigits(currency);
  const divisor = 10n ** BigInt(digits);
  const value = BigInt(amount);
  const whole = value / divisor;
  return digits ? `${whole}.${String(value % divisor).padStart(digits, '0')}` : String(whole);
}

export function formatMoney(amount, currency = 'INR') {
  if (amount === null || amount === undefined) {
    return '—';
  }

  const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
  return formatter.format(formatMoneyInput(amount, currency));
}
