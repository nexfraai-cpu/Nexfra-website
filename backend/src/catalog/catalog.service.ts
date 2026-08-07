import { CatalogQueries } from './catalog.queries.js';
import { WizardCatalog, WizardSpecDefinition } from './catalog.types.js';
import {
  SaveTemplateInput,
  SaveSpecInput,
  SaveOptionInput,
} from './catalog.schema.js';
import { logger } from '../config/logger.js';

type RowData = Record<string, unknown>;

interface TemplateSnapshot {
  templateRow: RowData;
  sections: RowData[];
  specs: RowData[];
  options: RowData[];
}

const DEFAULT_SECTION_STATES = {
  material: 'Steel Sheets & Material Grade',
  chassis: 'Structural Axil & Suspension',
  hydraulic: 'Tipping Hydraulics & Cylinder Kit',
  painting: 'Primer, Coatings & Finishing Colour',
  accessories: 'Fitted Accessories & Safety Marker Lights',
  dimensions: 'Product Dimensions (Feet/Inches)',
  subframe: 'Subframe',
};

/** Fallback section key used when a spec references an unregistered section. */
const FALLBACK_SECTION_KEY = 'general';

export class CatalogService {
  constructor(private queries: CatalogQueries) {}

  /**
   * Reconstruct the quotation builder's component definitions from the
   * database in the exact shape consumed by WIZARD_PRODUCT_TEMPLATES in erp.js.
   *
   * Returns an object keyed by template key (e.g. `flatbed`) where each entry
   * contains `name`, `basePrice`, `dimensions` and `specs` (each spec with
   * `id`, `name`, `section`, `type`, `options`, `defaultValue`, `priceDiffs`).
   */
  async getComponentDefinitions(includeDisabled = false): Promise<WizardCatalog> {
    const templates = await this.queries.findAllTemplates();
    const sections = includeDisabled
      ? await this.queries.findAllSections()
      : await this.queries.findSections();

    const sectionKeyById = new Map<string, string>();
    for (const section of sections) {
      sectionKeyById.set(section.id as string, section.key as string);
    }
    const sectionNameByKey = new Map<string, string>();
    for (const section of sections) {
      sectionNameByKey.set(section.key as string, section.name as string);
    }

    const catalog: WizardCatalog = {};

    for (const template of templates) {
      const templateId = template.id as string;
      const specs = includeDisabled
        ? await this.queries.findAllSpecsByTemplate(templateId)
        : await this.queries.findSpecsByTemplate(templateId);
      const wizardSpecs: WizardSpecDefinition[] = [];

      for (const spec of specs) {
        const options = includeDisabled
          ? await this.queries.findAllOptionsBySpec(spec.id as string)
          : await this.queries.findOptionsBySpec(spec.id as string);
        wizardSpecs.push(this._toWizardSpec(spec, options, sectionKeyById, sectionNameByKey, includeDisabled));
      }

      catalog[template.key as string] = {
        name: template.name as string,
        basePrice: Number(template.base_price),
        dimensions: (template.dimensions as Record<string, unknown>) ?? {},
        specs: wizardSpecs,
      };
    }

    logger.info(
      { templateCount: templates.length, specCount: Object.values(catalog).reduce((n, t) => n + t.specs.length, 0), includeDisabled },
      'Component catalog reconstructed from database',
    );

    return catalog;
  }

  private _toWizardSpec(
    spec: RowData,
    options: RowData[],
    sectionKeyById: Map<string, string>,
    sectionNameByKey: Map<string, string>,
    includeDisabled: boolean,
  ): WizardSpecDefinition {
    const optionNames: string[] = [];
    const priceDiffs: Record<string, number> = {};
    const enabledOptions: string[] = [];
    let defaultValue = (spec.default_value as string | null) ?? '';

    for (const opt of options) {
      const name = opt.name as string;
      optionNames.push(name);
      priceDiffs[name] = Number(opt.price_difference);
      if (opt.enabled !== false) enabledOptions.push(name);
      if (opt.is_default === true && defaultValue === '') {
        defaultValue = name;
      }
    }

    const sectionId = spec.section_id as string;
    const rawSection = sectionKeyById.get(sectionId) ?? '';
    const section =
      rawSection ||
      (DEFAULT_SECTION_STATES[sectionId as keyof typeof DEFAULT_SECTION_STATES]
        ? (sectionId as string)
        : sectionNameByKey.get(rawSection) || FALLBACK_SECTION_KEY);

    return {
      id: spec.spec_key as string,
      name: spec.name as string,
      section,
      type: spec.control_type as string,
      options: includeDisabled ? optionNames : enabledOptions,
      defaultValue,
      priceDiffs,
      required: (spec.required as boolean | null) ?? true,
      enabled: (spec.enabled as boolean | null) ?? true,
      enabledOptions,
    };
  }

  // ---------------------------------------------------------------------------
  // Save path — reconcile the catalog tables from an edited payload.
  //
  // supabase-js has no multi-statement transaction API, so writes are
  // orchestrated here (backend-orchestrated upserts). To preserve
  // "all-or-nothing" semantics on failure, the affected rows are snapshotted
  // before mutation and restored (compensation) if any step fails.
  // ---------------------------------------------------------------------------

  /**
   * Persist edited component definitions for one or more templates.
   *
   * Returns the fully reconstructed catalog so the caller can immediately
   * refresh the in-memory definitions from the same source of truth.
   */
  async saveComponentDefinitions(templates: SaveTemplateInput[]): Promise<WizardCatalog> {
    const snapshots = new Map<string, TemplateSnapshot>(); // templateId -> snapshot rows
    const results: Array<{ key: string; specs: number; options: number }> = [];

    // W8: reject duplicate option names up front so a name collision never
    // hits the DB unique constraint and aborts an otherwise valid save.
    for (const template of templates) {
      for (const spec of template.specs) {
        const names = (spec.options ?? []).map((o) => o.name);
        const seen = new Set<string>();
        const dupes = names.filter((n) => {
          if (seen.has(n)) return true;
          seen.add(n);
          return false;
        });
        if (dupes.length > 0) {
          throw new Error(
            `Duplicate option name '${dupes[0]}' in spec '${spec.name}' of template '${template.key}'. ` +
              'Each option within a spec must have a unique name.',
          );
        }
      }
    }

    try {
      for (const template of templates) {
        const result = await this._saveTemplate(template, snapshots);
        results.push(result);
      }
    } catch (err) {
      // Compensation: restore every snapshotted table row, then rethrow.
      await this._rollback(snapshots);
      logger.error({ err: (err as Error).message }, 'Catalog save failed; rolled back');
      throw err;
    }

    logger.info(
      { templates: results.map((r) => `${r.key}(${r.specs}s/${r.options}o)`).join(', ') },
      'Component catalog saved',
    );

    return this.getComponentDefinitions();
  }

  private async _saveTemplate(
    template: SaveTemplateInput,
    snapshots: Map<string, TemplateSnapshot>,
  ): Promise<{ key: string; specs: number; options: number }> {
    const templateRow = await this.queries.findTemplateByKey(template.key);
    if (!templateRow) {
      throw new Error(`Product template '${template.key}' does not exist`);
    }
    const templateId = templateRow.id as string;

    // Snapshot everything we will touch for this template: template row,
    // all sections (global table may be shared, so capture the whole set so a
    // section-level change made by this save can be undone on failure), and the
    // specs/options under this template.
    if (!snapshots.has(templateId)) {
      const sections = await this.queries.findAllSections();
      const specs = await this.queries.findAllSpecsByTemplate(templateId);
      const options: RowData[] = [];
      for (const spec of specs) {
        options.push(...(await this.queries.findAllOptionsBySpec(spec.id as string)));
      }
      snapshots.set(templateId, { templateRow, sections, specs, options });
    }

    // 1. Template-level fields (name / base price / dimensions).
    await this.queries.updateTemplate(templateId, {
      name: template.name,
      base_price: template.basePrice,
      dimensions: template.dimensions ?? {},
    });

    // 2. Sections (global). Upsert referenced sections and capture key -> id.
    const sectionKeyToId = new Map<string, string>();
    const allSections = await this.queries.findAllSections();
    const sectionByKey = new Map<string, RowData>();
    for (const section of allSections) sectionByKey.set(section.key as string, section);

    const submittedSections = template.sections ?? [];
    for (let sIdx = 0; sIdx < submittedSections.length; sIdx += 1) {
      const section = submittedSections[sIdx];
      const key = section.id;
      if (!sectionKeyToId.has(key)) {
        const existing = sectionByKey.get(key);
        const sectionRow = await this.queries.upsertSection(
          key,
          section.name || (existing ? (existing.name as string) : key),
          sIdx,
          section.enabled ?? true,
        );
        sectionKeyToId.set(key, sectionRow.id as string);
      }
    }

    // Fallback: register any section referenced by specs that was not declared.
    for (const spec of template.specs) {
      const key = spec.section;
      if (!sectionKeyToId.has(key)) {
        const existing = sectionByKey.get(key);
        const sectionRow = await this.queries.upsertSection(
          key,
          existing ? (existing.name as string) : key,
          sectionKeyToId.size,
          true,
        );
        sectionKeyToId.set(key, sectionRow.id as string);
      }
    }

    // 3. Specs — reconcile by stable spec_key (spec.id). Existing rows are
    //    updated in place; new rows are inserted; removed rows are deleted.
    const existingSpecs = await this.queries.findAllSpecsByTemplate(templateId);
    const existingSpecByKey = new Map<string, RowData>();
    for (const spec of existingSpecs) existingSpecByKey.set(spec.spec_key as string, spec);

    const submittedKeys = new Set<string>();
    let specCount = 0;
    let optionCount = 0;

    template.specs.forEach((spec: SaveSpecInput) => {
      submittedKeys.add(spec.id);
    });

    // Delete removed specs (their options cascade).
    for (const existing of existingSpecs) {
      const key = existing.spec_key as string;
      if (!submittedKeys.has(key)) {
        await this.queries.deleteSpecById(existing.id as string);
      }
    }

    // Upsert submitted specs in order.
    for (const spec of template.specs) {
      const sectionId = sectionKeyToId.get(spec.section);
      if (!sectionId) {
        throw new Error(`Section '${spec.section}' could not be resolved`);
      }

      const specRow: RowData = {
        section_id: sectionId,
        name: spec.name,
        control_type: spec.type,
        default_value: spec.defaultValue ?? '',
        display_order: template.specs.indexOf(spec),
        enabled: spec.enabled ?? true,
        required: spec.required ?? true,
      };

      const existing = existingSpecByKey.get(spec.id);
      if (existing) {
        await this.queries.updateSpec(existing.id as string, specRow);
      } else {
        await this.queries.createSpec({ ...specRow, template_id: templateId, spec_key: spec.id });
      }
      specCount += 1;

      // 4. Options — reconcile by name within this spec.
      const specId = existing ? (existing.id as string) : (await this._resolveSpecId(templateId, spec.id));
      optionCount += await this._saveOptions(specId, spec.options ?? []);
    }

    return { key: template.key, specs: specCount, options: optionCount };
  }

  /** Resolve the spec row id after a create/update for its option writes. */
  private async _resolveSpecId(templateId: string, specKey: string): Promise<string> {
    const rows = await this.queries.findAllSpecsByTemplate(templateId);
    const found = rows.find((r) => r.spec_key === specKey);
    if (!found) throw new Error(`Spec '${specKey}' could not be resolved`);
    return found.id as string;
  }

  /** Reconcile a spec's options by name; returns number of options written. */
  private async _saveOptions(specId: string, options: SaveOptionInput[]): Promise<number> {
    const existing = await this.queries.findAllOptionsBySpec(specId);
    const existingByName = new Map<string, RowData>();
    for (const opt of existing) existingByName.set(opt.name as string, opt);

    const submittedNames = new Set(options.map((o) => o.name));
    for (const opt of existing) {
      if (!submittedNames.has(opt.name as string)) {
        await this.queries.deleteOptionById(opt.id as string);
      }
    }

    for (const opt of options) {
      const row: RowData = {
        name: opt.name,
        price_difference: opt.priceDifference ?? 0,
        is_default: opt.isDefault ?? false,
        display_order: options.indexOf(opt),
        enabled: opt.enabled ?? true,
      };
      const existingRow = existingByName.get(opt.name);
      if (existingRow) {
        await this.queries.updateOption(existingRow.id as string, row);
      } else {
        await this.queries.createOption({ ...row, spec_id: specId });
      }
    }

    return options.length;
  }

  /** Restore every snapshotted row after a failed save. */
  private async _rollback(snapshots: Map<string, TemplateSnapshot>): Promise<void> {
    for (const [templateId, snapshot] of snapshots) {
      const { templateRow, sections, specs, options } = snapshot;

      // Restore the global sections table to its snapshot state. Sections are
      // shared globally, so first delete any section inserted during the save
      // (present now but not in the snapshot), then restore the snapshot's rows.
      try {
        const currentSections = await this.queries.findAllSections();
        const snapshotKeys = new Set(
          sections.map((s) => (s.key as string) ?? String(s.id)),
        );
        const seenIds = new Set<string>();
        for (const section of sections) {
          seenIds.add(section.id as string);
        }
        for (const current of currentSections) {
          const key = (current.key as string) ?? String(current.id);
          // Drop any section that is not part of the snapshot (created by save).
          if (!snapshotKeys.has(key) && !seenIds.has(current.id as string)) {
            await this.queries.deleteSectionById(current.id as string);
          }
        }
        for (const section of sections) {
          await this.queries.updateSection(section.id as string, {
            key: section.key as string,
            name: section.name as string,
            display_order: section.display_order as number,
            enabled: section.enabled as boolean,
          });
        }
      } catch (err) {
        logger.error({ err: (err as Error).message, templateId }, 'Rollback: section restore failed');
      }

      try {
        // Restore template-level fields.
        await this.queries.updateTemplate(templateId, {
          name: templateRow.name as string,
          base_price: templateRow.base_price as number,
          dimensions: templateRow.dimensions ?? {},
        });
      } catch (err) {
        logger.error({ err: (err as Error).message, templateId }, 'Rollback: template restore failed');
      }

      try {
        // Delete everything we may have inserted, then re-insert the snapshot.
        const current = await this.queries.findAllSpecsByTemplate(templateId);
        for (const spec of current) {
          await this.queries.deleteSpecById(spec.id as string);
        }
        for (const spec of specs) {
          await this.queries.createSpec(spec);
        }
        for (const opt of options) {
          await this.queries.createOption(opt);
        }
      } catch (err) {
        logger.error({ err: (err as Error).message, templateId }, 'Rollback: spec/option restore failed');
      }
    }
  }
}

/** Reconstructed response type re-exported for the controller. */
export type { WizardCatalog };