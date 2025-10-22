const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

// Apply security middleware
const applySecurity = (app) => {
  // Set security headers
  if (process.env.HELMET_ENABLED !== 'false') {
    app.use(helmet());
  }

  // Rate limiting
  app.use('/api/', limiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Data sanitization against NoSQL injection
  app.use(mongoSanitize());

  // Prevent parameter pollution
  // app.use(hpp()); // Uncomment if needed

  return app;
};

module.exports = {
  limiter,
  authLimiter,
  applySecurity
};
