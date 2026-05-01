const { createLogger, format, transports } = require("winston");
const onHeaders = require("on-headers");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const env = process.env.NODE_ENV || "development";
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
const isNetlify = !!process.env.NETLIFY;
const isServerless = isVercel || isNetlify;
const logDir = "logs";

const logFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  let msg = `[${timestamp}] ${level}: ${message}`;
  if (Object.keys(meta).length) {
    msg += ` | meta: ${JSON.stringify(meta)}`;
  }
  return msg;
});

// Create logger with appropriate transports based on environment
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports: [],
});

// In serverless/production, only use console transport (read-only filesystem)
if (isServerless || env === "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
} else {
  // In development, use file transports
  logger.add(
    new DailyRotateFile({
      filename: path.join(logDir, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    })
  );
  logger.add(
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      level: "error",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    })
  );
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  onHeaders(res, function () {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

module.exports = loggerMiddleware;
