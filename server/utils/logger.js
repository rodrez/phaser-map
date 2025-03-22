import winston from 'winston';

// Create a Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...rest }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add a simple wrapper for quick logging
const log = {
  info: (category, message, meta = {}) => logger.info(message, { category, ...meta }),
  error: (category, message, meta = {}) => logger.error(message, { category, ...meta }),
  warn: (category, message, meta = {}) => logger.warn(message, { category, ...meta }),
  debug: (category, message, meta = {}) => logger.debug(message, { category, ...meta }),
};

export { logger, log };
export default logger; 