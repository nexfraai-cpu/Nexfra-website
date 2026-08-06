import { apiClient } from '../api/client.js';

const PER_PAGE = 100;
const STAGES = ['Pending', 'Material Ordered', 'Cutting', 'Fabrication', 'Welding', 'Painting', 'Assembly', 'QC', 'Ready', 'Delivered'];

function stageToColumn(stage) {
  if (stage === 'Delivered') return 'Finished';
  if (stage === 'Pending') return 'Not Started';
  return 'Work in Progress';
}

function stageToProgress(stage) {
  const idx = STAGES.indexOf(stage);
  return idx >= 0 ? Math.round((idx / (STAGES.length - 1)) * 100) : 0;
}

function toLegacy(item, quotations) {
  const quote = (quotations || []).find((q) => q._backendId === item.quotationId);
  const quotationNumber = item.quotationNumber || quote?.id || null;
  const currentStage = item.currentStage || 'Pending';
  const columnStatus = item.boardColumn || stageToColumn(currentStage);
  const progressPct = typeof item.progressPercentage === 'number'
    ? item.progressPercentage
    : (item.stageProgress && Object.keys(item.stageProgress).length
      ? Math.round(Object.values(item.stageProgress).filter(Boolean).length / Math.max(1, Object.keys(item.stageProgress).length) * 100)
      : stageToProgress(currentStage));
  return {
    id: quotationNumber || item.workOrderId || item.id,
    _backendId: item.id,
    quoteId: quotationNumber || item.quotationId || item.workOrderId || null,
    quotationNumber,
    _backendQuoteId: item.quotationId || null,
    workOrderId: item.workOrderId || null,
    customerName: quote?.customerName || item.customerName || '',
    product: quote?.productName || item.productName || '',
    date: (item.createdAt || '').split('T')[0],
    columnStatus,
    progressPct,
    progressionMap: item.stageProgress || {},
    stageRecords: item.stageRecords || [],
    completedStages: item.completedStages || [],
    totalStages: item.totalStages || 0,
    isFinished: !!item.isFinished,
    remarks: {},
    stageRemarks: {},
    dueDate: null,
    urgent: false,
    dispatchedData: item.dispatchFields || {},
    currentStage,
    _backendStage: currentStage,
  };
}

export class ProductionService {
  toLegacy(item, quotations) {
    return toLegacy(item, quotations);
  }

  async fetchRaw() {
    const rows = [];
    let page = 1;
    let total = Infinity;
    while (rows.length < total) {
      const { data, meta } = await apiClient.get(
        `/api/production?page=${page}&perPage=${PER_PAGE}`,
      );
      rows.push(...(data || []));
      total = meta?.total ?? rows.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    return rows;
  }

  async fetchByWorkOrder(workOrderId) {
    const rows = [];
    let page = 1;
    let total = Infinity;
    while (rows.length < total) {
      const { data, meta } = await apiClient.get(
        `/api/production?workOrderId=${encodeURIComponent(workOrderId)}&page=${page}&perPage=${PER_PAGE}`,
      );
      rows.push(...(data || []));
      total = meta?.total ?? rows.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    return rows;
  }

  async createItem(workOrderId) {
    const { data } = await apiClient.post('/api/production', { workOrderId });
    return data;
  }

  async hydrate(quotations) {
    const rows = await this.fetchRaw();
    return rows.map((item) => toLegacy(item, quotations));
  }

  async updateItem(item) {
    if (!item || !item._backendId) {
      return { ok: false, error: 'No backend item to sync' };
    }
    const payload = {};
    if (item.progressionMap && typeof item.progressionMap === 'object') {
      payload.productionStages = Object.entries(item.progressionMap)
        .map(([stageKey, isChecked]) => {
          const stage = { stageKey, isCompleted: !!isChecked };
          if (item.stageRemarks && item.stageRemarks[stageKey] !== undefined) {
            stage.remark = item.stageRemarks[stageKey] || null;
          }
          return stage;
        });
    }
    if (item.dispatchedData && typeof item.dispatchedData === 'object') {
      payload.dispatchFields = item.dispatchedData;
    }
    if (Object.keys(payload).length === 0) {
      return { ok: true };
    }
    try {
      const { data } = await apiClient.put(`/api/production/${item._backendId}`, payload);
      return data ? { ok: true, item: toLegacy(data, []) } : { ok: true };
    } catch (e) {
      console.warn(`[ProductionService] progression sync failed for ${item.id}:`, e.message);
      return { ok: false, error: e && e.message };
    }
  }

  async syncItem(item, quotations) {
    if (!item._backendId || !item._backendStage) return;
    const targetStage = this._resolveTargetStage(item);
    if (!targetStage || targetStage === item._backendStage) return;

    try {
      const { data } = await apiClient.patch(`/api/production/${item._backendId}/stage`, {
        stageKey: targetStage,
        remark: null,
      });
      item._backendStage = data?.currentStage || item._backendStage;
    } catch (e) {
      console.warn(`[ProductionService] stage sync failed for ${item.id}:`, e.message);
    }
  }

  _resolveTargetStage(item) {
    const overrides = {
      Finished: 'Delivered',
      'Not Started': 'Pending',
      'Work in Progress': null,
    };
    return overrides[item.columnStatus] || item.currentStage || null;
  }
}
