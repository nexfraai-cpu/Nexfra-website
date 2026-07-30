import { Router } from 'express';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { CustomerQueries } from './customers.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListSchema,
} from './customers.validator.js';

const queries = new CustomerQueries();
const service = new CustomersService(queries);
const controller = new CustomersController(service);

export const customersRouter = Router();

customersRouter.use(auth);

customersRouter.get('/', authorize('admin', 'manager', 'sales', 'finance'), validate(customerListSchema), controller.list);

customersRouter.get('/:id', authorize('admin', 'manager', 'sales', 'finance'), controller.getById);

customersRouter.post('/', authorize('admin', 'manager', 'sales'), validate(createCustomerSchema), controller.create);

customersRouter.put('/:id', authorize('admin', 'manager', 'sales'), validate(updateCustomerSchema), controller.update);

customersRouter.delete('/:id', authorize('admin'), controller.delete);
