import { prisma } from './db/prisma';

export type SecureLoginAccessLevel = 'owner' | 'edit' | 'read' | 'none';

export interface SecureLoginAccessResult {
  canAccess: boolean;
  level: SecureLoginAccessLevel;
}

/**
 * Get the access level a user has for a specific secure login
 * Checks: ownership, direct user access, and group-based access
 */
export async function getSecureLoginAccess(
  userId: number,
  secureLoginId: number
): Promise<SecureLoginAccessResult> {
  // Check if user is the owner
  const secureLogin = await prisma.secureLogin.findUnique({
    where: { id: secureLoginId },
    select: { owner_id: true },
  });

  if (!secureLogin) {
    return { canAccess: false, level: 'none' };
  }

  if (secureLogin.owner_id === userId) {
    return { canAccess: true, level: 'owner' };
  }

  // Check direct user access
  const userAccess = await prisma.secureLoginUserAccess.findUnique({
    where: {
      secure_login_id_user_id: {
        secure_login_id: secureLoginId,
        user_id: userId,
      },
    },
    select: { access_level: true },
  });

  if (userAccess) {
    return {
      canAccess: true,
      level: userAccess.access_level as SecureLoginAccessLevel,
    };
  }

  // Check group-based access
  // First, get all groups the user is a member of
  const userGroups = await prisma.secureLoginGroupMember.findMany({
    where: { user_id: userId },
    select: { group_id: true },
  });

  if (userGroups.length > 0) {
    const groupIds = userGroups.map((g) => g.group_id);

    // Check if any of those groups have access to this secure login
    const groupAccess = await prisma.secureLoginGroupAccess.findMany({
      where: {
        secure_login_id: secureLoginId,
        group_id: { in: groupIds },
      },
      select: { access_level: true },
    });

    if (groupAccess.length > 0) {
      // If multiple groups give access, use the highest level (edit > read)
      const hasEditAccess = groupAccess.some((a) => a.access_level === 'edit');
      return {
        canAccess: true,
        level: hasEditAccess ? 'edit' : 'read',
      };
    }
  }

  return { canAccess: false, level: 'none' };
}

/**
 * Check if user can edit a secure login
 */
export async function canEditSecureLogin(
  userId: number,
  secureLoginId: number
): Promise<boolean> {
  const access = await getSecureLoginAccess(userId, secureLoginId);
  return access.canAccess && (access.level === 'owner' || access.level === 'edit');
}

/**
 * Check if user is the owner of a secure login
 */
export async function isSecureLoginOwner(
  userId: number,
  secureLoginId: number
): Promise<boolean> {
  const secureLogin = await prisma.secureLogin.findUnique({
    where: { id: secureLoginId },
    select: { owner_id: true },
  });

  return secureLogin?.owner_id === userId;
}

/**
 * Get all secure logins accessible by a user (owned + shared)
 */
export async function getAccessibleSecureLogins(userId: number) {
  // Get directly owned logins
  const ownedLogins = await prisma.secureLogin.findMany({
    where: { owner_id: userId },
    select: { id: true },
  });

  // Get logins shared directly with user
  const directlySharedLogins = await prisma.secureLoginUserAccess.findMany({
    where: { user_id: userId },
    select: { secure_login_id: true },
  });

  // Get logins shared via groups
  const userGroups = await prisma.secureLoginGroupMember.findMany({
    where: { user_id: userId },
    select: { group_id: true },
  });

  let groupSharedLogins: { secure_login_id: number }[] = [];
  if (userGroups.length > 0) {
    groupSharedLogins = await prisma.secureLoginGroupAccess.findMany({
      where: {
        group_id: { in: userGroups.map((g) => g.group_id) },
      },
      select: { secure_login_id: true },
    });
  }

  // Combine all unique IDs
  const allLoginIds = new Set([
    ...ownedLogins.map((l) => l.id),
    ...directlySharedLogins.map((l) => l.secure_login_id),
    ...groupSharedLogins.map((l) => l.secure_login_id),
  ]);

  return Array.from(allLoginIds);
}

/**
 * Check if user is owner or admin of a group
 */
export async function canManageGroup(
  userId: number,
  groupId: number
): Promise<boolean> {
  const group = await prisma.secureLoginGroup.findUnique({
    where: { id: groupId },
    select: { owner_id: true },
  });

  if (!group) return false;

  // Owner can always manage
  if (group.owner_id === userId) return true;

  // Check if user is a group admin
  const membership = await prisma.secureLoginGroupMember.findUnique({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId,
      },
    },
    select: { role: true },
  });

  return membership?.role === 'admin';
}

/**
 * Check if user has any access to a group (owner, admin, or member)
 */
export async function hasGroupAccess(
  userId: number,
  groupId: number
): Promise<boolean> {
  const group = await prisma.secureLoginGroup.findUnique({
    where: { id: groupId },
    select: { owner_id: true },
  });

  if (!group) return false;

  // Owner has access
  if (group.owner_id === userId) return true;

  // Check membership
  const membership = await prisma.secureLoginGroupMember.findUnique({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId,
      },
    },
  });

  return !!membership;
}
