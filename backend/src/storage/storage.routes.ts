import { Router } from 'express';
import { StorageController } from './storage.controller.js';
import { validate } from '../middleware/validate.js';
import {
  storageKeyParamSchema, storageSetSchema,
} from './storage.validator.js';

const controller = new StorageController();

export const storageRouter = Router();

storageRouter.get('/:key', validate(storageKeyParamSchema), controller.get);

storageRouter.post('/:key', validate(storageSetSchema), controller.set);

storageRouter.delete('/:key', validate(storageKeyParamSchema), controller.remove);

storageRouter.delete('/', controller.clear);
