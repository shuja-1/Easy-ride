export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Something went wrong';

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }
  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `This ${field} is already registered`;
  }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Validation failed';
  }
  if (err.name === 'MulterError') {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large. Maximum size is 5 MB'
        : err.field || err.message;
  }
  if (status < 400) status = 500;

  if (process.env.NODE_ENV !== 'production') {
    console.error(`${req.method} ${req.originalUrl} →`, err.message);
  }

  res.status(status).json({ message });
};

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
