import { AuthenticatedUser } from '../middleware/auth.js';

/**
 * Ownership / access scope helper.
 *
 * The backend uses the Supabase service role, which bypasses RLS. This module
 * re-applies the record-level access rules at the query layer so that a user
 * can never see or touch records they do not own, no matter how they call the
 * API. Filtering is pushed into SQL (PostgREST `eq` / `or` filters) — we never
 * fetch all rows and filter in JS.
 *
 * Access matrix:
 *   admin   -> no scope (full access)
 *   sales   -> scope on ownership columns
 *   finance -> scope only on finance tables (see FINANCE_TABLE)
 *   manager -> scope only on production/work-order tables (see MANAGER_TABLE)
 */

export type OwnershipColumn = 'created_by' | 'employee_id' | 'completed_by';

export interface OwnershipRule {
  /** Roles that get FULL access to this table. */
  fullAccessRoles: string[];
  /** Table name the scope applies to (for `.eq` filters). */
  table: string;
  /** Column used for ownership scoping. */
  column?: OwnershipColumn;
  /**
   * When true, sales users see `created_by = self OR assigned_to_employee_id
   * = self` (used by quotations). Requires the table to have the column.
   */
  includeAssignedTo?: boolean;
  /**
   * Sales role is allowed on this table at all. If false, sales gets no
   * records from this table.
   */
  allowSales?: boolean;
  /** Roles that are denied entirely (returns zero rows). */
  denyRoles?: string[];
}

/**
 * Apply the access scope for the acting user to a query object that has
 * `.eq`, `.or` and `.is` chainable methods (a Supabase PostgREST query
 * builder). Returns the (possibly narrowed) query.
 */
export function applyOwnershipScope<T>(
  query: T,
  user: AuthenticatedUser,
  rule: OwnershipRule,
): T {
  if (!user) return query;
  const q = query as any;

  const role = user.role ? user.role.toLowerCase() : '';
  const fullAccessRoles = rule.fullAccessRoles.map((r) => r.toLowerCase());
  const denyRoles = rule.denyRoles?.map((r) => r.toLowerCase());

  // Denied roles see nothing.
  if (denyRoles?.includes(role)) {
    return q.is('id', null);
  }

  // Full-access roles (admin; or finance/manager on their own tables).
  if (fullAccessRoles.includes(role)) {
    return query;
  }

  // Sales: scope to owned records.
  if (role === 'sales') {
    if (rule.allowSales !== true) return q.is('id', null);
    const column = rule.column ?? 'created_by';
    if (rule.includeAssignedTo) {
      return q.or(`${column}.eq.${user.id},assigned_to_employee_id.eq.${user.id}`);
    }
    return q.eq(column, user.id);
  }

  // Any other role not granted full access is denied by default.
  return q.is('id', null);
}

/** Predicate: does this role get full access to the given ownership table? */
export function hasFullAccess(role: string, rule: OwnershipRule): boolean {
  const normRole = (role || '').toLowerCase();
  return rule.fullAccessRoles.map((r) => r.toLowerCase()).includes(normRole);
}

/** Predicate: can this role access a record owned by `ownerId`? */
export function canAccessRecord(role: string, rule: OwnershipRule, ownerId: string | null, currentUserId: string): boolean {
  const normRole = (role || '').toLowerCase();
  const fullAccessRoles = rule.fullAccessRoles.map((r) => r.toLowerCase());
  const denyRoles = rule.denyRoles?.map((r) => r.toLowerCase());

  if (denyRoles?.includes(normRole)) return false;
  if (fullAccessRoles.includes(normRole)) return true;
  if (normRole === 'sales') {
    return ownerId === currentUserId;
  }
  return false;
}
