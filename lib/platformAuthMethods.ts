// Platform-specific authentication methods for different social media platforms

export type AuthMethod =
  | 'email_password'
  | 'phone_password'
  | 'google_oauth'
  | 'facebook_oauth'
  | 'apple_id'
  | 'microsoft_oauth'
  | 'yahoo_oauth'
  | 'twitter_oauth'
  | 'twitch_oauth'
  | 'instagram_account'
  | 'cryptographic_keys'
  | 'ethereum_wallet'
  | 'phone_only'
  | 'custom_sso';

export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  email_password: 'Email & Password',
  phone_password: 'Phone & Password',
  google_oauth: 'Google OAuth',
  facebook_oauth: 'Facebook OAuth',
  apple_id: 'Apple ID',
  microsoft_oauth: 'Microsoft OAuth',
  yahoo_oauth: 'Yahoo OAuth',
  twitter_oauth: 'Twitter OAuth',
  twitch_oauth: 'Twitch OAuth',
  instagram_account: 'Instagram Account',
  cryptographic_keys: 'Cryptographic Keys',
  ethereum_wallet: 'Ethereum Wallet',
  phone_only: 'Phone Number',
  custom_sso: 'Custom SSO',
};

export const PLATFORM_AUTH_METHODS: Record<string, AuthMethod[]> = {
  'Email Account': [
    'email_password',
    'google_oauth',
    'microsoft_oauth',
    'apple_id',
    'yahoo_oauth',
  ],
  'YouTube': [
    'google_oauth',
  ],
  'Facebook': [
    'email_password',
    'phone_password',
  ],
  'Instagram': [
    'email_password',
    'phone_password',
    'facebook_oauth',
  ],
  'Twitter (X)': [
    'email_password',
    'phone_password',
    'google_oauth',
    'apple_id',
  ],
  'TikTok': [
    'email_password',
    'phone_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
    'twitter_oauth',
  ],
  'Pinterest': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
  ],
  'LinkedIn': [
    'email_password',
    'google_oauth',
    'microsoft_oauth',
    'apple_id',
  ],
  'Bluesky': [
    'email_password',
  ],
  'Threads': [
    'instagram_account',
    'email_password',
    'phone_password',
  ],
  'Reddit': [
    'email_password',
    'google_oauth',
    'apple_id',
  ],
  'Blogspot': [
    'google_oauth',
  ],
  'Mastodon': [
    'email_password',
  ],
  'Telegram': [
    'phone_password',
  ],
  'Nostr': [
    'cryptographic_keys',
  ],
  'Twitch': [
    'email_password',
  ],
  'DLive': [
    'email_password',
    'google_oauth',
    'apple_id',
    'twitch_oauth',
  ],
  'Trovo': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
  ],
  'Kick': [
    'email_password',
    'google_oauth',
    'apple_id',
  ],
  'Rumble': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
  ],
  'WhatsApp Channel': [
    'phone_only',
  ],
  'Medium': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
    'twitter_oauth',
  ],
  'Quora': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
  ],
  'Discord': [
    'email_password',
    'phone_password',
  ],
  'Website': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
    'microsoft_oauth',
    'custom_sso',
  ],
  'Tumblr': [
    'email_password',
    'google_oauth',
    'apple_id',
    'twitter_oauth',
  ],
  'Flickr': [
    'email_password',
  ],
  'SoundCloud': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
  ],
  'Substack': [
    'email_password',
  ],
  'DeviantArt': [
    'email_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
  ],
};

// Default auth method for each platform
export const PLATFORM_DEFAULT_AUTH: Record<string, AuthMethod> = {
  'Email Account': 'email_password',
  'YouTube': 'google_oauth',
  'Facebook': 'email_password',
  'Instagram': 'email_password',
  'Twitter (X)': 'email_password',
  'TikTok': 'email_password',
  'Pinterest': 'email_password',
  'LinkedIn': 'email_password',
  'Bluesky': 'email_password',
  'Threads': 'instagram_account',
  'Reddit': 'email_password',
  'Blogspot': 'google_oauth',
  'Mastodon': 'email_password',
  'Telegram': 'phone_password',
  'Nostr': 'cryptographic_keys',
  'Twitch': 'email_password',
  'DLive': 'email_password',
  'Trovo': 'email_password',
  'Kick': 'email_password',
  'Rumble': 'email_password',
  'WhatsApp Channel': 'phone_only',
  'Medium': 'email_password',
  'Quora': 'email_password',
  'Discord': 'email_password',
  'Website': 'email_password',
  'Tumblr': 'email_password',
  'Flickr': 'email_password',
  'SoundCloud': 'email_password',
  'Substack': 'email_password',
  'DeviantArt': 'email_password',
};

/**
 * Get available authentication methods for a specific platform
 */
export function getAuthMethodsForPlatform(platformType: string): AuthMethod[] {
  // Try exact match first
  if (PLATFORM_AUTH_METHODS[platformType]) {
    return PLATFORM_AUTH_METHODS[platformType];
  }

  // Try case-insensitive match
  const matchedKey = Object.keys(PLATFORM_AUTH_METHODS).find(
    key => key.toLowerCase() === platformType.toLowerCase()
  );

  if (matchedKey) {
    return PLATFORM_AUTH_METHODS[matchedKey];
  }

  // For custom platforms or unknown platforms, return all common methods
  return [
    'email_password',
    'phone_password',
    'google_oauth',
    'facebook_oauth',
    'apple_id',
    'microsoft_oauth',
  ];
}

/**
 * Get the default authentication method for a platform
 */
export function getDefaultAuthMethod(platformType: string): AuthMethod {
  // Try exact match first
  if (PLATFORM_DEFAULT_AUTH[platformType]) {
    return PLATFORM_DEFAULT_AUTH[platformType];
  }

  // Try case-insensitive match
  const matchedKey = Object.keys(PLATFORM_DEFAULT_AUTH).find(
    key => key.toLowerCase() === platformType.toLowerCase()
  );

  if (matchedKey) {
    return PLATFORM_DEFAULT_AUTH[matchedKey];
  }

  // Default to email/password
  return 'email_password';
}

/**
 * Get the label for an authentication method
 */
export function getAuthMethodLabel(authMethod: AuthMethod): string {
  return AUTH_METHOD_LABELS[authMethod] || authMethod;
}

/**
 * Check if an auth method is valid for a platform
 */
export function isAuthMethodValidForPlatform(
  platformType: string,
  authMethod: AuthMethod
): boolean {
  const allowedMethods = getAuthMethodsForPlatform(platformType);
  return allowedMethods.includes(authMethod);
}
