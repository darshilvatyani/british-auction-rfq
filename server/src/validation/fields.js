const timestampPattern = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const leapYear = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

export function readTimestamp(value, field, errors) {
  if (typeof value !== 'string' || !timestampPattern.test(value) || !isValidDate(value.slice(0, 10))) {
    errors[field] = 'Use an ISO date and time with seconds and a timezone, such as 2026-11-01T10:00:00+05:30.';
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    errors[field] = 'Enter a valid date and time.';
    return null;
  }

  return date;
}

export function readText(value, field, maxLength, errors) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    errors[field] = `Enter between 1 and ${maxLength} characters.`;
    return '';
  }

  return value.trim();
}
