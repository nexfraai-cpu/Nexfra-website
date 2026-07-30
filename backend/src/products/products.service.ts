import { ProductQueries } from './products.queries.js';
import {
  ProductNotFoundError,
  ProductConflictError,
  TemplateNotFoundError,
  TemplateConflictError,
  SpecNotFoundError,
  SpecConflictError,
  InvalidSpecTypeError,
} from './products.errors.js';
import {
  ProductResponse,
  TemplateResponse,
  TemplateDetailResponse,
  SpecResponse,
  SpecOptionResponse,
  ProductWithTemplatesResponse,
  CreateProductInput,
  UpdateProductInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateSpecInput,
  UpdateSpecInput,
  CreateOptionInput,
  UpdateOptionInput,
} from './products.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';

const VALID_SPEC_TYPES = ['dropdown', 'text', 'number', 'checkbox', 'radio'];

export class ProductsService {
  constructor(private queries: ProductQueries) {}

  /*** Products ***/

  async listProducts(actorId: string): Promise<ProductResponse[]> {
    const products = await this.queries.findAllProducts();
    logger.info({ actorId, count: products.length }, 'Products listed');
    return products.map(this._toProductResponse);
  }

  async getProductByKey(key: string, actorId: string): Promise<ProductResponse> {
    const product = await this.queries.findProductByKey(key);
    if (!product) throw new ProductNotFoundError(key);
    logger.info({ actorId, productKey: key }, 'Product retrieved');
    return this._toProductResponse(product);
  }

  async getProductWithTemplates(key: string, actorId: string): Promise<ProductWithTemplatesResponse> {
    const product = await this.queries.findProductByKey(key);
    if (!product) throw new ProductNotFoundError(key);
    const templates = await this.queries.findTemplatesByProduct(product.id);
    logger.info({ actorId, productKey: key, templateCount: templates.length }, 'Product with templates retrieved');
    return {
      ...this._toProductResponse(product),
      templates: templates.map(this._toTemplateResponse),
    };
  }

  async createProduct(input: CreateProductInput, actorId: string): Promise<ProductResponse> {
    const existing = await this.queries.findProductByKey(input.key);
    if (existing) throw new ProductConflictError(input.key);

    const product = await this.queries.createProduct({
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sortOrder ?? 0,
    } as any);

    await this._logAudit(actorId, 'create', 'product', product.id, null, {
      key: input.key,
      name: input.name,
    });

    logger.info({ actorId, productKey: input.key }, 'Product created');
    return this._toProductResponse(product);
  }

  async updateProduct(key: string, input: UpdateProductInput, actorId: string): Promise<ProductResponse> {
    const product = await this.queries.findProductByKey(key);
    if (!product) throw new ProductNotFoundError(key);

    const oldData = { ...product };
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

    if (Object.keys(updates).length === 0) return this._toProductResponse(product);

    const updated = await this.queries.updateProduct(key, updates as any);

    await this._logAudit(actorId, 'update', 'product', product.id, oldData, updated);

    logger.info({ actorId, productKey: key }, 'Product updated');
    return this._toProductResponse(updated);
  }

  /*** Templates ***/
  async listTemplates(productKey: string, actorId: string): Promise<TemplateResponse[]> {
    const product = await this.queries.findProductByKey(productKey);
    if (!product) throw new ProductNotFoundError(productKey);

    const templates = await this.queries.findTemplatesByProduct(product.id);
    logger.info({ actorId, productKey, count: templates.length }, 'Templates listed');
    return templates.map(this._toTemplateResponse);
  }

  async getTemplateDetail(productKey: string, templateKey: string, actorId: string): Promise<TemplateDetailResponse> {
    const product = await this.queries.findProductByKey(productKey);
    if (!product) throw new ProductNotFoundError(productKey);

    const template = await this.queries.findTemplateByKey(product.id, templateKey);
    if (!template) throw new TemplateNotFoundError(templateKey);

    const specs = await this.queries.findSpecsByTemplate(template.id as string);
    const specsWithOptions: SpecResponse[] = [];

    for (const spec of specs) {
      const options = await this.queries.findOptionsBySpec(spec.id as string);
      specsWithOptions.push(this._toSpecResponse(spec, options));
    }

    logger.info({ actorId, productKey, templateKey }, 'Template detail retrieved');
    return {
      ...this._toTemplateResponse(template),
      specs: specsWithOptions,
    };
  }

  async createTemplate(productKey: string, input: CreateTemplateInput, actorId: string): Promise<TemplateResponse> {
    const product = await this.queries.findProductByKey(productKey);
    if (!product) throw new ProductNotFoundError(productKey);

    const existing = await this.queries.findTemplateByKey(product.id, input.key);
    if (existing) throw new TemplateConflictError(input.key);

    const template = await this.queries.createTemplate({
      product_id: product.id,
      key: input.key,
      name: input.name,
      base_price: input.basePrice,
      dimensions: input.dimensions ?? {},
      sort_order: input.sortOrder ?? 0,
      is_active: true,
    } as any);

    await this._logAudit(actorId, 'create', 'product_template', template.id as string, null, {
      key: input.key,
      name: input.name,
      basePrice: input.basePrice,
    });

    logger.info({ actorId, productKey, templateKey: input.key }, 'Template created');
    return this._toTemplateResponse(template);
  }

  async updateTemplate(productKey: string, templateKey: string, input: UpdateTemplateInput, actorId: string): Promise<TemplateResponse> {
    const product = await this.queries.findProductByKey(productKey);
    if (!product) throw new ProductNotFoundError(productKey);

    const template = await this.queries.findTemplateByKey(product.id, templateKey);
    if (!template) throw new TemplateNotFoundError(templateKey);

    const oldData = { ...template };
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.basePrice !== undefined) updates.base_price = input.basePrice;
    if (input.dimensions !== undefined) updates.dimensions = input.dimensions;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    if (Object.keys(updates).length === 0) return this._toTemplateResponse(template);

    const updated = await this.queries.updateTemplate(template.id as string, updates as any);

    await this._logAudit(actorId, 'update', 'product_template', template.id as string, oldData, updated);

    logger.info({ actorId, productKey, templateKey }, 'Template updated');
    return this._toTemplateResponse(updated);
  }

  async deleteTemplate(productKey: string, templateKey: string, actorId: string): Promise<void> {
    const product = await this.queries.findProductByKey(productKey);
    if (!product) throw new ProductNotFoundError(productKey);

    const template = await this.queries.findTemplateByKey(product.id, templateKey);
    if (!template) throw new TemplateNotFoundError(templateKey);

    await this.queries.deleteTemplate(template.id as string);

    await this._logAudit(actorId, 'delete', 'product_template', template.id as string, template, { deleted: true });

    logger.info({ actorId, productKey, templateKey }, 'Template deleted');
  }

  /*** Specs ***/
  async listSpecs(templateId: string, actorId: string): Promise<SpecResponse[]> {
    const template = await this.queries.findTemplateById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);

    const specs = await this.queries.findSpecsByTemplate(templateId);
    const result: SpecResponse[] = [];

    for (const spec of specs) {
      const options = await this.queries.findOptionsBySpec(spec.id as string);
      result.push(this._toSpecResponse(spec, options));
    }

    logger.info({ actorId, templateId, count: result.length }, 'Specs listed');
    return result;
  }

  async getSpecDetail(templateId: string, specKey: string, actorId: string): Promise<SpecResponse> {
    const template = await this.queries.findTemplateById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);

    const spec = await this.queries.findSpecByKey(templateId, specKey);
    if (!spec) throw new SpecNotFoundError(specKey);

    const options = await this.queries.findOptionsBySpec(spec.id as string);

    logger.info({ actorId, templateId, specKey }, 'Spec detail retrieved');
    return this._toSpecResponse(spec, options);
  }

  async createSpec(templateId: string, input: CreateSpecInput, actorId: string): Promise<SpecResponse> {
    const template = await this.queries.findTemplateById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);

    if (!VALID_SPEC_TYPES.includes(input.specType)) {
      throw new InvalidSpecTypeError(input.specType);
    }

    const existing = await this.queries.findSpecByKey(templateId, input.specKey);
    if (existing) throw new SpecConflictError(input.specKey);

    const spec = await this.queries.createSpec({
      template_id: templateId,
      spec_key: input.specKey,
      name: input.name,
      section: input.section,
      spec_type: input.specType,
      default_value: input.defaultValue ?? null,
      sort_order: input.sortOrder ?? 0,
    } as any);

    const options: Record<string, unknown>[] = [];
    if (input.options && input.options.length > 0) {
      for (const opt of input.options) {
        const created = await this.queries.createOption({
          spec_id: spec.id as string,
          option_name: opt.optionName,
          price_diff: opt.priceDiff ?? 0,
          is_default: opt.isDefault ?? false,
          sort_order: opt.sortOrder ?? 0,
        } as any);
        options.push(created);
      }
    }

    await this._logAudit(actorId, 'create', 'product_template_spec', spec.id as string, null, {
      specKey: input.specKey,
      name: input.name,
      section: input.section,
      specType: input.specType,
      optionCount: input.options?.length ?? 0,
    });

    logger.info({ actorId, templateId, specKey: input.specKey }, 'Spec created');
    return this._toSpecResponse(spec, options);
  }

  async updateSpec(templateId: string, specKey: string, input: UpdateSpecInput, actorId: string): Promise<SpecResponse> {
    const template = await this.queries.findTemplateById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);

    const spec = await this.queries.findSpecByKey(templateId, specKey);
    if (!spec) throw new SpecNotFoundError(specKey);

    if (input.specType && !VALID_SPEC_TYPES.includes(input.specType)) {
      throw new InvalidSpecTypeError(input.specType);
    }

    const oldData = { ...spec };
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.section !== undefined) updates.section = input.section;
    if (input.specType !== undefined) updates.spec_type = input.specType;
    if (input.defaultValue !== undefined) updates.default_value = input.defaultValue;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

    if (Object.keys(updates).length === 0) {
      const options = await this.queries.findOptionsBySpec(spec.id as string);
      return this._toSpecResponse(spec, options);
    }

    const updated = await this.queries.updateSpec(spec.id as string, updates as any);
    const options = await this.queries.findOptionsBySpec(updated.id as string);

    await this._logAudit(actorId, 'update', 'product_template_spec', spec.id as string, oldData, updated);

    logger.info({ actorId, templateId, specKey }, 'Spec updated');
    return this._toSpecResponse(updated, options);
  }

  async deleteSpec(templateId: string, specKey: string, actorId: string): Promise<void> {
    const template = await this.queries.findTemplateById(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);

    const spec = await this.queries.findSpecByKey(templateId, specKey);
    if (!spec) throw new SpecNotFoundError(specKey);

    await this.queries.deleteSpec(spec.id as string);

    await this._logAudit(actorId, 'delete', 'product_template_spec', spec.id as string, spec, { deleted: true });

    logger.info({ actorId, templateId, specKey }, 'Spec deleted');
  }

  /*** Options ***/
  async createOption(specId: string, input: CreateOptionInput, actorId: string): Promise<SpecOptionResponse> {
    const spec = await this.queries.findSpecById(specId);
    if (!spec) throw new SpecNotFoundError(specId);

    const option = await this.queries.createOption({
      spec_id: specId,
      option_name: input.optionName,
      price_diff: input.priceDiff ?? 0,
      is_default: input.isDefault ?? false,
      sort_order: input.sortOrder ?? 0,
    } as any);

    await this._logAudit(actorId, 'create', 'product_spec_option', option.id as string, null, {
      optionName: input.optionName,
      priceDiff: input.priceDiff,
    });

    logger.info({ actorId, specId, optionName: input.optionName }, 'Option created');
    return this._toOptionResponse(option);
  }

  async updateOption(specId: string, optionId: string, input: UpdateOptionInput, actorId: string): Promise<SpecOptionResponse> {
    const spec = await this.queries.findSpecById(specId);
    if (!spec) throw new SpecNotFoundError(specId);

    const option = await this.queries.findOptionById(optionId);
    if (!option) throw new SpecNotFoundError(optionId);

    const oldData = { ...option };
    const updates: Record<string, unknown> = {};
    if (input.optionName !== undefined) updates.option_name = input.optionName;
    if (input.priceDiff !== undefined) updates.price_diff = input.priceDiff;
    if (input.isDefault !== undefined) updates.is_default = input.isDefault;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

    if (Object.keys(updates).length === 0) return this._toOptionResponse(option);

    const updated = await this.queries.updateOption(optionId, updates as any);

    await this._logAudit(actorId, 'update', 'product_spec_option', optionId, oldData, updated);

    logger.info({ actorId, specId, optionId }, 'Option updated');
    return this._toOptionResponse(updated);
  }

  async deleteOption(specId: string, optionId: string, actorId: string): Promise<void> {
    const spec = await this.queries.findSpecById(specId);
    if (!spec) throw new SpecNotFoundError(specId);

    const option = await this.queries.findOptionById(optionId);
    if (!option) throw new SpecNotFoundError(optionId);

    await this.queries.deleteOption(optionId);

    await this._logAudit(actorId, 'delete', 'product_spec_option', optionId, option, { deleted: true });

    logger.info({ actorId, specId, optionId }, 'Option deleted');
  }

  /*** Helpers ***/

  private async _logAudit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: unknown,
    newValue: unknown,
  ) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description: `${action} ${entityType}`,
      metadata: { old: oldValue, new: newValue },
    });
    if (error) {
      logger.error({ error, action, entityType, entityId }, 'Audit log insertion failed');
    }
  }

  private _toProductResponse(row: any): ProductResponse {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description ?? null,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private _toTemplateResponse(row: any): TemplateResponse {
    return {
      id: row.id,
      productId: row.product_id,
      key: row.key,
      name: row.name,
      basePrice: Number(row.base_price),
      dimensions: row.dimensions ?? {},
      sortOrder: row.sort_order,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private _toSpecResponse(spec: any, options: any[] = []): SpecResponse {
    return {
      id: spec.id,
      templateId: spec.template_id,
      specKey: spec.spec_key,
      name: spec.name,
      section: spec.section,
      specType: spec.spec_type,
      defaultValue: spec.default_value ?? null,
      sortOrder: spec.sort_order,
      createdAt: spec.created_at,
      updatedAt: spec.updated_at,
      options: options.map(this._toOptionResponse),
    };
  }

  private _toOptionResponse(opt: any): SpecOptionResponse {
    return {
      id: opt.id,
      optionName: opt.option_name,
      priceDiff: Number(opt.price_diff),
      isDefault: opt.is_default ?? false,
      sortOrder: opt.sort_order,
      createdAt: opt.created_at,
    };
  }
}
