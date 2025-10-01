import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTable() {
  try {
    console.log('Checking PlatformAccess table...');

    // Try to query the table
    const count = await prisma.platformAccess.count();
    console.log(`✓ PlatformAccess table exists with ${count} records`);

    // Check if we can create a test record (then delete it)
    console.log('\nAttempting to create a test record...');

    // First, get a test user and platform
    const user = await prisma.user.findFirst();
    const platform = await prisma.socialMediaPlatform.findFirst();

    if (!user || !platform) {
      console.log('⚠ Need at least one user and one platform to test');
      return;
    }

    console.log(`Found user: ${user.name} (ID: ${user.id})`);
    console.log(`Found platform: ${platform.platform_name} (ID: ${platform.id})`);

    // Try to create access
    const testAccess = await prisma.platformAccess.create({
      data: {
        platform_id: platform.id,
        user_id: user.id,
        access_level: 'Test Admin',
        granted_by: user.id,
        notes: 'Test record'
      }
    });

    console.log('✓ Test record created successfully:', testAccess);

    // Delete the test record
    await prisma.platformAccess.delete({
      where: { id: testAccess.id }
    });

    console.log('✓ Test record deleted successfully');
    console.log('\n✅ PlatformAccess table is working correctly!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
