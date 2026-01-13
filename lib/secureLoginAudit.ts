import { prisma } from './db/prisma';

export interface SecureLoginAuditEntry {
  secureLoginId: number;
  action: 'create' | 'update' | 'delete' | 'access_granted' | 'access_revoked';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

// Sensitive fields that should be redacted in logs
const SENSITIVE_FIELDS = ['password', 'totp_secret', 'username'];

/**
 * Create an audit log entry for secure login changes
 */
async function createSecureLoginAuditLog(entry: SecureLoginAuditEntry) {
  try {
    // Redact sensitive field values
    let displayOldValue = entry.oldValue;
    let displayNewValue = entry.newValue;

    if (entry.fieldName && SENSITIVE_FIELDS.includes(entry.fieldName)) {
      displayOldValue = entry.oldValue ? '[REDACTED]' : undefined;
      displayNewValue = entry.newValue ? '[REDACTED]' : undefined;
    }

    await prisma.secureLoginHistory.create({
      data: {
        secure_login_id: entry.secureLoginId,
        action: entry.action,
        field_name: entry.fieldName,
        old_value: displayOldValue,
        new_value: displayNewValue,
        changed_by: entry.userId,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create secure login audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log secure login creation
 */
export async function logSecureLoginCreate(
  secureLoginId: number,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  await createSecureLoginAuditLog({
    secureLoginId,
    action: 'create',
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log secure login update
 */
export async function logSecureLoginUpdate(
  secureLoginId: number,
  fieldName: string,
  oldValue: any,
  newValue: any,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  await createSecureLoginAuditLog({
    secureLoginId,
    action: 'update',
    fieldName,
    oldValue: String(oldValue || ''),
    newValue: String(newValue || ''),
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log secure login deletion
 */
export async function logSecureLoginDelete(
  secureLoginId: number,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  await createSecureLoginAuditLog({
    secureLoginId,
    action: 'delete',
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log access granted to secure login
 */
export async function logSecureLoginAccessGranted(
  secureLoginId: number,
  accessType: 'user' | 'group',
  targetId: number,
  accessLevel: string,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  await createSecureLoginAuditLog({
    secureLoginId,
    action: 'access_granted',
    fieldName: `${accessType}_access`,
    newValue: `${accessType}:${targetId}:${accessLevel}`,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log access revoked from secure login
 */
export async function logSecureLoginAccessRevoked(
  secureLoginId: number,
  accessType: 'user' | 'group',
  targetId: number,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) {
  await createSecureLoginAuditLog({
    secureLoginId,
    action: 'access_revoked',
    fieldName: `${accessType}_access`,
    oldValue: `${accessType}:${targetId}`,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Get audit logs for a secure login
 */
export async function getSecureLoginAuditLogs(secureLoginId: number, limit = 50) {
  return await prisma.secureLoginHistory.findMany({
    where: {
      secure_login_id: secureLoginId,
    },
    include: {
      changedByUser: {
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
 * Extract changes between old and new secure login data
 */
export function extractSecureLoginChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>
): Array<{ field: string; oldValue: any; newValue: any }> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

  // Fields to track for changes
  const trackedFields = [
    'item_name',
    'username',
    'password',
    'totp_secret',
    'website_url',
    'notes',
    'login_type',
    'google_account_id',
  ];

  for (const field of trackedFields) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    // Compare values (handle null/undefined)
    if (oldVal !== newVal && !(oldVal == null && newVal == null)) {
      changes.push({
        field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}
