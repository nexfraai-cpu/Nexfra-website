export interface CatalogOption {
  id: string;
  name: string;
  priceDifference: number;
  isDefault: boolean;
  displayOrder: number;
}

export interface CatalogSpec {
  id: string;
  specKey: string;
  name: string;
  section: string;
  sectionId: string;
  controlType: string;
  defaultValue: string | null;
  displayOrder: number;
  options: CatalogOption[];
}

export interface CatalogTemplate {
  id: string;
  productId: string;
  key: string;
  name: string;
  basePrice: number;
  dimensions: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  specs: CatalogSpec[];
}

/** Shape reconstructed to match WIZARD_PRODUCT_TEMPLATES consumed by erp.js */
export interface WizardTemplateDefinition {
  name: string;
  basePrice: number;
  dimensions: Record<string, unknown>;
  specs: WizardSpecDefinition[];
}

export interface WizardSpecDefinition {
  id: string;
  name: string;
  section: string;
  type: string;
  options: string[];
  /** Subset of `options` that are currently enabled (active) in the builder. */
  enabledOptions?: string[];
  defaultValue: string;
  priceDiffs: Record<string, number>;
  /** Whether the spec participates in normal builder pricing (default true). */
  required?: boolean;
  /** Whether the spec is shown in the builder (false = disabled/archived). */
  enabled?: boolean;
}

export type WizardCatalog = Record<string, WizardTemplateDefinition>;