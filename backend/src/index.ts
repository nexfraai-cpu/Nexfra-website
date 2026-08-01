import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { authRouter } from './auth/auth.routes.js';
import { employeesRouter } from './employees/employees.routes.js';
import { customersRouter } from './customers/customers.routes.js';
import { productsRouter } from './products/products.routes.js';
import { quotationsRouter } from './quotations/quotations.routes.js';
import { workordersRouter } from './workorders/workorders.routes.js';
import { productionRouter } from './production/production.routes.js';
import { financeRouter } from './finance/finance.routes.js';
import { adminRouter } from './admin/admin.routes.js';
import { uploadsRouter } from './uploads/uploads.routes.js';
import { storageRouter } from './storage/storage.routes.js';
import { publicLeadsRouter } from './public-leads/public-leads.routes.js';

const app = express();

app.set('trust proxy', config.trustProxy);

app.use(
  helmet({
    contentSecurityPolicy: config.isProd() ? undefined : false,
    hsts: config.isProd() ? { maxAge: 31536000, includeSubDomains: true } : false,
  }),
);
app.use(compression());
console.log('CORS_ORIGINS:', config.corsOrigins);
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TooManyRequests', message: 'Too many requests, please try again later' },
  }),
);
app.use(
  morgan('combined', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
    skip: () => config.nodeEnv === 'test',
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/work-orders', workordersRouter);
app.use('/api/production', productionRouter);
app.use('/api/finance', financeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/storage', storageRouter);
app.use('/api/public', publicLeadsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, config.host, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
});

export default app;
