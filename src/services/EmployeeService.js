import { BaseService } from './BaseService.js';

export class EmployeeService extends BaseService {
  async getAll() {
    const state = await this.loadState();
    return (state.employees || []).filter(e => !e.isDeleted);
  }

  async getAllIncludingDeleted() {
    const state = await this.loadState();
    return state.employees || [];
  }

  async getById(id) {
    const state = await this.loadState();
    return (state.employees || []).find(e => e.id === id) || null;
  }

  async getByEmail(email) {
    const state = await this.loadState();
    return (state.employees || []).find(e => e.email === email && !e.isDeleted) || null;
  }

  async authenticate(email, password) {
    const state = await this.loadState();
    const emp = (state.employees || []).find(e =>
      e.email === email && e.password === password && !e.isDeleted && e.status === 'Active'
    );
    if (emp) {
      emp.lastLogin = new Date().toISOString();
      await this.saveState(state);
    }
    return emp || null;
  }

  async findByRole(role) {
    const state = await this.loadState();
    return (state.employees || []).find(e =>
      e.role === role && !e.isDeleted && e.status === 'Active'
    ) || null;
  }

  async create(data) {
    const state = await this.loadState();
    state.employeeCounter = (state.employeeCounter || 0) + 1;
    const id = 'EMP-' + String(state.employeeCounter).padStart(6, '0');
    const emp = {
      id,
      fullName: data.fullName || '',
      email: data.email || '',
      phone: data.phone || '',
      employeeCode: data.employeeCode || '',
      role: data.role || 'sales',
      status: data.status || 'Active',
      password: data.password,
      isDeleted: false,
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: null
    };
    state.employees.push(emp);
    await this.saveState(state);
    await this.logActivity(`Employee created: ${emp.fullName} (${emp.role})`);
    return emp;
  }

  async update(id, data) {
    const state = await this.loadState();
    const emp = state.employees.find(e => e.id === id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    if (data.fullName !== undefined) emp.fullName = data.fullName;
    if (data.email !== undefined) emp.email = data.email;
    if (data.phone !== undefined) emp.phone = data.phone;
    if (data.employeeCode !== undefined) emp.employeeCode = data.employeeCode;
    if (data.role !== undefined) emp.role = data.role;
    if (data.status !== undefined) emp.status = data.status;
    if (data.password !== undefined) emp.password = data.password;
    await this.saveState(state);
    await this.logActivity(`Employee ${id} updated.`);
    return emp;
  }

  async disable(id) {
    const state = await this.loadState();
    const emp = state.employees.find(e => e.id === id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    emp.status = emp.status === 'Active' ? 'Disabled' : 'Active';
    await this.saveState(state);
    await this.logActivity(`Employee ${id} ${emp.status}.`);
    return emp;
  }

  async delete(id) {
    const state = await this.loadState();
    const emp = state.employees.find(e => e.id === id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    emp.isDeleted = true;
    await this.saveState(state);
    await this.logActivity(`Employee ${id} deleted.`);
    return emp;
  }

  async resetPassword(id, newPassword) {
    const state = await this.loadState();
    const emp = state.employees.find(e => e.id === id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    emp.password = newPassword;
    await this.saveState(state);
    await this.logActivity(`Password reset for employee ${id}.`);
    return emp;
  }

  async updateLastLogin(id) {
    const state = await this.loadState();
    const emp = state.employees.find(e => e.id === id);
    if (emp) {
      emp.lastLogin = new Date().toISOString();
      await this.saveState(state);
    }
  }
}
