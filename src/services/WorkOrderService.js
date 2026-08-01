import { apiClient } from '../api/client.js';

const PER_PAGE = 100;
const STAGES = ['Pending', 'Material Ordered', 'Cutting', 'Fabrication', 'Welding', 'Painting', 'Assembly', 'QC', 'Ready', 'Delivered'];

function specsToDisplayStrings(specifications) {
  const out = [];
  Object.entries(specifications || {}).forEach(([key, value]) => {
    if (key.endsWith('_custom_desc') || key.endsWith('_custom_price')) return;
    if (value == null || value === '') return;
    out.push(`${key}: ${value}`);
  });
  return out;
}

function toLegacy(wo) {
  const items = wo.productionItems || [];
  const first = items[0];

  let matchedProductionItem = null;
  if (typeof window !== 'undefined' && window.STATE && Array.isArray(window.STATE.productionItems)) {
    matchedProductionItem = window.STATE.productionItems.find((p) =>
      p.workOrderId === wo.id || p._backendQuoteId === wo.quotationId || p._backendId === items[0]?.id,
    ) || null;
  }

  const stageIndex = STAGES.indexOf(first?.currentStage);
  const stage = matchedProductionItem?.columnStatus
    || (first?.currentStage ? (first.currentStage === 'Delivered' ? 'Finished' : first.currentStage === 'Pending' ? 'Not Started' : 'Work in Progress') : 'Pending');
  const progress = typeof matchedProductionItem?.progressPct === 'number'
    ? matchedProductionItem.progressPct
    : (stageIndex >= 0 ? Math.round((stageIndex / (STAGES.length - 1)) * 100) : 0);

  let quoteNumber = wo.quotationNumber;
  if (!quoteNumber && typeof window !== 'undefined' && window.STATE && Array.isArray(window.STATE.quotations)) {
    const q = window.STATE.quotations.find((x) => x._backendId === wo.quotationId || x.id === wo.quotationId);
    if (q) quoteNumber = q.id;
  }

  return {
    id: wo.workOrderNumber || wo.id,
    workOrderNumber: wo.workOrderNumber || wo.id,
    _backendId: wo.id,
    quoteId: quoteNumber || wo.quotationId || null,
    quoteNumber: quoteNumber || wo.quotationId || null,
    _backendQuoteId: wo.quotationId || null,
    customerName: wo.customerName,
    product: wo.productName,
    date: (wo.createdAt || '').split('T')[0],
    approvedDate: null,
    stage,
    progress,
    specs: specsToDisplayStrings(wo.specifications),
    notes: wo.factoryNotes || null,
    dueDate: wo.dueDate || null,
    urgent: !!wo.isUrgent,
    _backendStatus: wo.status,
  };
}

export class WorkOrderService {
  async getAll() {
    const rows = [];
    let page = 1;
    let total = Infinity;
    while (rows.length < total) {
      const { data, meta } = await apiClient.get(
        `/api/work-orders?page=${page}&perPage=${PER_PAGE}`,
      );
      rows.push(...(data || []));
      total = meta?.total ?? rows.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    return rows.map(toLegacy);
  }

  async getById(id) {
    const { data } = await apiClient.get(`/api/work-orders/${id}`);
    return data ? toLegacy(data) : null;
  }

  async createFromQuotation(quotationId, factoryNotes = null, dueDate = null, isUrgent = false) {
    const { data } = await apiClient.post('/api/work-orders', {
      quotationId,
      factoryNotes,
      dueDate,
      isUrgent,
    });
    return data ? toLegacy(data) : null;
  }

  async syncAll(workOrders, quotations) {
    for (const wo of workOrders || []) {
      try {
        await this._syncOne(wo, quotations);
      } catch (e) {
        console.warn(`[WorkOrderService] sync failed for ${wo.id}:`, e.message);
      }
    }
  }

  async _syncOne(wo, quotations) {
    if (!wo._backendId) {
      const quote = (quotations || []).find(
        (q) => q.id === wo.quoteId || q._backendId === wo.quoteId,
      );
      if (!quote?._backendId) {
        console.warn(`[WorkOrderService] No backend quotation for ${wo.id}; skipping create`);
        return;
      }
      if (quote.status !== 'Approved') {
        console.warn(`[WorkOrderService] Quotation ${quote.id} not approved; cannot create ${wo.id}`);
        return;
      }
      const { data: created } = await apiClient.post('/api/work-orders', {
        quotationId: quote._backendId,
        factoryNotes: wo.notes || null,
        dueDate: wo.dueDate || null,
        isUrgent: !!wo.urgent,
      });
      wo._backendId = created.id;
      wo.id = created.workOrderNumber;
      wo._backendStatus = created.status;
      return;
    }

    if (wo._backendStatus !== 'Open') {
      return;
    }
    const body = {};
    if (wo.notes !== undefined) body.factoryNotes = wo.notes;
    if (wo.dueDate !== undefined) body.dueDate = wo.dueDate;
    if (wo.urgent !== undefined) body.isUrgent = !!wo.urgent;
    const { data: updated } = await apiClient.put(`/api/work-orders/${wo._backendId}`, body);
    wo._backendStatus = updated.status;
  }
}
