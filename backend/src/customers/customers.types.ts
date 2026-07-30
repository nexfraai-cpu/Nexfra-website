export interface CustomerResponse {
  id: string;
  customerNumber: string;
  name: string;
  company: string;
  gst: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicles: unknown;
  outstanding: number;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface CreateCustomerInput {
  name: string;
  company: string;
  gst?: string;
  phone?: string;
  email?: string;
  address?: string;
  vehicles?: unknown;
}

export interface UpdateCustomerInput {
  name?: string;
  company?: string;
  gst?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  vehicles?: unknown;
}

export interface CustomerListOptions {
  search?: string;
  company?: string;
  sortBy?: 'name' | 'company' | 'created_at' | 'outstanding';
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
