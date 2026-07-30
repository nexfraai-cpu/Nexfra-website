import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProductsService } from './products.service.js';
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

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockProduct(overrides: Record<string, any> = {}) {
  return {
    id: 'p1111111-1111-1111-1111-111111111111',
    key: 'trailer',
    name: 'Trailer',
    description: 'Flat Bed, Side Wall, and Tip Trailers',
    sort_order: 1,
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    ...overrides,
  };
}

function createMockTemplate(overrides: Record<string, any> = {}) {
  return {
    id: 't1111111-1111-1111-1111-111111111111',
    product_id: 'p1111111-1111-1111-1111-111111111111',
    key: 'flatbed',
    name: 'Flat Bed Trailer',
    base_price: 850000,
    dimensions: { length: '40 Feet', width: '98 Inches' },
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    ...overrides,
  };
}

function createMockSpec(overrides: Record<string, any> = {}) {
  return {
    id: 's1111111-1111-1111-1111-111111111111',
    template_id: 't1111111-1111-1111-1111-111111111111',
    spec_key: 'deck_length',
    name: 'Deck Length',
    section: 'Body',
    spec_type: 'dropdown',
    default_value: null,
    sort_order: 1,
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    ...overrides,
  };
}

function createMockOption(overrides: Record<string, any> = {}) {
  return {
    id: 'o1111111-1111-1111-1111-111111111111',
    spec_id: 's1111111-1111-1111-1111-111111111111',
    option_name: '32 Feet',
    price_diff: 0,
    is_default: true,
    sort_order: 1,
    created_at: '2026-01-15T08:00:00Z',
    ...overrides,
  };
}

function createMockQueries() {
  return {
    findAllProducts: jest.fn<any>(),
    findProductByKey: jest.fn<any>(),
    createProduct: jest.fn<any>(),
    updateProduct: jest.fn<any>(),
    findTemplatesByProduct: jest.fn<any>(),
    findTemplateByKey: jest.fn<any>(),
    findTemplateById: jest.fn<any>(),
    createTemplate: jest.fn<any>(),
    updateTemplate: jest.fn<any>(),
    deleteTemplate: jest.fn<any>(),
    findSpecsByTemplate: jest.fn<any>(),
    findSpecByKey: jest.fn<any>(),
    findSpecById: jest.fn<any>(),
    createSpec: jest.fn<any>(),
    updateSpec: jest.fn<any>(),
    deleteSpec: jest.fn<any>(),
    findOptionsBySpec: jest.fn<any>(),
    findOptionById: jest.fn<any>(),
    createOption: jest.fn<any>(),
    updateOption: jest.fn<any>(),
    deleteOption: jest.fn<any>(),
  };
}

describe('ProductsService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: ProductsService;
  const actorId = 'actor-uuid-1';

  beforeEach(() => {
    queries = createMockQueries();
    service = new ProductsService(queries as unknown as ProductQueries);
  });

  describe('listProducts', () => {
    it('returns all products ordered by sort_order', async () => {
      const products = [createMockProduct(), createMockProduct({ key: 'tipper', name: 'Tipper', sort_order: 2 })];
      queries.findAllProducts.mockResolvedValue(products);

      const result = await service.listProducts(actorId);

      expect(queries.findAllProducts).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('trailer');
      expect(result[0].sortOrder).toBe(1);
    });
  });

  describe('getProductByKey', () => {
    it('returns product when found by key', async () => {
      const p = createMockProduct();
      queries.findProductByKey.mockResolvedValue(p);

      const result = await service.getProductByKey('trailer', actorId);

      expect(result.key).toBe('trailer');
      expect(result.name).toBe('Trailer');
    });

    it('throws ProductNotFoundError when key does not exist', async () => {
      queries.findProductByKey.mockResolvedValue(null);
      await expect(service.getProductByKey('nonexistent', actorId)).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('getProductWithTemplates', () => {
    it('returns product with templates array', async () => {
      const p = createMockProduct();
      const templates = [createMockTemplate(), createMockTemplate({ key: 'sidewall', name: 'Side Wall Trailer' })];
      queries.findProductByKey.mockResolvedValue(p);
      queries.findTemplatesByProduct.mockResolvedValue(templates);

      const result = await service.getProductWithTemplates('trailer', actorId);

      expect(result.key).toBe('trailer');
      expect(result.templates).toHaveLength(2);
      expect(result.templates[0].key).toBe('flatbed');
      expect(result.templates[0].basePrice).toBe(850000);
    });

    it('throws ProductNotFoundError when product missing', async () => {
      queries.findProductByKey.mockResolvedValue(null);
      await expect(service.getProductWithTemplates('bad', actorId)).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('createProduct', () => {
    const input = { key: 'new_product', name: 'New Product', sortOrder: 5 };

    it('creates a new product', async () => {
      queries.findProductByKey.mockResolvedValue(null);
      queries.createProduct.mockResolvedValue(createMockProduct({ key: 'new_product', name: 'New Product', sort_order: 5 }));

      const result = await service.createProduct(input, actorId);

      expect(queries.findProductByKey).toHaveBeenCalledWith('new_product');
      expect(queries.createProduct).toHaveBeenCalledWith({
        key: 'new_product',
        name: 'New Product',
        description: null,
        sort_order: 5,
      });
      expect(result.key).toBe('new_product');
    });

    it('throws ProductConflictError when key exists', async () => {
      queries.findProductByKey.mockResolvedValue(createMockProduct());
      await expect(service.createProduct(input, actorId)).rejects.toThrow(ProductConflictError);
      expect(queries.createProduct).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('updates product fields', async () => {
      const p = createMockProduct();
      queries.findProductByKey.mockResolvedValue(p);
      queries.updateProduct.mockResolvedValue({ ...p, name: 'Updated Trailer' });

      const result = await service.updateProduct('trailer', { name: 'Updated Trailer' }, actorId);

      expect(queries.updateProduct).toHaveBeenCalledWith('trailer', { name: 'Updated Trailer' });
      expect(result.name).toBe('Updated Trailer');
    });

    it('returns existing when no updates', async () => {
      const p = createMockProduct();
      queries.findProductByKey.mockResolvedValue(p);

      const result = await service.updateProduct('trailer', {}, actorId);

      expect(queries.updateProduct).not.toHaveBeenCalled();
      expect(result.key).toBe('trailer');
    });

    it('throws ProductNotFoundError when missing', async () => {
      queries.findProductByKey.mockResolvedValue(null);
      await expect(service.updateProduct('bad', { name: 'X' }, actorId)).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('listTemplates', () => {
    it('returns templates for a product', async () => {
      const p = createMockProduct();
      const templates = [createMockTemplate()];
      queries.findProductByKey.mockResolvedValue(p);
      queries.findTemplatesByProduct.mockResolvedValue(templates);

      const result = await service.listTemplates('trailer', actorId);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('flatbed');
    });

    it('throws ProductNotFoundError when product missing', async () => {
      queries.findProductByKey.mockResolvedValue(null);
      await expect(service.listTemplates('bad', actorId)).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('getTemplateDetail', () => {
    it('returns template with specs and options', async () => {
      const p = createMockProduct();
      const t = createMockTemplate();
      const spec = createMockSpec();
      const option = createMockOption();

      queries.findProductByKey.mockResolvedValue(p);
      queries.findTemplateByKey.mockResolvedValue(t);
      queries.findSpecsByTemplate.mockResolvedValue([spec]);
      queries.findOptionsBySpec.mockResolvedValue([option]);

      const result = await service.getTemplateDetail('trailer', 'flatbed', actorId);

      expect(result.key).toBe('flatbed');
      expect(result.specs).toHaveLength(1);
      expect(result.specs[0].specKey).toBe('deck_length');
      expect(result.specs[0].options).toHaveLength(1);
      expect(result.specs[0].options[0].optionName).toBe('32 Feet');
    });

    it('throws ProductNotFoundError when product missing', async () => {
      queries.findProductByKey.mockResolvedValue(null);
      await expect(service.getTemplateDetail('bad', 'flatbed', actorId)).rejects.toThrow(ProductNotFoundError);
    });

    it('throws TemplateNotFoundError when template missing', async () => {
      queries.findProductByKey.mockResolvedValue(createMockProduct());
      queries.findTemplateByKey.mockResolvedValue(null);
      await expect(service.getTemplateDetail('trailer', 'bad', actorId)).rejects.toThrow(TemplateNotFoundError);
    });
  });

  describe('createTemplate', () => {
    const input = { key: 'new_template', name: 'New Template', basePrice: 500000 };

    it('creates a template under a product', async () => {
      const p = createMockProduct();
      queries.findProductByKey.mockResolvedValue(p);
      queries.findTemplateByKey.mockResolvedValue(null);
      queries.createTemplate.mockResolvedValue(createMockTemplate({ key: 'new_template', name: 'New Template' }));

      const result = await service.createTemplate('trailer', input, actorId);

      expect(queries.createTemplate).toHaveBeenCalledWith({
        product_id: p.id,
        key: 'new_template',
        name: 'New Template',
        base_price: 500000,
        dimensions: {},
        sort_order: 0,
        is_active: true,
      });
      expect(result.key).toBe('new_template');
    });

    it('throws TemplateConflictError when key exists in product', async () => {
      queries.findProductByKey.mockResolvedValue(createMockProduct());
      queries.findTemplateByKey.mockResolvedValue(createMockTemplate());
      await expect(service.createTemplate('trailer', input, actorId)).rejects.toThrow(TemplateConflictError);
    });
  });

  describe('updateTemplate', () => {
    it('updates template fields', async () => {
      const p = createMockProduct();
      const t = createMockTemplate();
      queries.findProductByKey.mockResolvedValue(p);
      queries.findTemplateByKey.mockResolvedValue(t);
      queries.updateTemplate.mockResolvedValue({ ...t, name: 'Updated', base_price: 900000 });

      const result = await service.updateTemplate('trailer', 'flatbed', { name: 'Updated', basePrice: 900000 }, actorId);

      expect(queries.updateTemplate).toHaveBeenCalledWith(t.id, { name: 'Updated', base_price: 900000 });
      expect(result.name).toBe('Updated');
      expect(result.basePrice).toBe(900000);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template', async () => {
      const p = createMockProduct();
      const t = createMockTemplate();
      queries.findProductByKey.mockResolvedValue(p);
      queries.findTemplateByKey.mockResolvedValue(t);
      queries.deleteTemplate.mockResolvedValue(undefined);

      await service.deleteTemplate('trailer', 'flatbed', actorId);

      expect(queries.deleteTemplate).toHaveBeenCalledWith(t.id);
    });
  });

  describe('createSpec', () => {
    const input = {
      specKey: 'axle_config',
      name: 'Axle Configuration',
      section: 'Chassis',
      specType: 'dropdown' as const,
      options: [{ optionName: '2 Axle', priceDiff: -50000 }],
    };

    it('creates spec with options', async () => {
      const t = createMockTemplate();
      queries.findTemplateById.mockResolvedValue(t);
      queries.findSpecByKey.mockResolvedValue(null);
      queries.createSpec.mockResolvedValue(createMockSpec({ spec_key: 'axle_config', name: 'Axle Configuration' }));
      queries.createOption.mockResolvedValue(createMockOption({ option_name: '2 Axle', price_diff: -50000 }));

      const result = await service.createSpec(t.id, input, actorId);

      expect(queries.createSpec).toHaveBeenCalled();
      expect(queries.createOption).toHaveBeenCalled();
      expect(result.specKey).toBe('axle_config');
      expect(result.options).toHaveLength(1);
    });

    it('throws InvalidSpecTypeError for invalid spec type', async () => {
      queries.findTemplateById.mockResolvedValue(createMockTemplate());
      await expect(
        service.createSpec('template-id', { ...input, specType: 'invalid' as any }, actorId),
      ).rejects.toThrow(InvalidSpecTypeError);
    });

    it('throws SpecConflictError when spec key exists', async () => {
      queries.findTemplateById.mockResolvedValue(createMockTemplate());
      queries.findSpecByKey.mockResolvedValue(createMockSpec());
      await expect(service.createSpec('template-id', input, actorId)).rejects.toThrow(SpecConflictError);
    });
  });

  describe('updateSpec', () => {
    it('updates spec fields', async () => {
      const t = createMockTemplate();
      const spec = createMockSpec();
      queries.findTemplateById.mockResolvedValue(t);
      queries.findSpecByKey.mockResolvedValue(spec);
      queries.updateSpec.mockResolvedValue({ ...spec, name: 'Updated Spec' });
      queries.findOptionsBySpec.mockResolvedValue([]);

      const result = await service.updateSpec(t.id, 'deck_length', { name: 'Updated Spec' }, actorId);

      expect(queries.updateSpec).toHaveBeenCalledWith(spec.id, { name: 'Updated Spec' });
      expect(result.name).toBe('Updated Spec');
    });
  });

  describe('deleteSpec', () => {
    it('deletes spec', async () => {
      const t = createMockTemplate();
      const spec = createMockSpec();
      queries.findTemplateById.mockResolvedValue(t);
      queries.findSpecByKey.mockResolvedValue(spec);
      queries.deleteSpec.mockResolvedValue(undefined);

      await service.deleteSpec(t.id, 'deck_length', actorId);

      expect(queries.deleteSpec).toHaveBeenCalledWith(spec.id);
    });
  });

  describe('createOption', () => {
    it('creates option for a spec', async () => {
      const spec = createMockSpec();
      queries.findSpecById.mockResolvedValue(spec);
      queries.createOption.mockResolvedValue(createMockOption({ option_name: 'New Option' }));

      const result = await service.createOption(spec.id, { optionName: 'New Option' }, actorId);

      expect(queries.createOption).toHaveBeenCalledWith({
        spec_id: spec.id,
        option_name: 'New Option',
        price_diff: 0,
        is_default: false,
        sort_order: 0,
      });
      expect(result.optionName).toBe('New Option');
    });
  });

  describe('updateOption', () => {
    it('updates option fields', async () => {
      const spec = createMockSpec();
      const option = createMockOption();
      queries.findSpecById.mockResolvedValue(spec);
      queries.findOptionById.mockResolvedValue(option);
      queries.updateOption.mockResolvedValue({ ...option, price_diff: 50000 });

      const result = await service.updateOption(spec.id, option.id, { priceDiff: 50000 }, actorId);

      expect(queries.updateOption).toHaveBeenCalledWith(option.id, { price_diff: 50000 });
      expect(result.priceDiff).toBe(50000);
    });
  });

  describe('deleteOption', () => {
    it('deletes option', async () => {
      const spec = createMockSpec();
      const option = createMockOption();
      queries.findSpecById.mockResolvedValue(spec);
      queries.findOptionById.mockResolvedValue(option);
      queries.deleteOption.mockResolvedValue(undefined);

      await service.deleteOption(spec.id, option.id, actorId);

      expect(queries.deleteOption).toHaveBeenCalledWith(option.id);
    });

    it('throws SpecNotFoundError when option missing', async () => {
      queries.findSpecById.mockResolvedValue(createMockSpec());
      queries.findOptionById.mockResolvedValue(null);
      await expect(service.deleteOption('spec-id', 'bad-id', actorId)).rejects.toThrow(SpecNotFoundError);
    });
  });
});
