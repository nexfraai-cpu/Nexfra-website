import { apiClient } from '../api/client.js';

const PER_PAGE = 500;

/**
 * Maps a backend chassis response to the legacy in-memory shape used by erp.js.
 *
 * Backend stores `work_order_id` as a UUID FK, but the frontend identifies work
 * orders by their display number (e.g. "WO-000015"). The backend returns the
 * joined `workOrderNumber` so we can map back to the display id without needing
 * STATE.workOrders at hydrate time.
 */
function toLegacy(row, workOrders) {
  let workOrderId = row.workOrderNumber || '';
  // Fallback: resolve the display number from the supplied work orders list
  // when the join did not return a work order number (e.g. soft-deleted WO).
  if (!workOrderId && row.workOrderId && Array.isArray(workOrders)) {
    const match = workOrders.find((w) => w._backendId === row.workOrderId);
    if (match) workOrderId = match.id;
  }
  const brand = row.brand || '';
  const model = row.model || '';
  return {
    id: row.id,
    _backendId: row.id,
    _backendWorkOrderId: row.workOrderId || null,
    field: row.field || '',
    brand,
    model,
    brandModel: brand + (model ? ' / ' + model : ''),
    workOrderId,
    chassisNumber: row.chassisNumber || '',
    arrivalDate: row.arrivalDate || '',
    outDate: row.outDate || '',
    customerName: row.customerName || '',
    productName: row.productName || '',
  };
}

/** Resolves a frontend display work order id (e.g. "WO-000015") to its UUID. */
function resolveBackendWorkOrderId(displayId, workOrders) {
  if (!displayId) return null;
  // Already a UUID?
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(String(displayId))) return displayId;
  const match = (workOrders || []).find((w) => w.id === displayId);
  return match ? match._backendId : null;
}

export class ChassisService {
  async getAll(workOrders) {
    const { data } = await apiClient.get(`/api/chassis?perPage=${PER_PAGE}`);
    return (data || []).map((row) => toLegacy(row, workOrders));
  }

  async create(record, workOrders) {
    const workOrderId = resolveBackendWorkOrderId(record.workOrderId, workOrders);
    const payload = {
      workOrderId,
      field: record.field || null,
      brand: record.brand || null,
      model: record.model || null,
      chassisNumber: record.chassisNumber || null,
      arrivalDate: record.arrivalDate || null,
      outDate: record.outDate || null,
    };
    const { data } = await apiClient.post('/api/chassis', payload);
    return toLegacy(data, workOrders);
  }

  async update(id, record, workOrders) {
    const payload = {};
    if (record.workOrderId !== undefined) {
      payload.workOrderId = resolveBackendWorkOrderId(record.workOrderId, workOrders);
    }
    if (record.field !== undefined) payload.field = record.field || null;
    if (record.brand !== undefined) payload.brand = record.brand || null;
    if (record.model !== undefined) payload.model = record.model || null;
    if (record.chassisNumber !== undefined) payload.chassisNumber = record.chassisNumber || null;
    if (record.arrivalDate !== undefined) payload.arrivalDate = record.arrivalDate || null;
    if (record.outDate !== undefined) payload.outDate = record.outDate || null;
    const { data } = await apiClient.put(`/api/chassis/${id}`, payload);
    return toLegacy(data, workOrders);
  }

  async remove(id) {
    await apiClient.delete(`/api/chassis/${id}`);
  }
}