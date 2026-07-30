import { supabase } from '../database/client.js';
import { ProductRow } from '../database/types.js';

type RowData = Record<string, unknown>;

export class ProductQueries {
  /*** Products ***/
  async findAllProducts(): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProductRow[];
  }

  async findProductByKey(key: string): Promise<ProductRow | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ProductRow;
  }

  async createProduct(input: RowData): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const msg = error.message.toLowerCase();
        if (msg.includes('products_key')) {
          throw Object.assign(new Error('Product key must be unique'), { code: '23505_key', statusCode: 409 });
        }
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data as ProductRow;
  }

  async updateProduct(key: string, updates: RowData): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('key', key)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data as ProductRow;
  }

  /*** Templates ***/
  async findTemplatesByProduct(productId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async findTemplateByKey(productId: string, templateKey: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .eq('product_id', productId)
      .eq('key', templateKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findTemplateById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createTemplate(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_templates')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Template key must be unique within product'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async updateTemplate(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /*** Specs ***/
  async findSpecsByTemplate(templateId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('product_template_specs')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async findSpecByKey(templateId: string, specKey: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('product_template_specs')
      .select('*')
      .eq('template_id', templateId)
      .eq('spec_key', specKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findSpecById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('product_template_specs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createSpec(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_template_specs')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Spec key must be unique within template'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async updateSpec(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_template_specs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async deleteSpec(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_template_specs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /*** Options ***/
  async findOptionsBySpec(specId: string): Promise<RowData[]> {
    const { data, error } = await supabase
      .from('product_spec_options')
      .select('*')
      .eq('spec_id', specId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async findOptionById(id: string): Promise<RowData | null> {
    const { data, error } = await supabase
      .from('product_spec_options')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createOption(input: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_spec_options')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Option name must be unique within spec'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async updateOption(id: string, updates: RowData): Promise<RowData> {
    const { data, error } = await supabase
      .from('product_spec_options')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Duplicate value'), { code: '23505', statusCode: 409 });
      }
      throw error;
    }
    return data;
  }

  async deleteOption(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_spec_options')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
