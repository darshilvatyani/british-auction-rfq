export default function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || 500;
  let message = status >= 500 ? 'Something went wrong.' : err.message;
  let errors = err.errors;

  if (err.code === '23505' && err.constraint === 'rfqs_reference_id_key') {
    status = 409;
    message = 'An RFQ with this reference ID already exists.';
    errors = { referenceId: message };
  } else if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '57P03', '53300'].includes(err.code)) {
    status = 503;
    message = 'Database is unavailable. Please try again later.';
  } else if (err.code === '42P01') {
    status = 503;
    message = 'Database is not initialized. Run the database migrations first.';
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ message, ...(errors ? { errors } : {}) });
}
