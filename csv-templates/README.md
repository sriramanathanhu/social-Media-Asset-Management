# CSV Import Templates

This directory contains templates for bulk importing data into the Social Media Asset Management Portal.

## Bulk Import Template

**File:** `bulk_import_template.csv`

This template allows you to import complete ecosystems with their associated social media platforms in a single file.

### Column Descriptions

#### Ecosystem Fields (Required for first platform of each ecosystem)
- **ecosystem_name** (Required): Unique name of the ecosystem
- **ecosystem_theme** (Required): Theme/category of the ecosystem
- **ecosystem_description** (Optional): Description of the ecosystem
- **ecosystem_active_status** (Optional): `true` or `false` (default: true)

#### Platform Fields
- **platform_name** (Required): Unique name for the platform within the ecosystem
- **platform_type** (Required): Type of social media platform (e.g., Facebook, Instagram, Twitter/X, YouTube, TikTok, LinkedIn, etc.)
- **login_method** (Required): How you login to this platform
  - `email_password` - Standard email and password login
  - `google_oauth` - Login via Google account
  - `facebook_oauth` - Login via Facebook account
  - `apple_id` - Login via Apple ID
- **profile_url** (Optional): Full URL to the profile page
- **profile_id** (Optional): Platform-specific profile/page ID
- **username** (Optional): Username for login (NOT used for profile URL generation)
- **password** (Optional): Password (will be encrypted)
- **email** (Required): Email address associated with the account
- **phone** (Optional): Phone number
- **recovery_email** (Optional): Recovery email address
- **recovery_phone** (Optional): Recovery phone number
- **two_fa_enabled** (Optional): `true` or `false` (default: false)
- **totp_enabled** (Optional): `true` or `false` (default: false)
- **totp_secret** (Optional): TOTP secret key (will be encrypted)
- **account_status** (Optional): active, suspended, disabled (default: active)
- **verification_status** (Optional): verified, unverified, pending (default: unverified)
- **notes** (Optional): Additional notes about the platform

### Important Notes

1. **Profile URL Independence**: The `profile_url` field is independent of the `username` field. Set the complete profile URL explicitly, as it won't be auto-generated from the username.

2. **Login Methods**:
   - For `email_password`: Provide both `username` and `password`
   - For OAuth methods (`google_oauth`, `facebook_oauth`, `apple_id`): Leave `username` and `password` empty or provide the email used for OAuth

3. **Ecosystem Reuse**: You can add multiple platforms to the same ecosystem by repeating the ecosystem name. Only the first occurrence needs all ecosystem details; subsequent rows can just have the ecosystem_name.

4. **Security**: All sensitive fields (`password`, `totp_secret`, `username`) will be automatically encrypted upon import.

5. **TOTP Setup**: If `totp_enabled` is `true`, provide the `totp_secret` in Base32 format.

### Example Usage Patterns

#### Pattern 1: New Ecosystem with Multiple Platforms
```csv
ecosystem_name,ecosystem_theme,ecosystem_description,ecosystem_active_status,platform_name,platform_type,login_method,email,profile_url
My Brand,Marketing,Brand marketing channels,true,Brand Facebook,Facebook,email_password,social@mybrand.com,https://facebook.com/mybrand
My Brand,,,,,Brand Instagram,Instagram,google_oauth,social@mybrand.com,https://instagram.com/mybrand
My Brand,,,,,Brand Twitter,Twitter/X,email_password,twitter@mybrand.com,https://twitter.com/mybrand
```

#### Pattern 2: Platform with OAuth Login
```csv
ecosystem_name,platform_name,platform_type,login_method,email,profile_url,notes
Tech News,Tech News YouTube,YouTube,google_oauth,channel@technews.com,https://youtube.com/@technews,Login using channel@technews.com Google account
```

#### Pattern 3: Platform with TOTP 2FA
```csv
ecosystem_name,platform_name,platform_type,login_method,username,password,email,two_fa_enabled,totp_enabled,totp_secret
Security Blog,Security Twitter,Twitter/X,email_password,secblog_admin,MyStr0ngP@ss,admin@secblog.com,true,true,JBSWY3DPEHPK3PXP
```

### Step-by-Step Import Process

1. **Download the template**: Use `bulk_import_template.csv` as your starting point
2. **Fill in your data**: Add your ecosystems and platforms
3. **Validate**: Ensure required fields are filled
4. **Import**: Upload via the application's Import feature
5. **Verify**: Check that all data was imported correctly

### Tips

- Use a spreadsheet application (Excel, Google Sheets) to edit the CSV
- Keep backups of your CSV files
- Test with a small dataset first
- Use consistent naming conventions
- Document your login methods clearly in the notes field
- For OAuth logins, specify which email account is used in the notes

### Common Login Method Examples

| Platform | Typical Login Methods |
|----------|----------------------|
| Facebook | email_password, google_oauth, apple_id |
| Instagram | email_password, facebook_oauth |
| Twitter/X | email_password, google_oauth, apple_id |
| YouTube | google_oauth |
| TikTok | email_password, google_oauth, facebook_oauth, apple_id |
| LinkedIn | email_password, google_oauth |
| Pinterest | email_password, google_oauth, facebook_oauth |

### Error Handling

- Duplicate ecosystem names will update existing ecosystems
- Duplicate platform names within an ecosystem will update existing platforms
- Invalid data will be reported with row numbers
- Partial imports are possible (some rows may fail while others succeed)
