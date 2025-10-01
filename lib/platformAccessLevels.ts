// Platform-specific access levels for different social media platforms

export const PLATFORM_ACCESS_LEVELS: Record<string, string[]> = {
  Facebook: [
    'Admin',
    'Editor',
    'Moderator',
    'Advertiser',
    'Analyst',
  ],
  YouTube: [
    'Owner',
    'Manager',
    'Editor',
    'Viewer (Analytics)',
  ],
  Twitter: [
    'Admin',
    'Contributor',
  ],
  Pinterest: [
    'Owner',
    'Admin',
    'Contributor',
    'Viewer',
  ],
  LinkedIn: [
    'Super Admin',
    'Content Admin',
    'Analyst',
    'Recruiter',
  ],
  Website: [
    'Administrator',
    'Editor',
    'Author',
    'Contributor',
    'Viewer',
  ],
  SoundCloud: [
    'Admin',
    'Contributor',
  ],
  'WhatsApp Channel': [
    'Admin',
    'Editor',
  ],
  Instagram: [
    'Admin',
    'Editor',
    'Moderator',
  ],
  TikTok: [
    'Admin',
    'Operator',
    'Analyst',
  ],
  Snapchat: [
    'Admin',
    'Contributor',
  ],
};

/**
 * Get access levels for a specific platform type
 */
export function getAccessLevelsForPlatform(platformType: string): string[] {
  // Try exact match first
  if (PLATFORM_ACCESS_LEVELS[platformType]) {
    return PLATFORM_ACCESS_LEVELS[platformType];
  }

  // Try case-insensitive match
  const matchedKey = Object.keys(PLATFORM_ACCESS_LEVELS).find(
    key => key.toLowerCase() === platformType.toLowerCase()
  );

  if (matchedKey) {
    return PLATFORM_ACCESS_LEVELS[matchedKey];
  }

  // Default access levels for unknown platforms
  return ['Admin', 'Editor', 'Viewer'];
}

/**
 * Check if a platform supports access level tracking
 */
export function platformSupportsAccessLevels(platformType: string): boolean {
  const supportedPlatforms = [
    'Facebook',
    'YouTube',
    'Twitter',
    'Pinterest',
    'LinkedIn',
    'Website',
    'SoundCloud',
    'WhatsApp Channel',
    'Instagram',
    'TikTok',
    'Snapchat',
  ];

  return supportedPlatforms.some(
    platform => platform.toLowerCase() === platformType.toLowerCase()
  );
}

/**
 * Get a description for an access level
 */
export function getAccessLevelDescription(
  platformType: string,
  accessLevel: string
): string {
  const descriptions: Record<string, Record<string, string>> = {
    Facebook: {
      Admin: 'Full control over the Page',
      Editor: 'Can create and publish posts, respond to messages',
      Moderator: 'Can respond to and delete comments and posts',
      Advertiser: 'Can create ads and view insights',
      Analyst: 'Can view insights only',
    },
    YouTube: {
      Owner: 'Complete control over the channel',
      Manager: 'Can manage videos, playlists, and settings',
      Editor: 'Can upload and edit videos',
      'Viewer (Analytics)': 'Can view analytics only',
    },
    LinkedIn: {
      'Super Admin': 'Full administrative control',
      'Content Admin': 'Can create and manage content',
      Analyst: 'Can view analytics',
      Recruiter: 'Can post jobs and manage applications',
    },
  };

  return descriptions[platformType]?.[accessLevel] || '';
}
