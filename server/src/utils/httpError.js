export function createHttpError(status, message, errors) {
  const err = new Error(message);
  err.status = status;

  if (errors) {
    err.errors = errors;
  }

  return err;
}
