import { PrismaClient } from '../generated/prisma';
import { seedInitialData } from './seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [platformUsers, tenants, users] = await Promise.all([
    prisma.platformUser.count(),
    prisma.tenant.count(),
    prisma.user.count(),
  ]);

  if (platformUsers > 0 || tenants > 0 || users > 0) {
    console.log(
      `Seed skipped: platformUsers=${platformUsers}, tenants=${tenants}, users=${users}`,
    );
    return;
  }

  console.log('Empty database detected. Running initial seed.');
  await seedInitialData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
