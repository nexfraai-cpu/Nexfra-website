import { Router } from 'express';
import { WorkordersController } from './workorders.controller.js';
import { WorkordersService } from './workorders.service.js';
import { WorkOrderQueries } from './workorders.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  workOrderIdSchema,
  workOrderListSchema,
  setDueDateSchema,
  toggleUrgentSchema,
} from './workorders.validator.js';

const queries = new WorkOrderQueries();
const service = new WorkordersService(queries);
const controller = new WorkordersController(service);

export const workordersRouter = Router();

workordersRouter.use(auth);

workordersRouter.get('/', validate(workOrderListSchema), controller.list);

workordersRouter.get('/:id', validate(workOrderIdSchema), controller.getById);

workordersRouter.post('/', authorize('admin', 'manager', 'sales'), validate(createWorkOrderSchema), controller.create);

workordersRouter.put('/:id', authorize('admin', 'manager'), validate(updateWorkOrderSchema), controller.update);

workordersRouter.delete('/:id', authorize('admin'), validate(workOrderIdSchema), controller.delete);

workordersRouter.patch('/:id/due-date', authorize('admin', 'manager'), validate(setDueDateSchema), controller.setDueDate);

workordersRouter.patch('/:id/urgent', authorize('admin', 'manager'), validate(toggleUrgentSchema), controller.toggleUrgent);
