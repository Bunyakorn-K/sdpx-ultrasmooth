// src/middleware/logging.ts
import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger';

export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  req.id = req.headers['x-request-id'] ?? randomUUID();
  res.setHeader('x-request-id', req.id);

  res.on('finish', () => {
    logger.info({
      event: 'http_request',
      requestId: req.id,
      method: req.method,
      path: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      duration_ms: Date.now() - start,
      userId: req.user?.id,
    });
  });

  if (next) next();
}