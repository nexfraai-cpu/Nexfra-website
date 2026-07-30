import { Router } from 'express';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { EmployeeQueries } from './employees.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  resetPasswordSchema,
} from './employees.validator.js';

const queries = new EmployeeQueries();
const service = new EmployeesService(queries);
const controller = new EmployeesController(service);

export const employeesRouter = Router();

employeesRouter.use(auth);

employeesRouter.get('/', authorize('admin', 'manager'), controller.list);

employeesRouter.get('/:id', authorize('admin', 'manager'), controller.getById);

employeesRouter.post('/', authorize('admin'), validate(createEmployeeSchema), controller.create);

employeesRouter.put('/:id', authorize('admin'), validate(updateEmployeeSchema), controller.update);

employeesRouter.delete('/:id', authorize('admin'), controller.delete);

employeesRouter.patch('/:id/status', authorize('admin'), controller.toggleStatus);

employeesRouter.patch('/:id/password', authorize('admin'), validate(resetPasswordSchema), controller.resetPassword);
