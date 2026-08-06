import { Router } from 'express';
import { ProductionController } from './production.controller.js';
import { ProductionService } from './production.service.js';
import { ProductionQueries } from './production.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  productionItemIdSchema,
  advanceStageSchema,
  updateProductionItemSchema,
  createProductionItemSchema,
  createChassisSchema,
  updateChassisSchema,
  productionListSchema,
} from './production.validator.js';

const queries = new ProductionQueries();
const service = new ProductionService(queries);
const controller = new ProductionController(service);

export const productionRouter = Router();

productionRouter.use(auth);

productionRouter.get('/', validate(productionListSchema), controller.list);

productionRouter.get('/:id', validate(productionItemIdSchema), controller.getById);

productionRouter.post('/', authorize('admin', 'manager'), validate(createProductionItemSchema), controller.create);

productionRouter.put('/:id', authorize('admin', 'manager'), validate(updateProductionItemSchema), controller.update);

productionRouter.patch('/:id/stage', authorize('admin', 'manager'), validate(advanceStageSchema), controller.advanceStage);

productionRouter.get('/:id/chassis', validate(productionItemIdSchema), controller.getChassisRecords);

productionRouter.post('/:id/chassis', authorize('admin', 'manager'), validate(createChassisSchema), controller.addChassis);

productionRouter.put('/:id/chassis/:chassisId', authorize('admin', 'manager'), validate(updateChassisSchema), controller.updateChassis);
