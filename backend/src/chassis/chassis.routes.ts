import { Router } from 'express';
import { ChassisController } from './chassis.controller.js';
import { ChassisService } from './chassis.service.js';
import { ChassisQueries } from './chassis.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createChassisSchema,
  updateChassisSchema,
  chassisIdSchema,
  chassisListSchema,
} from './chassis.validator.js';

const queries = new ChassisQueries();
const service = new ChassisService(queries);
const controller = new ChassisController(service);

export const chassisRouter = Router();

chassisRouter.use(auth);

chassisRouter.get('/', validate(chassisListSchema), controller.list);

chassisRouter.post('/', authorize('admin', 'manager'), validate(createChassisSchema), controller.create);

chassisRouter.put('/:id', authorize('admin', 'manager'), validate(updateChassisSchema), controller.update);

chassisRouter.delete('/:id', authorize('admin', 'manager'), validate(chassisIdSchema), controller.remove);