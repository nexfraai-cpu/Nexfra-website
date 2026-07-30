export type Permission =
  | 'employee:create'
  | 'employee:read'
  | 'employee:update'
  | 'employee:delete'
  | 'employee:manage-status'
  | 'employee:manage-password'
  | 'customer:create'
  | 'customer:read'
  | 'customer:update'
  | 'customer:delete'
  | 'quotation:create'
  | 'quotation:read'
  | 'quotation:update'
  | 'quotation:delete'
  | 'quotation:approve'
  | 'quotation:deny'
  | 'workorder:create'
  | 'workorder:read'
  | 'workorder:update'
  | 'workorder:delete'
  | 'workorder:manage-due-date'
  | 'workorder:mark-urgent'
  | 'production:read'
  | 'production:update-stage'
  | 'production:manage-chassis'
  | 'accounts:read'
  | 'accounts:create-sale'
  | 'accounts:create-payment'
  | 'admin:read-pricing'
  | 'admin:write-pricing'
  | 'admin:read-products'
  | 'admin:write-products'
  | 'admin:read-logs'
  | 'admin:reset-data'
  | 'upload:all';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'employee:create', 'employee:read', 'employee:update', 'employee:delete',
    'employee:manage-status', 'employee:manage-password',
    'customer:create', 'customer:read', 'customer:update', 'customer:delete',
    'quotation:create', 'quotation:read', 'quotation:update', 'quotation:delete',
    'quotation:approve', 'quotation:deny',
    'workorder:create', 'workorder:read', 'workorder:update', 'workorder:delete',
    'workorder:manage-due-date', 'workorder:mark-urgent',
    'production:read', 'production:update-stage', 'production:manage-chassis',
    'accounts:read', 'accounts:create-sale', 'accounts:create-payment',
    'admin:read-pricing', 'admin:write-pricing',
    'admin:read-products', 'admin:write-products',
    'admin:read-logs', 'admin:reset-data',
    'upload:all',
  ],
  manager: [
    'employee:read',
    'customer:create', 'customer:read', 'customer:update',
    'quotation:create', 'quotation:read', 'quotation:update',
    'quotation:approve', 'quotation:deny',
    'workorder:create', 'workorder:read', 'workorder:update',
    'workorder:manage-due-date', 'workorder:mark-urgent',
    'production:read', 'production:update-stage', 'production:manage-chassis',
    'accounts:read',
    'upload:all',
  ],
  sales: [
    'customer:create', 'customer:read', 'customer:update',
    'quotation:create', 'quotation:read', 'quotation:update', 'quotation:delete',
    'workorder:read',
    'production:read',
    'accounts:read',
    'upload:all',
  ],
  finance: [
    'customer:read',
    'quotation:read',
    'workorder:read',
    'accounts:read', 'accounts:create-sale', 'accounts:create-payment',
    'upload:all',
  ],
};

export function requirePermission(...permissions: Permission[]) {
  return (req: any, _res: any, next: any) => {
    if (!req.user) {
      return next(Object.assign(new Error('Authentication required'), { statusCode: 401 }));
    }
    const userPermissions = ROLE_PERMISSIONS[req.user.role] ?? [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      return next(
        Object.assign(
          new Error(`Role '${req.user.role}' lacks required permissions: ${permissions.join(', ')}`),
          { statusCode: 403 },
        ),
      );
    }
    next();
  };
}

export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
