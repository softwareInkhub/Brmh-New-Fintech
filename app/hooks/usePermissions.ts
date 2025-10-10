import { useAuth } from './useAuth';

/**
 * Hook for checking user permissions in the fintech namespace
 * 
 * Usage:
 * const { canCreate, canEdit, canDelete, canAssign, isAdmin } = usePermissions();
 * 
 * if (canCreate()) {
 *   // Show create button
 * }
 */
export function usePermissions() {
  const { user, hasPermission, isAdmin: checkIsAdmin } = useAuth();

  return {
    // Direct role check
    isAdmin: () => checkIsAdmin(),
    isEditor: () => user?.role === 'editor',
    isViewer: () => user?.role === 'viewer',
    isUser: () => user?.role === 'user',

    // Permission checks
    canCreate: () => hasPermission('crud:all') || hasPermission('crud:own'),
    canEdit: () => hasPermission('crud:all') || hasPermission('crud:own'),
    canDelete: () => hasPermission('crud:all'),
    canAssign: () => hasPermission('assign:users'),
    canReadAll: () => hasPermission('read:all'),
    canReadOwn: () => hasPermission('read:own') || hasPermission('read:all'),

    // Custom permission check
    hasPermission: (permission: string) => hasPermission(permission),

    // Get current role
    getRole: () => user?.role || 'user',

    // Get all permissions
    getPermissions: () => user?.permissions || [],
  };
}

