import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '../src/generated/prisma';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

function envValue(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

async function main(): Promise<void> {
  const tenantName = envValue('SEED_TENANT_NAME', 'GastroAI Demo');
  const tenantSlug = envValue('SEED_TENANT_SLUG', 'gastroai-demo');
  const branchName = envValue('SEED_BRANCH_NAME', 'Sede Principal');
  const branchCode = envValue('SEED_BRANCH_CODE', 'MAIN');
  const ownerEmail = envValue('SEED_OWNER_EMAIL', 'owner@gastroai.local');
  const ownerPassword = envValue('SEED_OWNER_PASSWORD', 'ChangeMe123!');

  if (ownerPassword.length < 12) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters long.');
  }

  const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug: tenantSlug },
      update: {
        name: tenantName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: tenantName,
        slug: tenantSlug,
        settings: {
          create: {},
        },
      },
    });

    await tx.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
      },
    });

    const branch = await tx.branch.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: branchCode,
        },
      },
      update: {
        name: branchName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        name: branchName,
        code: branchCode,
      },
    });

    const owner = await tx.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: ownerEmail,
        },
      },
      update: {
        fullName: 'Owner Demo',
        role: UserRole.OWNER,
        branchId: branch.id,
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: ownerEmail,
        fullName: 'Owner Demo',
        role: UserRole.OWNER,
        passwordHash,
      },
    });

    return { tenant, branch, owner };
  });

  console.log(
    `Seed ready: tenant=${result.tenant.slug}, branch=${result.branch.code}, owner=${result.owner.email}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
