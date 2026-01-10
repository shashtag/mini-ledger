import winston from 'winston';

const { combine, timestamp, json, printf, colorize } = winston.format;

// Custom format for local development (readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Default to info, can be set via ENV
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Default to JSON for production (easy parsing by Splunk/Datadog)
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? combine(timestamp(), json()) 
        : combine(colorize(), timestamp(), devFormat),
    }),
  ],
});
