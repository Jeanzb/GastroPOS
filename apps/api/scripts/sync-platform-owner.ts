import bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

async function main(): Promise<void> {
  if (process.env.SYNC_PLATFORM_OWNER_ON_STARTUP !== 'true') {
    console.log('Platform owner sync skipped.');
    return;
  }

  const email = optionalEnv('SEED_PLATFORM_OWNER_EMAIL')?.toLowerCase();
  const password = optionalEnv('SEED_PLATFORM_OWNER_PASSWORD');
  const oldEmail =
    optionalEnv('OLD_PLATFORM_OWNER_EMAIL')?.toLowerCase() ?? 'platform@gastroai.local';

  if (!email || !password) {
    throw new Error('SEED_PLATFORM_OWNER_EMAIL and SEED_PLATFORM_OWNER_PASSWORD are required.');
  }

  if (password.length < 12) {
    throw new Error('SEED_PLATFORM_OWNER_PASSWORD must be at least 12 characters long.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const owner = await tx.platformUser.upsert({
      where: { email },
      update: {
        passwordHash,
        fullName: 'GastroIA Platform Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        deletedAt: null,
      },
      create: {
        email,
        passwordHash,
        fullName: 'GastroIA Platform Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
      },
      select: { id: true, email: true },
    });

    let deactivatedOldUser = false;
    if (oldEmail !== email) {
      const oldUser = await tx.platformUser.findUnique({
        where: { email: oldEmail },
        select: { id: true },
      });

      if (oldUser) {
        await tx.platformUser.update({
          where: { id: oldUser.id },
          data: { isActive: false },
        });
        await tx.platformSession.updateMany({
          where: { platformUserId: oldUser.id, isActive: true },
          data: { isActive: false, revokedAt: new Date() },
        });
        deactivatedOldUser = true;
      }
    }

    await tx.auditLog.create({
      data: {
        action: 'PLATFORM_OWNER_CREDENTIALS_ROTATED',
        entityType: 'PlatformUser',
        entityId: owner.id,
        after: { email: owner.email, oldEmail, deactivatedOldUser },
        metadata: { source: 'startup-sync-platform-owner' },
      },
    });

    return { email: owner.email, deactivatedOldUser };
  });

  console.log(
    `Platform owner synced: ${result.email}; old user deactivated: ${result.deactivatedOldUser}`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
