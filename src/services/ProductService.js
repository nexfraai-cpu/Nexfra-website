import { BaseService } from './BaseService.js';

export class ProductService extends BaseService {
  constructor() {
    super();
    this._templates = null;
    this._defaultTemplates = null;
  }

  getTemplates() {
    if (this._templates) return this._templates;
    throw new Error('Templates not initialized. Call initialize() first.');
  }

  getDefaultTemplates() {
    if (this._defaultTemplates) return this._defaultTemplates;
    throw new Error('Default templates not initialized. Call initialize() first.');
  }

  initialize(templates, defaultTemplates) {
    this._templates = templates;
    this._defaultTemplates = defaultTemplates;
  }

  async applyOverrides(template, subtypeKey) {
    const state = await this.loadState();
    if (!state.productSpecOverrides) state.productSpecOverrides = {};
    const groupKey = this._getSubtypeGroup(subtypeKey);
    const overrides = state.productSpecOverrides[groupKey];
    if (overrides?.specs?.length) {
      template.specs = overrides.specs;
    }
  }

  _getSubtypeGroup(subtypeKey) {
    const groups = { rigid28: 'rigid_load_body', rigid30: 'rigid_load_body' };
    return groups[subtypeKey] || subtypeKey;
  }

  getGroupMembers(groupKey) {
    if (groupKey === 'rigid_load_body') return ['rigid28', 'rigid30'];
    return [groupKey];
  }

  async getCustomItemDefinitions() {
    const state = await this.loadState();
    return state.customItemDefinitions || [];
  }

  async saveCustomItemDefinitions(definitions) {
    const state = await this.loadState();
    state.customItemDefinitions = definitions;
    await this.saveState(state);
  }

  async saveSpecOverrides(groupKey, specs) {
    const state = await this.loadState();
    if (!state.productSpecOverrides) state.productSpecOverrides = {};
    state.productSpecOverrides[groupKey] = { specs };
    await this.saveState(state);
  }

  getEffectivePriceDiff(spec, opt, state) {
    if (!spec || !opt) return 0;
    let diff = (spec.priceDiffs && spec.priceDiffs[opt] !== undefined) ? spec.priceDiffs[opt] : 0;
    if (state?.adminPricing) {
      const ap = state.adminPricing;
      if (spec.id === 'floor' && opt.includes('6mm') && ap.floor6 !== undefined) diff = ap.floor6;
      if (spec.id === 'floor' && opt.includes('10mm') && ap.floor10 !== undefined) diff = ap.floor10;
      if (spec.id === 'beam' && opt.includes('Hardox') && ap.steelHardox !== undefined) diff = ap.steelHardox;
      if (spec.id === 'axles' && opt.includes('2x13T') && ap.axle2 !== undefined) diff = ap.axle2;
      if (spec.id === 'axles' && opt.includes('3x16T') && ap.axle3_16 !== undefined) diff = ap.axle3_16;
    }
    return diff;
  }
}
