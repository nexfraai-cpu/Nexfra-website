import { Router } from 'express';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { ProductQueries } from './products.queries.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  productKeySchema,
  templateKeySchema,
  createTemplateSchema,
  updateTemplateSchema,
  createSpecSchema,
  updateSpecSchema,
  specKeySchema,
  createOptionSchema,
  updateOptionSchema,
  optionIdSchema,
} from './products.validator.js';

const queries = new ProductQueries();
const service = new ProductsService(queries);
const controller = new ProductsController(service);

export const productsRouter = Router();

productsRouter.use(auth);

// Products
productsRouter.get('/', controller.listProducts);

productsRouter.get('/:key', validate(productKeySchema), controller.getProductByKey);

productsRouter.get('/:key/templates', validate(productKeySchema), controller.getProductWithTemplates);

productsRouter.post('/', authorize('admin'), validate(createProductSchema), controller.createProduct);

productsRouter.put('/:key', authorize('admin'), validate(updateProductSchema), controller.updateProduct);

// Templates (nested under product key)
productsRouter.get('/:key/templates/:templateKey', validate(templateKeySchema), controller.getTemplateDetail);

productsRouter.post('/:key/templates', authorize('admin'), validate(createTemplateSchema), controller.createTemplate);

productsRouter.put('/:key/templates/:templateKey', authorize('admin'), validate(updateTemplateSchema), controller.updateTemplate);

productsRouter.delete('/:key/templates/:templateKey', authorize('admin'), validate(templateKeySchema), controller.deleteTemplate);

// Specs (under template ID)
productsRouter.get('/templates/:id/specs', controller.listSpecs);

productsRouter.get('/templates/:id/specs/:specKey', validate(specKeySchema), controller.getSpecDetail);

productsRouter.post('/templates/:id/specs', authorize('admin'), validate(createSpecSchema), controller.createSpec);

productsRouter.put('/templates/:id/specs/:specKey', authorize('admin'), validate(updateSpecSchema), controller.updateSpec);

productsRouter.delete('/templates/:id/specs/:specKey', authorize('admin'), validate(specKeySchema), controller.deleteSpec);

// Options (under spec ID)
productsRouter.post('/specs/:specId/options', authorize('admin'), validate(createOptionSchema), controller.createOption);

productsRouter.put('/specs/:specId/options/:optionId', authorize('admin'), validate(updateOptionSchema), controller.updateOption);

productsRouter.delete('/specs/:specId/options/:optionId', authorize('admin'), validate(optionIdSchema), controller.deleteOption);
