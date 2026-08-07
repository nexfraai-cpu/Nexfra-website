import { Router } from 'express';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { CatalogQueries } from './catalog.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { SaveComponentDefinitionsSchema } from './catalog.schema.js';

const queries = new CatalogQueries();
const service = new CatalogService(queries);
const controller = new CatalogController(service);

export const catalogRouter = Router();

catalogRouter.use(auth);

catalogRouter.get('/component-definitions', controller.getComponentDefinitions);

catalogRouter.put(
  '/component-definitions',
  authorize('admin'),
  validate(SaveComponentDefinitionsSchema),
  controller.saveComponentDefinitions,
);