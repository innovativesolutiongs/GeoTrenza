const pino = require('pino');

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Shim shape (event, payload) preserved from Phase B so handler call sites are unchanged.
// Pino-native shape becomes a single JSON object with `event` + payload fields hoisted.
const logger = {
  info: (event, payload = {}) => pinoLogger.info({ event, ...payload }),
  warn: (event, payload = {}) => pinoLogger.warn({ event, ...payload }),
  error: (event, payload = {}) => pinoLogger.error({ event, ...payload }),
};

module.exports = logger;
