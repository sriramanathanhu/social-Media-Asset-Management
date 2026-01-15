import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : (process.env.NEXT_PUBLIC_BASE_URL || request.url);
    const sessionRes = await fetch(new URL('/api/auth/session', baseUrl), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const session = await sessionRes.json();
    
    if (!session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin users can import data' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!['users', 'ecosystems', 'user-assignments', 'bulk-import'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid import type' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      return NextResponse.json({
        success: false,
        message: 'CSV file is empty or contains only headers'
      });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      // Handle quoted values
      const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      return matches ? matches.map(m => m.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim()) : [];
    });

    let imported = 0;
    const errors: string[] = [];

    switch (type) {
      case 'users':
        const result = await importUsers(headers, rows, errors);
        imported = result;
        break;

      case 'ecosystems':
        imported = await importEcosystems(headers, rows, errors);
        break;

      case 'user-assignments':
        imported = await importUserAssignments(headers, rows, errors, session.user.dbId);
        break;

      case 'bulk-import':
        imported = await importBulkEcosystemsWithPlatforms(headers, rows, errors, session.user.dbId);
        break;
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Import completed with errors. ${imported} records imported successfully.`,
        imported,
        errors: errors.slice(0, 10) // Limit errors to first 10
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${imported} ${type}`,
      imported
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      message: 'Import failed: ' + (error as Error).message
    });
  }
}

async function importUsers(headers: string[], rows: string[][], errors: string[]): Promise<number> {
  const emailIndex = headers.indexOf('email');
  const nameIndex = headers.indexOf('name');
  const ecitizenIdIndex = headers.indexOf('ecitizen_id');
  const roleIndex = headers.indexOf('role');

  if (emailIndex === -1 || nameIndex === -1) {
    throw new Error('CSV must contain email and name columns');
  }

  let imported = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row[emailIndex]?.toLowerCase();
    const name = row[nameIndex];
    const ecitizenId = ecitizenIdIndex !== -1 ? row[ecitizenIdIndex] : undefined;
    const role = roleIndex !== -1 ? row[roleIndex] : 'user';

    if (!email || !name) {
      errors.push(`Row ${i + 2}: Missing email or name`);
      continue;
    }

    if (!['admin', 'user'].includes(role)) {
      errors.push(`Row ${i + 2}: Invalid role '${role}'. Must be 'admin' or 'user'`);
      continue;
    }

    try {
      await prisma.user.upsert({
        where: { email },
        update: {
          name,
          ecitizen_id: ecitizenId,
          role,
          updated_at: new Date()
        },
        create: {
          email,
          name,
          ecitizen_id: ecitizenId,
          role
        }
      });
      imported++;
    } catch (error) {
      errors.push(`Row ${i + 2}: ${(error as Error).message}`);
    }
  }

  return imported;
}

async function importEcosystems(headers: string[], rows: string[][], errors: string[]): Promise<number> {
  const nameIndex = headers.indexOf('name');
  const themeIndex = headers.indexOf('theme');
  const descriptionIndex = headers.indexOf('description');
  const activeStatusIndex = headers.indexOf('active_status');

  if (nameIndex === -1 || themeIndex === -1) {
    throw new Error('CSV must contain name and theme columns');
  }

  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameIndex];
    const theme = row[themeIndex];
    const description = descriptionIndex !== -1 ? row[descriptionIndex] : null;
    const activeStatusStr = activeStatusIndex !== -1 ? row[activeStatusIndex]?.toLowerCase() : 'true';
    const activeStatus = activeStatusStr === 'true' || activeStatusStr === '1' || activeStatusStr === 'yes';

    if (!name || !theme) {
      errors.push(`Row ${i + 2}: Missing name or theme`);
      continue;
    }

    try {
      await prisma.ecosystem.upsert({
        where: { name },
        update: {
          theme,
          description,
          active_status: activeStatus,
          updated_at: new Date()
        },
        create: {
          name,
          theme,
          description,
          active_status: activeStatus
        }
      });
      imported++;
    } catch (error) {
      errors.push(`Row ${i + 2}: ${(error as Error).message}`);
    }
  }

  return imported;
}


async function importUserAssignments(headers: string[], rows: string[][], errors: string[], assignedById: number): Promise<number> {
  const userEmailIndex = headers.indexOf("user_email");
  const ecosystemNameIndex = headers.indexOf("ecosystem_name");
  const assignedByEmailIndex = headers.indexOf("assigned_by_email");

  if (userEmailIndex === -1 || ecosystemNameIndex === -1) {
    throw new Error("CSV must contain user_email and ecosystem_name columns");
  }

  let imported = 0;

  // Get all users and ecosystems for lookup
  const [users, ecosystems] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true }
    }),
    prisma.ecosystem.findMany({
      select: { id: true, name: true }
    })
  ]);

  const userMap = new Map(users.map(u => [u.email.toLowerCase(), u.id]));
  const ecosystemMap = new Map(ecosystems.map(e => [e.name.toLowerCase(), e.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const userEmail = row[userEmailIndex]?.toLowerCase();
    const ecosystemName = row[ecosystemNameIndex];
    const assignedByEmail = assignedByEmailIndex !== -1 ? row[assignedByEmailIndex]?.toLowerCase() : null;

    if (!userEmail || !ecosystemName) {
      errors.push(`Row ${i + 2}: Missing user_email or ecosystem_name`);
      continue;
    }

    const userId = userMap.get(userEmail);
    if (!userId) {
      errors.push(`Row ${i + 2}: User '${userEmail}' not found`);
      continue;
    }

    const ecosystemId = ecosystemMap.get(ecosystemName.toLowerCase());
    if (!ecosystemId) {
      errors.push(`Row ${i + 2}: Ecosystem '${ecosystemName}' not found`);
      continue;
    }

    let actualAssignedBy = assignedById;
    if (assignedByEmail) {
      const assignedByUser = userMap.get(assignedByEmail);
      if (assignedByUser) {
        actualAssignedBy = assignedByUser;
      }
    }

    try {
      // Check if assignment already exists
      const existing = await prisma.userEcosystem.findFirst({
        where: {
          user_id: userId,
          ecosystem_id: ecosystemId
        }
      });

      if (!existing) {
        await prisma.userEcosystem.create({
          data: {
            user_id: userId,
            ecosystem_id: ecosystemId,
            assigned_by: actualAssignedBy,
            assigned_at: new Date()
          }
        });
        imported++;
      } else {
        // Assignment already exists, skip
        errors.push(`Row ${i + 2}: User '${userEmail}' is already assigned to ecosystem '${ecosystemName}'`);
      }
    } catch (error) {
      errors.push(`Row ${i + 2}: ${(error as Error).message}`);
    }
  }

  return imported;
}

async function importBulkEcosystemsWithPlatforms(headers: string[], rows: string[][], errors: string[], userId: number): Promise<number> {
  // Import encryption function
  const { encrypt } = await import('@/lib/utils/encryption');

  // Find all column indices
  const ecosystemNameIdx = headers.indexOf('ecosystem_name');
  const ecosystemThemeIdx = headers.indexOf('ecosystem_theme');
  const ecosystemDescIdx = headers.indexOf('ecosystem_description');
  const ecosystemActiveIdx = headers.indexOf('ecosystem_active_status');

  const platformNameIdx = headers.indexOf('platform_name');
  const platformTypeIdx = headers.indexOf('platform_type');
  const loginMethodIdx = headers.indexOf('login_method');
  const profileUrlIdx = headers.indexOf('profile_url');
  const profileIdIdx = headers.indexOf('profile_id');
  const usernameIdx = headers.indexOf('username');
  const passwordIdx = headers.indexOf('password');
  const emailIdx = headers.indexOf('email');
  const phoneIdx = headers.indexOf('phone');
  const recoveryEmailIdx = headers.indexOf('recovery_email');
  const recoveryPhoneIdx = headers.indexOf('recovery_phone');
  const twoFaEnabledIdx = headers.indexOf('two_fa_enabled');
  const totpEnabledIdx = headers.indexOf('totp_enabled');
  const totpSecretIdx = headers.indexOf('totp_secret');
  const accountStatusIdx = headers.indexOf('account_status');
  const verificationStatusIdx = headers.indexOf('verification_status');
  const notesIdx = headers.indexOf('notes');

  // New metadata fields
  const liveStreamIdx = headers.indexOf('live_stream');
  const languageIdx = headers.indexOf('language');
  const statusIdx = headers.indexOf('status');
  const recoveryPhoneNumberIdx = headers.indexOf('recovery_phone_number');
  const recoveryEmailIdIdx = headers.indexOf('recovery_email_id');
  const addedPhoneNumberIdx = headers.indexOf('added_phone_number');
  const phoneNumberOwnerIdx = headers.indexOf('phone_number_owner');
  const brandingIdx = headers.indexOf('branding');
  const connectionToolIdx = headers.indexOf('connection_tool');

  if (ecosystemNameIdx === -1 || platformNameIdx === -1 || platformTypeIdx === -1) {
    throw new Error('CSV must contain ecosystem_name, platform_name, and platform_type columns');
  }

  let imported = 0;
  const ecosystemCache = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ecosystemName = row[ecosystemNameIdx]?.trim();
    const platformName = row[platformNameIdx]?.trim();

    if (!ecosystemName || !platformName) {
      errors.push(`Row ${i + 2}: Missing ecosystem_name or platform_name`);
      continue;
    }

    try {
      // Get or create ecosystem
      let ecosystemId = ecosystemCache.get(ecosystemName);

      if (!ecosystemId) {
        const theme = ecosystemThemeIdx !== -1 ? row[ecosystemThemeIdx]?.trim() : 'General';
        const description = ecosystemDescIdx !== -1 ? row[ecosystemDescIdx]?.trim() : null;
        const activeStatusStr = ecosystemActiveIdx !== -1 ? row[ecosystemActiveIdx]?.trim().toLowerCase() : 'true';
        const activeStatus = activeStatusStr === 'true' || activeStatusStr === '1' || activeStatusStr === 'yes';

        if (!theme) {
          errors.push(`Row ${i + 2}: Missing ecosystem_theme for new ecosystem '${ecosystemName}'`);
          continue;
        }

        const ecosystem = await prisma.ecosystem.upsert({
          where: { name: ecosystemName },
          update: {
            theme,
            description,
            active_status: activeStatus,
            updated_at: new Date()
          },
          create: {
            name: ecosystemName,
            theme,
            description,
            active_status: activeStatus
          }
        });
        ecosystemId = ecosystem.id;
        ecosystemCache.set(ecosystemName, ecosystemId);
      }

      // Prepare platform data
      const platformType = row[platformTypeIdx]?.trim() || 'Other';
      const loginMethod = loginMethodIdx !== -1 ? row[loginMethodIdx]?.trim() : 'email_password';
      const profileUrl = profileUrlIdx !== -1 ? row[profileUrlIdx]?.trim() : null;
      const profileId = profileIdIdx !== -1 ? row[profileIdIdx]?.trim() : null;
      const username = usernameIdx !== -1 ? row[usernameIdx]?.trim() : null;
      const password = passwordIdx !== -1 ? row[passwordIdx]?.trim() : null;
      const email = emailIdx !== -1 ? row[emailIdx]?.trim() : null;
      const phone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : null;
      const recoveryEmail = recoveryEmailIdx !== -1 ? row[recoveryEmailIdx]?.trim() : null;
      const recoveryPhone = recoveryPhoneIdx !== -1 ? row[recoveryPhoneIdx]?.trim() : null;
      const twoFaEnabledStr = twoFaEnabledIdx !== -1 ? row[twoFaEnabledIdx]?.trim().toLowerCase() : 'false';
      const twoFaEnabled = twoFaEnabledStr === 'true' || twoFaEnabledStr === '1' || twoFaEnabledStr === 'yes';
      const totpEnabledStr = totpEnabledIdx !== -1 ? row[totpEnabledIdx]?.trim().toLowerCase() : 'false';
      const totpEnabled = totpEnabledStr === 'true' || totpEnabledStr === '1' || totpEnabledStr === 'yes';
      const totpSecret = totpSecretIdx !== -1 ? row[totpSecretIdx]?.trim() : null;
      const accountStatus = accountStatusIdx !== -1 ? row[accountStatusIdx]?.trim() : 'active';
      const verificationStatus = verificationStatusIdx !== -1 ? row[verificationStatusIdx]?.trim() : 'unverified';
      const notes = notesIdx !== -1 ? row[notesIdx]?.trim() : null;

      // New metadata fields
      const liveStream = liveStreamIdx !== -1 ? row[liveStreamIdx]?.trim() : null;
      const language = languageIdx !== -1 ? row[languageIdx]?.trim() : null;
      const status = statusIdx !== -1 ? row[statusIdx]?.trim() : null;
      const recoveryPhoneNumber = recoveryPhoneNumberIdx !== -1 ? row[recoveryPhoneNumberIdx]?.trim() : null;
      const recoveryEmailId = recoveryEmailIdIdx !== -1 ? row[recoveryEmailIdIdx]?.trim() : null;
      const addedPhoneNumber = addedPhoneNumberIdx !== -1 ? row[addedPhoneNumberIdx]?.trim() : null;
      const phoneNumberOwner = phoneNumberOwnerIdx !== -1 ? row[phoneNumberOwnerIdx]?.trim() : null;
      const branding = brandingIdx !== -1 ? row[brandingIdx]?.trim() : null;
      const connectionTool = connectionToolIdx !== -1 ? row[connectionToolIdx]?.trim() : null;

      // Validate login method
      const validLoginMethods = ['email_password', 'google_oauth', 'facebook_oauth', 'apple_id'];
      if (!validLoginMethods.includes(loginMethod)) {
        errors.push(`Row ${i + 2}: Invalid login_method '${loginMethod}'. Must be one of: ${validLoginMethods.join(', ')}`);
        continue;
      }

      // Create or update platform
      await prisma.socialMediaPlatform.upsert({
        where: {
          ecosystem_id_platform_name: {
            ecosystem_id: ecosystemId,
            platform_name: platformName
          }
        },
        update: {
          platform_type: platformType,
          login_method: loginMethod,
          profile_url: profileUrl,
          profile_id: profileId,
          username: username ? encrypt(username) : null,
          password: password ? encrypt(password) : null,
          email: email,
          phone: phone,
          recovery_email: recoveryEmail,
          recovery_phone: recoveryPhone,
          two_fa_enabled: twoFaEnabled,
          totp_enabled: totpEnabled,
          totp_secret: totpSecret ? encrypt(totpSecret) : null,
          account_status: accountStatus,
          verification_status: verificationStatus,
          notes: notes,
          // New metadata fields
          live_stream: liveStream,
          language: language,
          status: status,
          recovery_phone_number: recoveryPhoneNumber,
          recovery_email_id: recoveryEmailId,
          added_phone_number: addedPhoneNumber,
          phone_number_owner: phoneNumberOwner,
          branding: branding,
          connection_tool: connectionTool,
          updated_at: new Date()
        },
        create: {
          ecosystem_id: ecosystemId,
          platform_name: platformName,
          platform_type: platformType,
          login_method: loginMethod,
          profile_url: profileUrl,
          profile_id: profileId,
          username: username ? encrypt(username) : null,
          password: password ? encrypt(password) : null,
          email: email,
          phone: phone,
          recovery_email: recoveryEmail,
          recovery_phone: recoveryPhone,
          two_fa_enabled: twoFaEnabled,
          totp_enabled: totpEnabled,
          totp_secret: totpSecret ? encrypt(totpSecret) : null,
          account_status: accountStatus,
          verification_status: verificationStatus,
          notes: notes,
          // New metadata fields
          live_stream: liveStream,
          language: language,
          status: status,
          recovery_phone_number: recoveryPhoneNumber,
          recovery_email_id: recoveryEmailId,
          added_phone_number: addedPhoneNumber,
          phone_number_owner: phoneNumberOwner,
          branding: branding,
          connection_tool: connectionTool
        }
      });

      imported++;
    } catch (error) {
      errors.push(`Row ${i + 2}: ${(error as Error).message}`);
    }
  }

  return imported;
}
