import { PrismaClient } from '@prisma/client';
import { encrypt } from '../lib/utils/encryption';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin users
  console.log('👤 Creating admin users...');
  const adminUsers = [
    { email: 'vyahut@gmail.com', name: 'Vyahut Admin', ecitizen_id: 'ECIT001' },
    { email: 'sri.ramanatha@kailasaafrica.org', name: 'Sri Ramanatha', ecitizen_id: 'ECIT002' },
  ];

  for (const userData of adminUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: { role: 'admin' },
      create: {
        ...userData,
        role: 'admin',
      },
    });
    console.log(`   ✅ Admin user: ${userData.email}`);
  }

  // Create sample ecosystems
  console.log('🌍 Creating sample ecosystems...');
  const ecosystem1 = await prisma.ecosystem.upsert({
    where: { name: 'KAILASA Ecosystem' },
    update: {},
    create: {
      name: 'KAILASA Ecosystem',
      theme: 'Spiritual & Cultural',
      description: 'Official KAILASA social media ecosystem for spiritual content and cultural engagement',
      active_status: true,
    },
  });
  console.log(`   ✅ Ecosystem: ${ecosystem1.name}`);

  const ecosystem2 = await prisma.ecosystem.upsert({
    where: { name: 'eCitizen Media' },
    update: {},
    create: {
      name: 'eCitizen Media',
      theme: 'News & Media',
      description: 'Media ecosystem for news, updates, and community engagement',
      active_status: true,
    },
  });
  console.log(`   ✅ Ecosystem: ${ecosystem2.name}`);

  // Create sample platforms
  console.log('📱 Creating sample social media platforms...');
  const platforms = [
    {
      ecosystem_id: ecosystem1.id,
      platform_name: 'KAILASA Official',
      platform_type: 'Facebook',
      profile_url: 'https://facebook.com/kailasa',
      profile_id: 'kailasa.official',
      username: encrypt('kailasa@example.com'),
      password: encrypt('SecurePassword123!'),
      totp_enabled: true,
      account_status: 'active',
      verification_status: 'verified',
    },
    {
      ecosystem_id: ecosystem1.id,
      platform_name: 'KAILASA Twitter',
      platform_type: 'Twitter',
      profile_url: 'https://twitter.com/kailasa',
      profile_id: '@kailasa_official',
      username: encrypt('kailasa@example.com'),
      password: encrypt('SecurePassword123!'),
      totp_enabled: false,
      account_status: 'active',
      verification_status: 'verified',
    },
    {
      ecosystem_id: ecosystem2.id,
      platform_name: 'eCitizen News',
      platform_type: 'Instagram',
      profile_url: 'https://instagram.com/ecitizen',
      profile_id: 'ecitizen.media',
      username: encrypt('ecitizen@example.com'),
      password: encrypt('SecurePassword123!'),
      totp_enabled: false,
      account_status: 'active',
      verification_status: 'unverified',
    },
  ];

  for (const platformData of platforms) {
    await prisma.socialMediaPlatform.upsert({
      where: {
        ecosystem_id_platform_name: {
          ecosystem_id: platformData.ecosystem_id,
          platform_name: platformData.platform_name
        }
      },
      update: {},
      create: platformData,
    });
    console.log(`   ✅ Platform: ${platformData.platform_name} (${platformData.platform_type})`);
  }

  // Assign users to ecosystems
  console.log('🔗 Assigning users to ecosystems...');
  const admin = await prisma.user.findUnique({ where: { email: 'vyahut@gmail.com' } });

  if (admin) {
    await prisma.userEcosystem.upsert({
      where: {
        user_id_ecosystem_id: {
          user_id: admin.id,
          ecosystem_id: ecosystem1.id,
        },
      },
      update: {},
      create: {
        user_id: admin.id,
        ecosystem_id: ecosystem1.id,
        assigned_by: admin.id,
      },
    });

    await prisma.userEcosystem.upsert({
      where: {
        user_id_ecosystem_id: {
          user_id: admin.id,
          ecosystem_id: ecosystem2.id,
        },
      },
      update: {},
      create: {
        user_id: admin.id,
        ecosystem_id: ecosystem2.id,
        assigned_by: admin.id,
      },
    });
    console.log(`   ✅ Assigned admin to both ecosystems`);
  }

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });