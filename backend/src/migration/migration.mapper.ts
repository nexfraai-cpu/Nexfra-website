import { v5 as uuidv5 } from 'uuid';
import {
  LegacyState,
  MigrationBundle,
  IdMap,
  TableInsert,
  LegacyCustomer,
  LegacyEmployee,
  LegacyLog,
} from './migration.types.js';

const LEGACY_NAMESPACE = '4d1a5f2e-8c3b-4e9a-b6d0-1f2a3b4c5d6e';

export function legacyId(type: string, id: string): string {
  return uuidv5(`nexfra:${type}:${id}`, LEGACY_NAMESPACE);
}

export function mapLegacyState(state: LegacyState): MigrationBundle {
  const idMap: IdMap = {
    employees: new Map(),
    customers: new Map(),
    products: new Map(),
    productTemplates: new Map(),
    quotations: new Map(),
    workOrders: new Map(),
    sales: new Map(),
  };

  const inserts: TableInsert[] = [];

  // --- 1. EMPLOYEES ---
  const employeeRows = (state.employees ?? []).map((emp: LegacyEmployee) => {
    const id = legacyId('employee', emp.id);
    idMap.employees.set(emp.id, id);
    return {
      id,
      auth_id: null,
      employee_number: emp.id,
      full_name: emp.fullName ?? '',
      email: emp.email ?? '',
      phone: emp.phone ?? null,
      employee_code: emp.employeeCode ?? null,
      role: normalizeEmployeeRole(emp.role),
      status: emp.status === 'Disabled' ? 'Disabled' : 'Active',
      last_login_at: emp.lastLogin ?? null,
      created_at: emp.createdDate ?? new Date().toISOString(),
      created_by: null,
      updated_at: new Date().toISOString(),
      deleted_at: emp.isDeleted ? new Date().toISOString() : null,
    };
  });
  if (employeeRows.length) inserts.push({ table: 'employees', rows: employeeRows });

  // --- 2. CUSTOMERS ---
  const customerRows = (state.customers ?? []).map((cust: LegacyCustomer) => {
    const id = legacyId('customer', cust.id);
    idMap.customers.set(cust.id, id);
    return {
      id,
      customer_number: cust.id,
      name: cust.name ?? '',
      company: cust.company ?? '',
      gst: normalizeCustomerGst(cust.gst),
      phone: cust.phone ?? null,
      email: cust.email ?? null,
      address: cust.address ?? null,
      vehicles: cust.vehicles ?? [],
      outstanding: cust.outstanding ?? 0,
      created_at: new Date().toISOString(),
      created_by: null,
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
  });
  if (customerRows.length) inserts.push({ table: 'customers', rows: customerRows });

  // --- 3. PRODUCTS + TEMPLATES + SPECS + OPTIONS ---
  const productRows: Record<string, unknown>[] = [];
  const templateRows: Record<string, unknown>[] = [];
  const specRows: Record<string, unknown>[] = [];
  const optionRows: Record<string, unknown>[] = [];
  let productSort = 0;

  for (const [productKey, product] of Object.entries(state.products ?? {})) {
    const productId = legacyId('product', productKey);
    idMap.products.set(productKey, productId);
    productRows.push({
      id: productId,
      key: productKey,
      name: product.name ?? '',
      description: null,
      sort_order: productSort++,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const templateId = legacyId('template', productKey);
    idMap.productTemplates.set(productKey, templateId);
    templateRows.push({
      id: templateId,
      product_id: productId,
      key: productKey,
      name: product.name ?? '',
      base_price: product.basePrice ?? 0,
      dimensions: { variants: product.templates ?? [] },
      sort_order: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    let specSort = 0;
    for (const spec of product.specs ?? []) {
      const specId = legacyId('spec', `${productKey}:${spec.id}`);
      specRows.push({
        id: specId,
        template_id: templateId,
        spec_key: spec.id,
        name: spec.name ?? '',
        section: spec.section ?? 'General',
        spec_type: spec.type ?? 'dropdown',
        default_value: spec.default ?? spec.defaultValue ?? null,
        sort_order: specSort++,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const defaultValue = spec.default ?? spec.defaultValue;
      let optSort = 0;
      for (const opt of spec.options ?? []) {
        optionRows.push({
          id: legacyId('option', `${productKey}:${spec.id}:${opt.name}`),
          spec_id: specId,
          option_name: opt.name,
          price_diff: opt.priceDiff ?? 0,
          is_default: opt.name === defaultValue,
          sort_order: optSort++,
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  if (productRows.length) inserts.push({ table: 'products', rows: productRows });
  if (templateRows.length) inserts.push({ table: 'product_templates', rows: templateRows });
  if (specRows.length) inserts.push({ table: 'product_template_specs', rows: specRows });
  if (optionRows.length) inserts.push({ table: 'product_spec_options', rows: optionRows });

  // --- 4. QUOTATIONS + SPEC VALUES ---
  const quotationRows: Record<string, unknown>[] = [];
  const specValueRows: Record<string, unknown>[] = [];
  for (const quote of state.quotations ?? []) {
    const quoteId = legacyId('quotation', quote.id);
    idMap.quotations.set(quote.id, quoteId);
    quotationRows.push({
      id: quoteId,
      quotation_number: quote.id,
      version: 1,
      customer_id: quote.customerId ? idMap.customers.get(quote.customerId) ?? null : null,
      customer_name: quote.customerName ?? '',
      customer_details: quote.model ? { model: quote.model } : {},
      product_key: quote.subtype ?? null,
      template_key: quote.subtype ?? null,
      capacity: quote.capacity ?? null,
      dimensions: quote.dimensions ?? {},
      total: quote.total ?? 0,
      manual_total: null,
      gst_rate: 18,
      order_qty: quote.orderQty ?? 1,
      status: normalizeQuotationStatus(quote.status),
      terms: quote.terms ?? [],
      scope_of_work: quote.scopeOfWork ?? null,
      bank_details: quote.bankDetails ?? {},
      notes: null,
      approved_by: null,
      approved_at: null,
      denied_by: null,
      denied_at: null,
      denied_reason: null,
      created_by: null,
      created_at: quote.createdAt ?? quote.date ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    let specValueSort = 0;
    const specMap = quote.specs ?? {};
    const notRequired = quote.notRequired ?? {};
    const specKeys = new Set<string>();
    Object.keys(specMap).forEach((k) => {
      if (k.endsWith('_custom_desc') || k.endsWith('_custom_price')) return;
      specKeys.add(k);
    });
    Object.keys(notRequired).forEach((k) => specKeys.add(k));

    specKeys.forEach((specKey) => {
      specValueRows.push({
        id: legacyId('specvalue', `${quote.id}:${specKey}`),
        quotation_id: quoteId,
        spec_key: specKey,
        spec_name: resolveSpecName(state, quote.subtype, specKey),
        section: 'General',
        selected_value: typeof specMap[specKey] === 'string' ? (specMap[specKey] as string) : specMap[specKey] ?? null,
        custom_description: typeof specMap[`${specKey}_custom_desc`] === 'string' ? (specMap[`${specKey}_custom_desc`] as string) : null,
        custom_price: typeof specMap[`${specKey}_custom_price`] === 'number' ? (specMap[`${specKey}_custom_price`] as number) : null,
        is_not_required: !!notRequired[specKey],
        effective_price_diff: 0,
        sort_order: specValueSort++,
      });
    });
  }
  if (quotationRows.length) inserts.push({ table: 'quotations', rows: quotationRows });
  if (specValueRows.length) inserts.push({ table: 'quotation_spec_values', rows: specValueRows });

  // --- 5. WORK ORDERS + PRODUCTION ITEMS ---
  const workOrderRows: Record<string, unknown>[] = [];
  const productionRows: Record<string, unknown>[] = [];
  const stageRecordRows: Record<string, unknown>[] = [];

  const quoteToWorkOrder = new Map<string, string>();
  for (const wo of state.workOrders ?? []) {
    const woId = legacyId('workorder', wo.id);
    idMap.workOrders.set(wo.id, woId);
    if (wo.quoteId) quoteToWorkOrder.set(wo.quoteId, woId);
    workOrderRows.push({
      id: woId,
      work_order_number: wo.id,
      version: 1,
      quotation_id: wo.quoteId ? idMap.quotations.get(wo.quoteId) ?? null : null,
      customer_name: wo.customerName ?? '',
      product_name: wo.product ?? '',
      specifications: wo.specs ?? [],
      dimensions: {},
      colour: null,
      quantity: 1,
      factory_notes: wo.notes ?? null,
      due_date: wo.dueDate ?? null,
      is_urgent: !!wo.urgent,
      status: normalizeWorkOrderStatus(wo.stage),
      booked_by: null,
      approved_by: null,
      created_at: wo.date ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });
  }
  if (workOrderRows.length) inserts.push({ table: 'work_orders', rows: workOrderRows });

  for (const pi of state.productionItems ?? []) {
    const piId = legacyId('productionitem', pi.id);
    const workOrderId = pi.quoteId ? quoteToWorkOrder.get(pi.quoteId) ?? null : null;
    productionRows.push({
      id: piId,
      work_order_id: workOrderId,
      quotation_id: pi.quoteId ? idMap.quotations.get(pi.quoteId) ?? null : null,
      current_stage: normalizeProductionStage(pi.columnStatus),
      stage_progress: pi.progressionMap ?? {},
      dispatch_fields: pi.remarks ?? {},
      started_at: pi.date ?? null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });
  }
  if (productionRows.length) inserts.push({ table: 'production_items', rows: productionRows });
  if (stageRecordRows.length) inserts.push({ table: 'production_stage_records', rows: stageRecordRows });

  // --- 6. CHASSIS RECORDS ---
  const chassisRows: Record<string, unknown>[] = [];
  for (const cr of state.chassisRecords ?? []) {
    chassisRows.push({
      id: legacyId('chassis', cr.id),
      work_order_id: cr.workOrderId ? idMap.workOrders.get(cr.workOrderId) ?? null : null,
      customer_id: null,
      field: cr.field ?? null,
      brand: cr.brand ?? null,
      model: cr.model ?? null,
      chassis_number: cr.chassisNumber ?? null,
      arrival_date: cr.arrivalDate ?? null,
      customer_name: null,
      product_name: null,
      notes: cr.outDate ?? null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });
  }
  if (chassisRows.length) inserts.push({ table: 'chassis_records', rows: chassisRows });

  // --- 7. SALES + PAYMENTS ---
  const saleRows: Record<string, unknown>[] = [];
  for (const sale of state.sales ?? []) {
    const saleId = legacyId('sale', sale.invoiceId);
    idMap.sales.set(sale.invoiceId, saleId);
    saleRows.push({
      id: saleId,
      invoice_number: sale.invoiceId,
      quotation_id: null,
      customer_name: sale.customerName ?? '',
      product_name: sale.product ?? '',
      amount: sale.amount ?? 0,
      status: normalizeSaleStatus(sale.status),
      delivery_date: null,
      notes: null,
      created_by: null,
      created_at: sale.date ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });
  }
  if (saleRows.length) inserts.push({ table: 'sales', rows: saleRows });

  const paymentRows: Record<string, unknown>[] = [];
  for (const pay of state.payments ?? []) {
    paymentRows.push({
      id: legacyId('payment', pay.id),
      payment_number: pay.id,
      sale_id: pay.invoiceId ? idMap.sales.get(pay.invoiceId) ?? null : null,
      amount: pay.amount ?? 0,
      mode: normalizePaymentMode(pay.mode),
      reference: pay.ref ?? null,
      payment_date: pay.date ?? new Date().toISOString().split('T')[0],
      notes: null,
      received_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });
  }
  if (paymentRows.length) inserts.push({ table: 'payments', rows: paymentRows });

  // --- 8. AUDIT LOGS (from STATE.logs) ---
  const auditRows: Record<string, unknown>[] = [];
  (state.logs ?? []).forEach((log: LegacyLog, index: number) => {
    auditRows.push({
      id: legacyId('audit', `${index}:${log.message ?? ''}`),
      employee_id: null,
      action: 'legacy_log',
      entity_type: 'system',
      entity_id: null,
      description: log.message ?? '',
      metadata: log.time ? { time: log.time } : {},
      created_at: new Date().toISOString(),
    });
  });
  if (auditRows.length) inserts.push({ table: 'audit_logs', rows: auditRows });

  // --- 9. CUSTOM ITEM DEFINITIONS ---
  const customItemRows: Record<string, unknown>[] = [];
  for (const def of state.customItemDefinitions ?? []) {
    customItemRows.push({
      id: legacyId('customitem', def.id ?? def.name),
      name: def.name,
      description: def.fields ? JSON.stringify(def.fields) : null,
      default_price: 0,
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  if (customItemRows.length) inserts.push({ table: 'custom_item_definitions', rows: customItemRows });

  // --- 10. PRODUCT SPEC OVERRIDES ---
  const overrideRows: Record<string, unknown>[] = [];
  for (const [groupKey, group] of Object.entries(state.productSpecOverrides ?? {})) {
    for (const spec of group.specs ?? []) {
      overrideRows.push({
        id: legacyId('override', `${groupKey}:${spec.id}`),
        template_key: groupKey,
        spec_key: spec.id,
        override_data: { ...spec },
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  if (overrideRows.length) inserts.push({ table: 'product_spec_overrides', rows: overrideRows });

  // --- 11. APP SETTINGS (admin pricing + legacy counters) ---
  const settingsRows: Record<string, unknown>[] = [];
  if (state.adminPricing && Object.keys(state.adminPricing).length) {
    settingsRows.push({
      id: legacyId('setting', 'pricing_coefficients'),
      key: 'pricing_coefficients',
      value: state.adminPricing,
      description: 'Migrated from legacy localStorage adminPricing',
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  settingsRows.push({
    id: legacyId('setting', 'legacy_counters'),
    key: 'legacy_counters',
    value: {
      quotationCounter: state.quotationCounter ?? 0,
      employeeCounter: state.employeeCounter ?? 0,
    },
    description: 'Migrated from legacy localStorage counters',
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  inserts.push({ table: 'app_settings', rows: settingsRows });

  return { idMap, inserts };
}

function normalizeEmployeeRole(role: string | undefined): string {
  const r = (role ?? 'sales').toLowerCase();
  return ['admin', 'sales', 'finance', 'manager'].includes(r) ? r : 'sales';
}

function normalizeCustomerGst(gst: string | null | undefined): string | null {
  if (!gst || gst === 'Pending') return null;
  return gst;
}

function normalizeQuotationStatus(status: string | undefined): string {
  switch (status) {
    case 'Approved':
      return 'Approved';
    case 'Denied':
      return 'Denied';
    case 'Draft':
      return 'Draft';
    case 'Pending Approval':
    case 'Pending':
    default:
      return 'Pending';
  }
}

function normalizeWorkOrderStatus(stage: string | undefined): string {
  switch (stage) {
    case 'Completed':
      return 'Completed';
    case 'In Progress':
      return 'In Progress';
    case 'Open':
      return 'Open';
    case 'Pending':
    default:
      return 'Open';
  }
}

function normalizeProductionStage(columnStatus: string | undefined): string {
  switch (columnStatus) {
    case 'Material Ordered':
    case 'Cutting':
    case 'Fabrication':
    case 'Welding':
    case 'Painting':
    case 'Assembly':
    case 'QC':
    case 'Ready':
    case 'Delivered':
      return columnStatus;
    case 'Not Started':
    case 'Pending':
    default:
      return 'Pending';
  }
}

function normalizeSaleStatus(status: string | undefined): string {
  const s = status ?? 'Pending';
  return ['Pending', 'Partial', 'Paid'].includes(s) ? s : 'Pending';
}

function normalizePaymentMode(mode: string | undefined): string {
  const m = mode ?? 'Cash';
  return ['Cash', 'RTGS', 'Cheque', 'UPI', 'Card', 'Other'].includes(m) ? m : 'Cash';
}

function resolveSpecName(state: LegacyState, productKey: string | undefined, specKey: string): string {
  const product = productKey ? state.products?.[productKey] : undefined;
  const spec = product?.specs?.find((s) => s.id === specKey);
  if (spec?.name) return spec.name;
  const override = productKey ? state.productSpecOverrides?.[productKey] : undefined;
  const overrideSpec = override?.specs?.find((s) => s.id === specKey);
  return overrideSpec?.name ?? specKey;
}
