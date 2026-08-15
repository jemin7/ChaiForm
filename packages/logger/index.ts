import winston from "winston";

const isDevelopment = process.env.NODE_ENV === "development";

const loggerFormat = isDevelopment
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString =
          Object.keys(meta).length > 0
            ? `\n${JSON.stringify(meta, null, 2)}`
            : "";

        return `${timestamp} [${level}]: ${message}${metaString}`;
      }),
    )
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    );

export const logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",

  format: loggerFormat,

  transports: [
    new winston.transports.Console(),
  ],
});