import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';
import { encrypt } from '@/lib/utils/encryption';

interface ImportedLogin {
  name: string;
  url?: string;
  username?: string;
  password?: string;
  totp?: string;
  notes?: string;
  folder?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// POST /api/secure-logins/import - Import credentials from CSV/JSON
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let logins: ImportedLogin[] = [];
    let format = 'json';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      logins = body.logins || body.items || body;
      format = body.format || 'generic';

      // Handle different export formats
      if (format === 'bitwarden') {
        logins = parseBitwardenFormat(body);
      } else if (format === 'lastpass') {
        logins = parseLastPassFormat(body);
      } else if (format === '1password') {
        logins = parse1PasswordFormat(body);
      } else if (format === 'chrome') {
        logins = parseChromeFormat(body);
      }
    } else if (contentType.includes('text/csv') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const formatParam = formData.get('format') as string;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const text = await file.text();
      format = formatParam || 'csv';
      logins = parseCSV(text);
    }

    if (!Array.isArray(logins) || logins.length === 0) {
      return NextResponse.json(
        { error: 'No valid logins found in import data' },
        { status: 400 }
      );
    }

    // Process and import logins
    const result = await importLogins(logins, auth.user.id);

    return NextResponse.json({
      message: `Import completed: ${result.success} imported, ${result.failed} failed`,
      ...result,
    });
  } catch (error) {
    console.error('Error importing logins:', error);
    return NextResponse.json(
      { error: 'Failed to import logins' },
      { status: 500 }
    );
  }
}

// GET /api/secure-logins/import - Get import template
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Return supported formats and CSV template
    return NextResponse.json({
      supported_formats: ['csv', 'json', 'bitwarden', 'lastpass', '1password', 'chrome'],
      csv_template: 'name,url,username,password,totp,notes,folder\n"Example Site","https://example.com","user@email.com","password123","JBSWY3DPEHPK3PXP","Optional notes","Work"',
      json_template: {
        logins: [
          {
            name: 'Example Site',
            url: 'https://example.com',
            username: 'user@email.com',
            password: 'password123',
            totp: 'JBSWY3DPEHPK3PXP',
            notes: 'Optional notes',
            folder: 'Work',
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error getting import template:', error);
    return NextResponse.json(
      { error: 'Failed to get import template' },
      { status: 500 }
    );
  }
}

// Parse CSV data
function parseCSV(csvText: string): ImportedLogin[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

  // Map common header variations
  const headerMap: Record<string, string> = {
    'name': 'name',
    'title': 'name',
    'item_name': 'name',
    'site': 'name',
    'website': 'name',
    'url': 'url',
    'website_url': 'url',
    'login_uri': 'url',
    'uri': 'url',
    'username': 'username',
    'login': 'username',
    'email': 'username',
    'user': 'username',
    'login_username': 'username',
    'password': 'password',
    'login_password': 'password',
    'pass': 'password',
    'totp': 'totp',
    'totp_secret': 'totp',
    'otp': 'totp',
    '2fa': 'totp',
    'authenticator': 'totp',
    'notes': 'notes',
    'note': 'notes',
    'comments': 'notes',
    'extra': 'notes',
    'folder': 'folder',
    'group': 'folder',
    'category': 'folder',
  };

  const logins: ImportedLogin[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const login: ImportedLogin = { name: '' };

    headers.forEach((header, index) => {
      const mappedField = headerMap[header];
      if (mappedField && values[index]) {
        (login as Record<string, string>)[mappedField] = values[index];
      }
    });

    // Only add if we have at least a name
    if (login.name) {
      logins.push(login);
    }
  }

  return logins;
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Parse Bitwarden JSON export format
function parseBitwardenFormat(data: Record<string, unknown>): ImportedLogin[] {
  const items = (data.items || []) as Array<{
    name?: string;
    login?: {
      uris?: Array<{ uri?: string }>;
      username?: string;
      password?: string;
      totp?: string;
    };
    notes?: string;
    folderId?: string;
  }>;

  return items
    .filter(item => item.name)
    .map(item => ({
      name: item.name || '',
      url: item.login?.uris?.[0]?.uri || '',
      username: item.login?.username || '',
      password: item.login?.password || '',
      totp: item.login?.totp || '',
      notes: item.notes || '',
    }));
}

// Parse LastPass CSV export format
function parseLastPassFormat(data: Record<string, unknown>): ImportedLogin[] {
  // LastPass typically exports as CSV, but if JSON
  const items = (data.accounts || data.items || []) as Array<{
    name?: string;
    url?: string;
    username?: string;
    password?: string;
    totp?: string;
    note?: string;
    group?: string;
  }>;

  return items.map(item => ({
    name: item.name || '',
    url: item.url || '',
    username: item.username || '',
    password: item.password || '',
    totp: item.totp || '',
    notes: item.note || '',
    folder: item.group || '',
  }));
}

// Parse 1Password export format
function parse1PasswordFormat(data: Record<string, unknown>): ImportedLogin[] {
  const items = (data.items || []) as Array<{
    title?: string;
    urls?: Array<{ href?: string }>;
    fields?: Array<{
      designation?: string;
      value?: string;
    }>;
    notes?: string;
    tags?: string[];
  }>;

  return items.map(item => {
    const username = item.fields?.find(f => f.designation === 'username')?.value || '';
    const password = item.fields?.find(f => f.designation === 'password')?.value || '';

    return {
      name: item.title || '',
      url: item.urls?.[0]?.href || '',
      username,
      password,
      notes: item.notes || '',
      folder: item.tags?.[0] || '',
    };
  });
}

// Parse Chrome CSV export format
function parseChromeFormat(data: Record<string, unknown>): ImportedLogin[] {
  // Chrome exports as CSV with specific headers
  const items = (data.passwords || data.items || []) as Array<{
    name?: string;
    url?: string;
    username?: string;
    password?: string;
  }>;

  return items.map(item => ({
    name: item.name || item.url || '',
    url: item.url || '',
    username: item.username || '',
    password: item.password || '',
  }));
}

// Import logins to database
async function importLogins(
  logins: ImportedLogin[],
  userId: number
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Create folders if needed
  const folderMap = new Map<string, number>();
  const uniqueFolders = [...new Set(logins.filter(l => l.folder).map(l => l.folder!))];

  for (const folderName of uniqueFolders) {
    try {
      // Check if folder exists
      let folder = await prisma.secureLoginFolder.findFirst({
        where: { name: folderName, owner_id: userId, parent_id: null },
      });

      if (!folder) {
        folder = await prisma.secureLoginFolder.create({
          data: {
            name: folderName,
            owner_id: userId,
          },
        });
      }

      folderMap.set(folderName, folder.id);
    } catch (error) {
      console.error(`Error creating folder ${folderName}:`, error);
    }
  }

  // Import each login
  for (const login of logins) {
    try {
      if (!login.name) {
        result.failed++;
        result.errors.push('Login skipped: missing name');
        continue;
      }

      const folderId = login.folder ? folderMap.get(login.folder) : null;

      await prisma.secureLogin.create({
        data: {
          item_name: login.name,
          website_url: login.url || null,
          username: login.username ? encrypt(login.username) : null,
          password: login.password ? encrypt(login.password) : null,
          totp_secret: login.totp ? encrypt(login.totp) : null,
          notes: login.notes || null,
          login_type: 'email_password',
          folder_id: folderId || null,
          owner_id: userId,
        },
      });

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to import "${login.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}
