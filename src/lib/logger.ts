import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["password", "token", "email", "cookie", "authorization", "databaseUrl",
      "*.password", "*.token", "*.email", "req.headers.authorization", "req.headers.cookie"],
    censor: "[redacted]",
  },
});
