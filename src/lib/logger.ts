// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // ห้ามให้ field เหล่านี้หลุดออกไปใน log เด็ดขาดเพื่อความปลอดภัย
  redact: ['req.headers.authorization', '*.password', '*.token', '*.email'],
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty' },
  }),
});