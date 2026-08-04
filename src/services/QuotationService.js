import { apiClient } from '../api/client.js';

const PER_PAGE = 100;

const TEMPLATE_NAMES = {
  flatbed: 'Flat Bed Trailer',
  sidewall: 'Side Wall Trailer',
  tiptrailer: 'Tip Trailer',
  boxbody: 'Box Body Tipper',
  rockbody: 'Rock Body Tipper',
  rigid28: '28 Feet Rigid Load Body',
  rigid30: '30 Feet Rigid Load Body',
  rigid: 'Rigid Load Body',
};

const SUBTYPE_PRODUCT = {
  flatbed: 'trailer',
  sidewall: 'trailer',
  tiptrailer: 'trailer',
  boxbody: 'tipper',
  rockbody: 'tipper',
  rigid28: 'rigid',
  rigid30: 'rigid',
  rigid: 'rigid',
};

export function mapStatusToLegacy(status) {
  if (status === 'Pending') return 'Pending Approval';
  return status;
}

export function mapStatusToBackend(status) {
  if (status === 'Pending Approval') return 'Pending';
  return status;
}

function buildSpecsFromValues(specValues) {
  const specs = {};
  const notRequired = {};
  const diffs = {};
  (specValues || []).forEach((sv) => {
    if (!sv.specKey) return;
    specs[sv.specKey] = sv.selectedValue ?? sv.customDescription ?? '';
    if (sv.customDescription) specs[`${sv.specKey}_custom_desc`] = sv.customDescription;
    if (sv.customPrice != null) specs[`${sv.specKey}_custom_price`] = sv.customPrice;
    if (sv.effectivePriceDiff != null) diffs[sv.specKey] = Number(sv.effectivePriceDiff);
    if (sv.isNotRequired) notRequired[sv.specKey] = true;
  });
  return { specs, notRequired, diffs };
}

function buildSpecValuesFromLegacy(quote) {
  const specValues = [];
  const specs = quote.specs || {};
  const diffs = quote._specDiffs || {};
  Object.keys(specs).forEach((key) => {
    if (key.endsWith('_custom_desc') || key.endsWith('_custom_price')) return;
    specValues.push({
      specKey: key,
      specName: key,
      section: '',
      selectedValue: specs[key],
      customDescription: specs[`${key}_custom_desc`] ?? null,
      customPrice: specs[`${key}_custom_price`] ?? null,
      effectivePriceDiff: diffs[key] != null ? diffs[key] : null,
      isNotRequired: !!(quote.notRequired && quote.notRequired[key]),
    });
  });
  return specValues;
}

function toLegacy(q) {
  const name = TEMPLATE_NAMES[q.templateKey] || q.templateKey || 'Custom Vehicle';
  const { specs, notRequired, diffs } = buildSpecsFromValues(q.specValues);
  return {
    id: q.quotationNumber,
    _backendId: q.id,
    _backendStatus: q.status,
    subtype: q.templateKey || null,
    customerId: q.customerId || null,
    customerName: q.customerName,
    productName: q.productKey ? name : 'Custom Vehicle',
    model: 'Commercial Vehicle',
    date: (q.createdAt || '').split('T')[0],
    createdAt: q.createdAt,
    total: q.total ?? 0,
    status: mapStatusToLegacy(q.status),
    orderQty: q.orderQty ?? 1,
    gstRate: q.gstRate ?? 18,
    capacity: q.capacity || 'NA',
    dimensions: q.dimensions || {},
    scopeOfWork: q.scopeOfWork || 'As Mentioned above',
    terms: q.terms || [],
    bankDetails: q.bankDetails || {},
    financeOwner: q.financeOwner ?? null,
    paymentDueDate: q.paymentDueDate ?? null,
    specs: specs || {},
    notRequired: notRequired || {},
    _specDiffs: diffs || {},
  };
}

function toBackendCreate(quote) {
  const subtype = quote.subtype || quote.templateKey || null;
  const manualTotal = typeof quote.manualTotal === 'number' ? quote.manualTotal : null;
  const persistedTotal = !manualTotal && typeof quote.total === 'number'
    ? quote.total
    : manualTotal;

  return {
    customerId: quote.customerId && !String(quote.customerId).startsWith('CUST-')
      ? quote.customerId
      : null,
    customerName: quote.customerName || 'Valued Client',
    productKey: SUBTYPE_PRODUCT[subtype] || quote.productKey || null,
    templateKey: subtype,
    capacity: quote.capacity || null,
    dimensions: quote.dimensions || {},
    manualTotal,
    total: persistedTotal,
    gstRate: quote.gstRate ?? 18,
    orderQty: quote.orderQty || 1,
    terms: quote.terms || [],
    scopeOfWork: quote.scopeOfWork || null,
    bankDetails: quote.bankDetails || {},
    specValues: buildSpecValuesFromLegacy(quote),
    customItems: (quote.customItems || []).map((ci, i) => ({
      name: ci.name || '',
      description: ci.description ?? null,
      quantity: ci.qty ?? ci.quantity ?? 1,
      price: ci.price ?? 0,
      sortOrder: ci.sortOrder ?? i,
    })),
  };
}

function toUuid(id) {
  if (!id) return '';
  if (typeof id === 'object') return id._backendId || id.id || '';
  const idStr = String(id);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idStr)) {
    return idStr;
  }
  if (typeof window !== 'undefined' && window.STATE && Array.isArray(window.STATE.quotations)) {
    const found = window.STATE.quotations.find((q) => q.id === idStr || q.quotationNumber === idStr || q._backendId === idStr);
    if (found && found._backendId) {
      return found._backendId;
    }
  }
  return idStr;
}

export class QuotationService {
  async getAll(options = {}) {
    const { financeView } = options;
    const rows = [];
    let page = 1;
    let total = Infinity;
    const viewParam = financeView ? `&financeView=${financeView}` : '';
    while (rows.length < total) {
      const response = await apiClient.get(
        `/api/quotations?page=${page}&perPage=${PER_PAGE}${viewParam}`,
      );
      console.log('[Frontend response received from GET /api/quotations]:', response);
      const { data, meta } = response || {};
      rows.push(...(data || []));
      total = meta?.total ?? rows.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    console.log('[Frontend QuotationService.getAll] returning mapped rows:', rows.map(toLegacy));
    return rows.map(toLegacy);
  }

  async getById(id) {
    const targetId = toUuid(id);
    const { data } = await apiClient.get(`/api/quotations/${targetId}`);
    if (!data) return null;
    const legacy = toLegacy(data);
    const { specs, notRequired } = buildSpecsFromValues(data.specValues);
    if (Object.keys(specs).length > 0) legacy.specs = specs;
    if (Object.keys(notRequired).length > 0) legacy.notRequired = notRequired;
    legacy.customItems = (data.customItems || []).map((ci) => ({
      name: ci.name,
      qty: ci.quantity,
      price: ci.price,
    }));
    legacy._backendStatus = data.status;
    legacy._lastSyncedPayload = JSON.stringify(toBackendCreate(legacy));
    return legacy;
  }

  async create(data) {
    const { data: created } = await apiClient.post('/api/quotations', toBackendCreate(data));
    const legacy = toLegacy(created);
    const { specs, notRequired } = buildSpecsFromValues(created.specValues);
    legacy.specs = Object.keys(specs).length > 0 ? specs : (data.specs || {});
    legacy.notRequired = Object.keys(notRequired).length > 0 ? notRequired : (data.notRequired || {});
    legacy.customItems = (created.customItems || []).map((ci) => ({
      name: ci.name,
      qty: ci.quantity,
      price: ci.price,
    }));
    legacy._lastSyncedPayload = JSON.stringify(toBackendCreate(data));
    return legacy;
  }

  async update(id, data) {
    const targetId = toUuid(id);
    const { data: updated } = await apiClient.put(`/api/quotations/${targetId}`, toBackendCreate(data));
    const legacy = toLegacy(updated);
    const { specs, notRequired } = buildSpecsFromValues(updated.specValues);
    legacy.specs = Object.keys(specs).length > 0 ? specs : (data.specs || {});
    legacy.notRequired = Object.keys(notRequired).length > 0 ? notRequired : (data.notRequired || {});
    legacy.customItems = (updated.customItems || []).map((ci) => ({
      name: ci.name,
      qty: ci.quantity,
      price: ci.price,
    }));
    legacy._backendStatus = updated.status;
    legacy._lastSyncedPayload = JSON.stringify(toBackendCreate(data));
    return legacy;
  }

  async approve(id, comment) {
    const targetId = toUuid(id);
    const payload = {};
    if (comment !== undefined && comment !== null) {
      payload.comment = String(comment);
    }
    const { data: updated } = await apiClient.patch(`/api/quotations/${targetId}/approve`, payload);
    return toLegacy(updated);
  }

  async deny(id, reason) {
    const targetId = toUuid(id);
    const { data: updated } = await apiClient.patch(`/api/quotations/${targetId}/deny`, { reason });
    return toLegacy(updated);
  }

  async claim(id, paymentDueDate) {
    const targetId = toUuid(id);
    const { data: updated } = await apiClient.patch(`/api/quotations/${targetId}/finance-claim`, {
      paymentDueDate: paymentDueDate || null,
    });
    return toLegacy(updated);
  }

  async submit(id) {
    const targetId = toUuid(id);
    const { data: updated } = await apiClient.patch(`/api/quotations/${targetId}/submit`);
    return toLegacy(updated);
  }

  async delete(id) {
    const targetId = toUuid(id);
    await apiClient.delete(`/api/quotations/${targetId}`);
  }

  async getNextCounter() {
    const rows = await this.getAll();
    return rows.length + 1;
  }

  async syncAll(quotes) {
    for (const quote of quotes || []) {
      try {
        await this._syncOne(quote);
      } catch (e) {
        console.warn(`[QuotationService] sync failed for ${quote.id}:`, e.message);
      }
    }
  }

  async _syncOne(quote) {
    if (!quote._backendId) {
      const created = await apiClient.post('/api/quotations', toBackendCreate(quote));
      quote._backendId = created.data.id;
      quote.id = created.data.quotationNumber;
      quote._backendStatus = created.data.status;
      quote._lastSyncedPayload = JSON.stringify(toBackendCreate(quote));
      if (mapStatusToLegacy(quote.status) === 'Pending Approval' && created.data.status !== 'Pending') {
        const submitted = await apiClient.patch(`/api/quotations/${quote._backendId}/submit`);
        quote._backendStatus = submitted.data.status;
      }
      return;
    }

    const targetStatus = mapStatusToBackend(quote.status);
    const currentStatus = quote._backendStatus;

    if (currentStatus && targetStatus !== currentStatus) {
      if (targetStatus === 'Approved') {
        const updated = await apiClient.patch(`/api/quotations/${quote._backendId}/approve`, {});
        quote._backendStatus = updated.data.status;
        return;
      }
      if (targetStatus === 'Denied') {
        const updated = await apiClient.patch(`/api/quotations/${quote._backendId}/deny`, { reason: 'Denied from ERP' });
        quote._backendStatus = updated.data.status;
        return;
      }
      if (currentStatus === 'Draft' && targetStatus === 'Pending') {
        const updated = await apiClient.patch(`/api/quotations/${quote._backendId}/submit`);
        quote._backendStatus = updated.data.status;
        return;
      }
      console.warn(`[QuotationService] Unsupported status transition ${currentStatus} -> ${targetStatus}`);
    }

    if (targetStatus === 'Draft') {
      const payload = toBackendCreate(quote);
      const sig = JSON.stringify(payload);
      if (quote._lastSyncedPayload === sig) return;
      const { data: updated } = await apiClient.put(`/api/quotations/${quote._backendId}`, payload);
      quote._backendStatus = updated.status;
      quote._lastSyncedPayload = sig;
    }
  }
}
