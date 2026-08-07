import { supabase } from '../database/client.js';

type RowData = Record<string, unknown>;

export class CatalogQueries {
  /** All active product templates ordered by product sort_order, then template sort_order. */
  async findAllTemplates(): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('product_templates')
      .select('id, product_id, key, name, base_price, dimensions, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /** All enabled sections ordered by display_order. */
  async findSections(): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('id, key, name, display_order')
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /** All enabled specs for a template ordered by display_order. */
  async findSpecsByTemplate(templateId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('specs')
      .select('*')
      .eq('template_id', templateId)
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /** All enabled options for a spec ordered by display_order. */
  async findOptionsBySpec(specId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('options')
      .select('*')
      .eq('spec_id', specId)
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  // ---------------------------------------------------------------------------
  // Save path (reconcile). All methods here leave existing history untouched.
  // ---------------------------------------------------------------------------

  /** Template row (any active state) by key. */
  async findTemplateByKey(key: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /** Upsert a global section by key; returns the full row. */
  async upsertSection(sectionKey: string, name: string, displayOrder: number, enabled: boolean): Promise<RowData> {
    const existing = await supabase
      .from('sections')
      .select('*')
      .eq('key', sectionKey)
      .single();

    if (existing.error && existing.error.code !== 'PGRST116') throw existing.error;

    if (existing.data) {
      const { data, error } = await supabase
        .from('sections')
        .update({ name, display_order: displayOrder, enabled })
        .eq('id', existing.data.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('sections')
      .insert({ key: sectionKey, name, display_order: displayOrder, enabled })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Find all sections (including disabled) keyed for reconciliation. */
  async findAllSections(): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('*');
    if (error) throw error;
    return data ?? [];
  }

  /** All specs for a template INCLUDING disabled ones. */
  async findAllSpecsByTemplate(templateId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('specs')
      .select('*')
      .eq('template_id', templateId);
    if (error) throw error;
    return data ?? [];
  }

  /** All options for a spec INCLUDING disabled ones. */
  async findAllOptionsBySpec(specId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('options')
      .select('*')
      .eq('spec_id', specId);
    if (error) throw error;
    return data ?? [];
  }

  /** Insert a new spec; returns full row. */
  async createSpec(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('specs')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Update an existing spec; returns full row. */
  async updateSpec(specId: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('specs')
      .update(updates)
      .eq('id', specId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Update a product template row by id; returns full row. */
  async updateTemplate(templateId: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Delete a spec row by id (options cascade via FK). */
  async deleteSpecById(specId: string): Promise<void> {
    const { error } = await supabase.from('specs').delete().eq('id', specId);
    if (error) throw error;
  }

  /** Insert a new option; return full row. */
  async createOption(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('options')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Update an existing option; return full row. */
  async updateOption(optionId: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Delete an option row by id. */
  async deleteOptionById(optionId: string): Promise<void> {
    const { error } = await supabase.from('options').delete().eq('id', optionId);
    if (error) throw error;
  }

  /** Update an existing section row by id. */
  async updateSection(sectionId: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Delete a section row by id. */
  async deleteSectionById(sectionId: string): Promise<void> {
    const { error } = await supabase.from('sections').delete().eq('id', sectionId);
    if (error) throw error;
  }
}