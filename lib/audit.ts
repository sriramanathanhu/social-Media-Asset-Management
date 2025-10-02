import { prisma } from './db/prisma';

export interface AuditLogEntry {
  platformId: number;
  action: 'create' | 'update' | 'delete';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId: number;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry for platform changes
 */
export async function createAuditLog(entry: AuditLogEntry) {
  try {
    await prisma.platformAuditLog.create({
      data: {
        platform_id: entry.platformId,
        action: entry.action,
        field_name: entry.fieldName,
        old_value: entry.oldValue,
        new_value: entry.newValue,
        user_id: entry.userId,
        user_role: entry.userRole,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log platform creation
 */
export async function logPlatformCreate(
  platformId: number,
  userId: number,
  userRole: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    platformId,
    action: 'create',
    userId,
    userRole,
    ipAddress,
    userAgent,
  });
}

/**
 * Log platform update
 */
export async function logPlatformUpdate(
  platformId: number,
  fieldName: string,
  oldValue: any,
  newValue: any,
  userId: number,
  userRole: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Don't log sensitive fields (passwords, secrets, etc.)
  const sensitiveFields = ['password', 'totp_secret'];

  const displayOldValue = sensitiveFields.includes(fieldName)
    ? '[REDACTED]'
    : String(oldValue || '');

  const displayNewValue = sensitiveFields.includes(fieldName)
    ? '[REDACTED]'
    : String(newValue || '');

  await createAuditLog({
    platformId,
    action: 'update',
    fieldName,
    oldValue: displayOldValue,
    newValue: displayNewValue,
    userId,
    userRole,
    ipAddress,
    userAgent,
  });
}

/**
 * Log platform deletion
 */
export async function logPlatformDelete(
  platformId: number,
  userId: number,
  userRole: string,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    platformId,
    action: 'delete',
    userId,
    userRole,
    ipAddress,
    userAgent,
  });
}

/**
 * Get audit logs for a platform
 */
export async function getPlatformAuditLogs(platformId: number, limit = 50) {
  return await prisma.platformAuditLog.findMany({
    where: {
      platform_id: platformId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
  });
}

/**
 * Get all audit logs by user
 */
export async function getUserAuditLogs(userId: number, limit = 100) {
  return await prisma.platformAuditLog.findMany({
    where: {
      user_id: userId,
    },
    include: {
      platform: {
        select: {
          id: true,
          platform_name: true,
          platform_type: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
  });
}

/**
 * Extract changes between old and new platform data
 */
export function extractPlatformChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>
): Array<{ field: string; oldValue: any; newValue: any }> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

  // Fields to track for changes
  const trackedFields = [
    'platform_name',
    'platform_type',
    'account_status',
    'login_method',
    'profile_url',
    'profile_id',
    'username',
    'password',
    'email',
    'phone',
    'recovery_email',
    'recovery_phone',
    'two_fa_enabled',
    'totp_enabled',
    'totp_secret',
    'bio',
    'profile_image_url',
    'cover_image_url',
    'verification_status',
    'notes',
  ];

  for (const field of trackedFields) {
    if (oldData[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldData[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}
