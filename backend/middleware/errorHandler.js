/**
 * AstraGod — Centralized Error Handler
 * Ensures the API never crashes and never leaks internals to the client.
 */

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    status === 500
      ? "AstraGod couldn't complete that request. Please try again."
      : err.message || 'Something went wrong.';

  if (status === 500) {
    // Log full detail server-side only.
    console.error('[AstraGod] Unhandled error:', err);
  }

  res.status(status).json({ error: { code, message } });
}

module.exports = { notFoundHandler, errorHandler };
