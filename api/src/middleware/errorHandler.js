'use strict';

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      status: 404,
      message: `No API route matches ${req.method} ${req.originalUrl}.`
    }
  });
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const safeMessage = status >= 500 && error.expose !== true
    ? 'The server could not complete the request.'
    : error.message;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      status,
      message: safeMessage,
      ...(error.details ? { details: error.details } : {})
    }
  });
}

module.exports = { errorHandler, notFoundHandler };
