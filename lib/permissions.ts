// Role-based access control utilities

export type UserRole = 'read' | 'write' | 'manager' | 'admin';

export interface Permission {
  canRead: boolean;
  canWrite: boolean;
  canManageUsers: boolean;
  canManageEcosystems: boolean;
  canAssignEcosystems: boolean;
  canViewAuditLogs: boolean;
  canDeletePlatforms: boolean;
  canManageSettings: boolean;
}

/**
 * Get permissions for a given role
 */
export function getPermissions(role: string): Permission {
  switch (role) {
    case 'read':
      return {
        canRead: true,
        canWrite: false,
        canManageUsers: false,
        canManageEcosystems: false,
        canAssignEcosystems: false,
        canViewAuditLogs: false,
        canDeletePlatforms: false,
        canManageSettings: false,
      };

    case 'write':
      return {
        canRead: true,
        canWrite: true,
        canManageUsers: false,
        canManageEcosystems: false,
        canAssignEcosystems: false,
        canViewAuditLogs: true, // Can view their own changes
        canDeletePlatforms: false,
        canManageSettings: false,
      };

    case 'manager':
      return {
        canRead: true,
        canWrite: true,
        canManageUsers: false,
        canManageEcosystems: false,
        canAssignEcosystems: true, // Can assign their own ecosystems
        canViewAuditLogs: true,
        canDeletePlatforms: false,
        canManageSettings: false,
      };

    case 'admin':
      return {
        canRead: true,
        canWrite: true,
        canManageUsers: true,
        canManageEcosystems: true,
        canAssignEcosystems: true,
        canViewAuditLogs: true,
        canDeletePlatforms: true,
        canManageSettings: true,
      };

    default:
      // Default to read-only
      return getPermissions('read');
  }
}

/**
 * Check if a user can access a specific ecosystem
 */
export function canAccessEcosystem(
  userRole: string,
  userEcosystemIds: number[],
  ecosystemId: number
): boolean {
  // Admins can access all ecosystems
  if (userRole === 'admin') {
    return true;
  }

  // Other roles can only access their assigned ecosystems
  return userEcosystemIds.includes(ecosystemId);
}

/**
 * Check if a manager can assign a specific ecosystem
 */
export function canManagerAssignEcosystem(
  userRole: string,
  userEcosystemIds: number[],
  ecosystemId: number
): boolean {
  // Only managers and admins can assign ecosystems
  if (userRole !== 'manager' && userRole !== 'admin') {
    return false;
  }

  // Admins can assign any ecosystem
  if (userRole === 'admin') {
    return true;
  }

  // Managers can only assign ecosystems they have access to
  return userEcosystemIds.includes(ecosystemId);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    read: 'Read',
    write: 'Write',
    manager: 'Manager',
    admin: 'Admin',
  };

  return roleNames[role] || 'Unknown';
}

/**
 * Get role description
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    read: 'Can view platforms and credentials but cannot edit',
    write: 'Can edit platform details with changes tracked in audit log',
    manager: 'Can read, write, and assign their ecosystems to other users',
    admin: 'Has full access to all system features',
  };

  return descriptions[role] || '';
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    read: 1,
    write: 2,
    manager: 3,
    admin: 4,
  };

  return levels[role] || 0;
}

/**
 * Check if one role has more permissions than another
 */
export function hasHigherRole(role1: string, role2: string): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2);
}
