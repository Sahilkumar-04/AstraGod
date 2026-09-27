/**
 * AstraGod — Server Entry Point
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const chatRoutes = require('./routes/chat');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Security & parsing ----------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  })
);

app.use(express.json({ limit: '1mb' }));

// Basic rate limiting on the AI endpoint to prevent abuse.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again shortly.',
    },
  },
});
app.use('/api/', limiter);

// ---------- API routes ----------
app.use('/api', chatRoutes);

// ---------- Static frontend ----------
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ---------- Error handling ----------
app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`⚡ AstraGod is running at http://localhost:${PORT}`);
  if (!process.env.AI_API_KEY || !process.env.AI_API_URL) {
    console.warn(
      '⚠️  AI_API_KEY / AI_API_URL are not set. Chat requests will fail until you configure your .env file.'
    );
  }
});

module.exports = app;
