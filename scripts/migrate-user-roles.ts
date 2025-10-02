import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserRoles() {
  console.log('Starting role migration...');

  // Update users with role "admin" to keep "admin"
  const adminUpdate = await prisma.user.updateMany({
    where: { role: 'admin' },
    data: { role: 'admin' }
  });
  console.log(`✓ ${adminUpdate.count} admin users updated`);

  // Update users with role "user" to "read" (default)
  const userUpdate = await prisma.user.updateMany({
    where: { role: 'user' },
    data: { role: 'read' }
  });
  console.log(`✓ ${userUpdate.count} regular users updated to 'read' role`);

  console.log('Role migration completed!');
}

migrateUserRoles()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
