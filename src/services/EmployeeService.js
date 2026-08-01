import { apiClient } from '../api/client.js';

function toLegacy(emp) {
  return {
    id: emp.id,
    fullName: emp.fullName || '',
    email: emp.email || '',
    phone: emp.phone || '',
    employeeCode: emp.employeeCode || '',
    role: emp.role || 'sales',
    status: emp.status || 'Active',
    isDeleted: false,
    password: undefined,
    createdDate: emp.createdAt ? emp.createdAt.split('T')[0] : null,
    lastLogin: emp.lastLoginAt || null,
    _backendId: emp.id,
  };
}

function toBackend(data) {
  const out = {};
  if (data.fullName !== undefined) out.fullName = data.fullName;
  if (data.email !== undefined) out.email = data.email;
  if (data.phone !== undefined) out.phone = data.phone || null;
  if (data.employeeCode !== undefined) out.employeeCode = data.employeeCode || null;
  if (data.role !== undefined) out.role = data.role;
  return out;
}

export class EmployeeService {
  async getAll() {
    const { data } = await apiClient.get('/api/employees');
    return (data || []).map(toLegacy);
  }

  async getAllIncludingDeleted() {
    const { data } = await apiClient.get('/api/employees?includeDisabled=true');
    return (data || []).map(toLegacy);
  }

  async getById(id) {
    const { data } = await apiClient.get(`/api/employees/${id}`);
    return data ? toLegacy(data) : null;
  }

  async getByEmail(email) {
    const list = await this.getAll();
    return list.find((e) => e.email === email && !e.isDeleted) || null;
  }

  async authenticate(email, password) {
    throw new Error('Direct employee authentication is no longer supported. Use AuthenticationService.login().');
  }

  async findByRole(role) {
    const list = await this.getAll();
    return list.find((e) => e.role === role && !e.isDeleted && e.status === 'Active') || null;
  }

  async create(data) {
    const body = {
      fullName: data.fullName || '',
      email: data.email || '',
      password: data.password || '',
      role: data.role || 'sales',
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.employeeCode ? { employeeCode: data.employeeCode } : {}),
    };
    const { data: created } = await apiClient.post('/api/employees', body);
    return toLegacy(created);
  }

  async update(id, data) {
    const { data: updated } = await apiClient.put(`/api/employees/${id}`, toBackend(data));
    return toLegacy(updated);
  }

  async disable(id) {
    const { data: updated } = await apiClient.patch(`/api/employees/${id}/status`);
    return toLegacy(updated);
  }

  async delete(id) {
    await apiClient.delete(`/api/employees/${id}`);
    return { id, isDeleted: true };
  }

  async resetPassword(id, newPassword) {
    await apiClient.patch(`/api/employees/${id}/password`, { password: newPassword });
  }

  async updateLastLogin(_id) {
    // Backend tracks last_login_at on login.
  }
}
