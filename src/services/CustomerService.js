import { apiClient } from '../api/client.js';

const PER_PAGE = 100;

function vehiclesToBackend(vehicles) {
  return (vehicles || [])
    .map((v) => (typeof v === 'string' ? { registration: v, type: null } : v))
    .filter((v) => v && (v.registration || v.type));
}

function vehiclesToLegacy(vehicles) {
  return (vehicles || []).map((v) => (typeof v === 'string' ? v : v?.registration || ''));
}

function toLegacy(customer) {
  return {
    id: customer.id,
    customerNumber: customer.customerNumber,
    name: customer.name || '',
    company: customer.company || '',
    gst: customer.gst || 'Pending',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    vehicles: vehiclesToLegacy(customer.vehicles),
    outstanding: customer.outstanding ?? 0,
    createdDate: customer.createdAt ? customer.createdAt.split('T')[0] : null,
    _backendId: customer.id,
  };
}

function toBackend(data) {
  const out = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.company !== undefined) out.company = data.company;
  if (data.gst !== undefined && data.gst && data.gst !== 'Pending') out.gst = data.gst;
  if (data.phone !== undefined) out.phone = data.phone || null;
  if (data.email !== undefined) out.email = data.email || null;
  if (data.address !== undefined) out.address = data.address || null;
  if (data.vehicles !== undefined) out.vehicles = vehiclesToBackend(data.vehicles);
  return out;
}

export class CustomerService {
  async getAll() {
    const customers = [];
    let page = 1;
    let total = Infinity;
    while (customers.length < total) {
      const { data, meta } = await apiClient.get(
        `/api/customers?page=${page}&perPage=${PER_PAGE}`,
      );
      customers.push(...(data || []));
      total = meta?.total ?? customers.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    return customers.map(toLegacy);
  }

  async getById(id) {
    const { data } = await apiClient.get(`/api/customers/${id}`);
    return data ? toLegacy(data) : null;
  }

  async getByCompany(company) {
    const list = await this.getAll();
    return list.find((c) =>
      c.company?.toLowerCase() === (company || '').toLowerCase()
    ) || null;
  }

  async create(data) {
    const { data: created } = await apiClient.post('/api/customers', toBackend(data));
    return toLegacy(created);
  }

  async update(id, data) {
    const { data: updated } = await apiClient.put(`/api/customers/${id}`, toBackend(data));
    return toLegacy(updated);
  }

  async recalculateOutstanding() {
    return this.getAll();
  }

  async syncAll(customers) {
    for (const customer of customers || []) {
      try {
        if (customer._backendId) {
          const { data: updated } = await apiClient.put(
            `/api/customers/${customer._backendId}`,
            toBackend(customer),
          );
          customer._backendId = updated.id;
        } else {
          const { data: created } = await apiClient.post('/api/customers', toBackend(customer));
          customer._backendId = created.id;
          customer.id = created.id;
          customer.customerNumber = created.customerNumber;
        }
      } catch (e) {
        console.warn(`[CustomerService] sync failed for ${customer.company}:`, e.message);
      }
    }
  }
}
