import { Request, Response } from 'express';
import { CatalogService } from './catalog.service.js';
import { SaveComponentDefinitionsInput } from './catalog.schema.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  getComponentDefinitions = asyncWrap(async (req: Request, res: Response) => {
    const includeDisabled = req.query.includeDisabled === 'true';
    const catalog = await this.catalogService.getComponentDefinitions(includeDisabled);
    res.status(200).json({ data: catalog });
  });

  saveComponentDefinitions = asyncWrap(async (req: Request, res: Response) => {
    const { templates } = req.body as SaveComponentDefinitionsInput;
    const catalog = await this.catalogService.saveComponentDefinitions(templates);
    res.status(200).json({ data: catalog });
  });
}