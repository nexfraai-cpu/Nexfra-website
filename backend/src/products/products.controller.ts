import { Request, Response } from 'express';
import { ProductsService } from './products.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class ProductsController {
  constructor(private productsService: ProductsService) {}

  /*** Products ***/
  listProducts = asyncWrap(async (req: Request, res: Response) => {
    const products = await this.productsService.listProducts(req.user!.id);
    res.status(200).json({ data: products });
  });

  getProductByKey = asyncWrap(async (req: Request, res: Response) => {
    const product = await this.productsService.getProductByKey(req.params.key, req.user!.id);
    res.status(200).json({ data: product });
  });

  getProductWithTemplates = asyncWrap(async (req: Request, res: Response) => {
    const product = await this.productsService.getProductWithTemplates(req.params.key, req.user!.id);
    res.status(200).json({ data: product });
  });

  createProduct = asyncWrap(async (req: Request, res: Response) => {
    const product = await this.productsService.createProduct(req.body, req.user!.id);
    res.status(201).json({ data: product });
  });

  updateProduct = asyncWrap(async (req: Request, res: Response) => {
    const product = await this.productsService.updateProduct(req.params.key, req.body, req.user!.id);
    res.status(200).json({ data: product });
  });

  /*** Templates ***/
  listTemplates = asyncWrap(async (req: Request, res: Response) => {
    const templates = await this.productsService.listTemplates(req.params.key, req.user!.id);
    res.status(200).json({ data: templates });
  });

  getTemplateDetail = asyncWrap(async (req: Request, res: Response) => {
    const template = await this.productsService.getTemplateDetail(
      req.params.key,
      req.params.templateKey,
      req.user!.id,
    );
    res.status(200).json({ data: template });
  });

  createTemplate = asyncWrap(async (req: Request, res: Response) => {
    const template = await this.productsService.createTemplate(req.params.key, req.body, req.user!.id);
    res.status(201).json({ data: template });
  });

  updateTemplate = asyncWrap(async (req: Request, res: Response) => {
    const template = await this.productsService.updateTemplate(
      req.params.key,
      req.params.templateKey,
      req.body,
      req.user!.id,
    );
    res.status(200).json({ data: template });
  });

  deleteTemplate = asyncWrap(async (req: Request, res: Response) => {
    await this.productsService.deleteTemplate(req.params.key, req.params.templateKey, req.user!.id);
    res.status(200).json({ data: { message: 'Template deleted successfully' } });
  });

  /*** Specs ***/
  listSpecs = asyncWrap(async (req: Request, res: Response) => {
    const specs = await this.productsService.listSpecs(req.params.id, req.user!.id);
    res.status(200).json({ data: specs });
  });

  getSpecDetail = asyncWrap(async (req: Request, res: Response) => {
    const spec = await this.productsService.getSpecDetail(req.params.id, req.params.specKey, req.user!.id);
    res.status(200).json({ data: spec });
  });

  createSpec = asyncWrap(async (req: Request, res: Response) => {
    const spec = await this.productsService.createSpec(req.params.id, req.body, req.user!.id);
    res.status(201).json({ data: spec });
  });

  updateSpec = asyncWrap(async (req: Request, res: Response) => {
    const spec = await this.productsService.updateSpec(req.params.id, req.params.specKey, req.body, req.user!.id);
    res.status(200).json({ data: spec });
  });

  deleteSpec = asyncWrap(async (req: Request, res: Response) => {
    await this.productsService.deleteSpec(req.params.id, req.params.specKey, req.user!.id);
    res.status(200).json({ data: { message: 'Spec deleted successfully' } });
  });

  /*** Options ***/
  createOption = asyncWrap(async (req: Request, res: Response) => {
    const option = await this.productsService.createOption(req.params.specId, req.body, req.user!.id);
    res.status(201).json({ data: option });
  });

  updateOption = asyncWrap(async (req: Request, res: Response) => {
    const option = await this.productsService.updateOption(
      req.params.specId,
      req.params.optionId,
      req.body,
      req.user!.id,
    );
    res.status(200).json({ data: option });
  });

  deleteOption = asyncWrap(async (req: Request, res: Response) => {
    await this.productsService.deleteOption(req.params.specId, req.params.optionId, req.user!.id);
    res.status(200).json({ data: { message: 'Option deleted successfully' } });
  });
}
