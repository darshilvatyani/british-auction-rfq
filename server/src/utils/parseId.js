import { createHttpError } from './httpError.js';

export function parseId(value, label) {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw createHttpError(400, `${label} must be a positive integer up to 2147483647.`);
  }

  return Number(value);
}
