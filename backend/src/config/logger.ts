import pino from 'pino';
import { config } from './index.js';

export const logger = pino({
  level: config.logLevel,
  transport: config.isDev()
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
    censor: '[REDACTED]',
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      ip: req.ip,
    }),
    err: pino.stdSerializers.err,
  },
});
