/**
 * Centralized Express error handler.
 * Must be registered as the LAST middleware in server.js.
 */
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

    const status = err.statusCode || err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
