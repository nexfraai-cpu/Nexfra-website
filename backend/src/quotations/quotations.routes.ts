import { Router } from 'express';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsService } from './quotations.service.js';
import { QuotationQueries } from './quotations.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createQuotationSchema,
  updateQuotationSchema,
  quotationIdSchema,
  quotationListSchema,
  approveQuotationSchema,
  denyQuotationSchema,
} from './quotations.validator.js';

const queries = new QuotationQueries();
const service = new QuotationsService(queries);
const controller = new QuotationsController(service);

export const quotationsRouter = Router();

quotationsRouter.use(auth);

quotationsRouter.get('/', validate(quotationListSchema), controller.list);

quotationsRouter.get('/:id', validate(quotationIdSchema), controller.getById);

quotationsRouter.post('/', validate(createQuotationSchema), controller.create);

quotationsRouter.put('/:id', authorize('admin', 'sales'), validate(updateQuotationSchema), controller.update);

quotationsRouter.delete('/:id', authorize('admin', 'sales'), validate(quotationIdSchema), controller.delete);

quotationsRouter.patch('/:id/submit', authorize('admin', 'sales'), validate(quotationIdSchema), controller.submit);

quotationsRouter.patch('/:id/approve', authorize('admin', 'manager'), validate(approveQuotationSchema), controller.approve);

quotationsRouter.patch('/:id/deny', authorize('admin', 'manager'), validate(denyQuotationSchema), controller.deny);
