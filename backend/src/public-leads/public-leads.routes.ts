import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { PublicLeadsController } from './public-leads.controller.js';
import { PublicLeadsService } from './public-leads.service.js';
import { CustomerQueries } from '../customers/customers.queries.js';
import { validate } from '../middleware/validate.js';
import { createLeadSchema } from './public-leads.validator.js';

const service = new PublicLeadsService(new CustomerQueries());
const controller = new PublicLeadsController(service);

export const publicLeadsRouter = Router();

const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Too many submissions. Please try again later.' },
});

publicLeadsRouter.post('/leads', leadLimiter, validate(createLeadSchema), controller.create);
