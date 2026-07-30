export interface ProductResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateResponse {
  id: string;
  productId: string;
  key: string;
  name: string;
  basePrice: number;
  dimensions: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpecOptionResponse {
  id: string;
  optionName: string;
  priceDiff: number;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SpecResponse {
  id: string;
  templateId: string;
  specKey: string;
  name: string;
  section: string;
  specType: string;
  defaultValue: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  options: SpecOptionResponse[];
}

export interface TemplateDetailResponse extends TemplateResponse {
  specs: SpecResponse[];
}

export interface ProductWithTemplatesResponse extends ProductResponse {
  templates: TemplateResponse[];
}

export interface CreateProductInput {
  key: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  sortOrder?: number;
}

export interface CreateTemplateInput {
  key: string;
  name: string;
  basePrice: number;
  dimensions?: Record<string, unknown>;
  sortOrder?: number;
}

export interface UpdateTemplateInput {
  name?: string;
  basePrice?: number;
  dimensions?: Record<string, unknown>;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateSpecInput {
  specKey: string;
  name: string;
  section: string;
  specType: string;
  defaultValue?: string;
  sortOrder?: number;
  options?: CreateOptionInput[];
}

export interface UpdateSpecInput {
  name?: string;
  section?: string;
  specType?: string;
  defaultValue?: string | null;
  sortOrder?: number;
}

export interface CreateOptionInput {
  optionName: string;
  priceDiff?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateOptionInput {
  optionName?: string;
  priceDiff?: number;
  isDefault?: boolean;
  sortOrder?: number;
}
