exports.errorHandler = (err, _req, res, _next) => {
  console.error('Server error:', err.stack || err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
  });
};
