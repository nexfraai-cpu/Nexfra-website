export interface EmployeeResponse {
  id: string;
  authId: string | null;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  employeeCode: string | null;
  role: 'admin' | 'sales' | 'finance' | 'manager';
  status: 'Active' | 'Disabled';
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  employeeCode?: string;
  role: 'admin' | 'sales' | 'finance' | 'manager';
}

export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  employeeCode?: string;
  role?: 'admin' | 'sales' | 'finance' | 'manager';
}

export interface EmployeeListOptions {
  role?: string;
  status?: string;
  search?: string;
  includeDisabled?: boolean;
}
