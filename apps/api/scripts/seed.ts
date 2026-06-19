import bcrypt from 'bcrypt';
import { DiningTableStatus, PrismaClient, UserRole } from '../generated/prisma';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

function envValue(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

async function main(): Promise<void> {
  const tenantName = envValue('SEED_TENANT_NAME', 'GastroAI Demo');
  const tenantSlug = envValue('SEED_TENANT_SLUG', 'gastroai-demo');
  const branchName = envValue('SEED_BRANCH_NAME', 'Sede El Poblado');
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
        fullName: 'Maria Restrepo',
        role: UserRole.OWNER,
        branchId: branch.id,
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: ownerEmail,
        fullName: 'Maria Restrepo',
        role: UserRole.OWNER,
        passwordHash,
      },
    });

    const zoneDefinitions = [
      {
        name: 'Salon Principal',
        sortOrder: 1,
        tables: [
          { number: '01', seats: 4, status: DiningTableStatus.FREE },
          {
            number: '02',
            seats: 4,
            status: DiningTableStatus.OCCUPIED,
            waiterName: 'Diego G.',
            openedAt: minutesAgo(28),
          },
          { number: '03', seats: 2, status: DiningTableStatus.FREE },
          {
            number: '04',
            seats: 4,
            status: DiningTableStatus.PENDING_BILL,
            waiterName: 'Laura M.',
            openedAt: minutesAgo(46),
          },
        ],
      },
      {
        name: 'Terraza',
        sortOrder: 2,
        tables: [
          {
            number: '05',
            seats: 6,
            status: DiningTableStatus.RESERVED,
            reservationName: 'Familia Ruiz',
            reservationTime: '7:30 pm',
          },
          {
            number: '06',
            seats: 4,
            status: DiningTableStatus.OCCUPIED,
            waiterName: 'Diego G.',
            openedAt: minutesAgo(18),
          },
        ],
      },
      {
        name: 'Salon Pequeno',
        sortOrder: 3,
        tables: [
          { number: '07', seats: 2, status: DiningTableStatus.FREE },
          {
            number: '08',
            seats: 4,
            status: DiningTableStatus.OCCUPIED,
            waiterName: 'Maria R.',
            openedAt: minutesAgo(14),
          },
          {
            number: '09',
            seats: 4,
            status: DiningTableStatus.PENDING_BILL,
            waiterName: 'Laura M.',
            openedAt: minutesAgo(39),
          },
        ],
      },
    ];

    for (const zoneDefinition of zoneDefinitions) {
      const zone = await tx.diningZone.upsert({
        where: {
          tenantId_branchId_name: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: zoneDefinition.name,
          },
        },
        update: {
          sortOrder: zoneDefinition.sortOrder,
          isActive: true,
          deletedAt: null,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: zoneDefinition.name,
          sortOrder: zoneDefinition.sortOrder,
          createdById: owner.id,
        },
      });

      for (const tableDefinition of zoneDefinition.tables) {
        await tx.diningTable.upsert({
          where: {
            tenantId_branchId_number: {
              tenantId: tenant.id,
              branchId: branch.id,
              number: tableDefinition.number,
            },
          },
          update: {
            zoneId: zone.id,
            seats: tableDefinition.seats,
            status: tableDefinition.status,
            waiterName: tableDefinition.waiterName ?? null,
            openedAt: tableDefinition.openedAt ?? null,
            reservationName: tableDefinition.reservationName ?? null,
            reservationTime: tableDefinition.reservationTime ?? null,
            deletedAt: null,
            updatedById: owner.id,
          },
          create: {
            tenantId: tenant.id,
            branchId: branch.id,
            zoneId: zone.id,
            number: tableDefinition.number,
            seats: tableDefinition.seats,
            status: tableDefinition.status,
            waiterName: tableDefinition.waiterName,
            openedAt: tableDefinition.openedAt,
            reservationName: tableDefinition.reservationName,
            reservationTime: tableDefinition.reservationTime,
            createdById: owner.id,
          },
        });
      }
    }

    const categoryDefinitions = [
      {
        name: 'Entradas',
        sortOrder: 1,
        products: [
          {
            sku: 'ENT-AREPA-HUEVO',
            name: 'Arepa de huevo',
            description: 'Entrada frita tradicional para servicio rapido.',
            priceAmount: 8000,
          },
          {
            sku: 'ENT-EMPANADAS',
            name: 'Empanadas de la casa',
            description: 'Porcion de empanadas con aji.',
            priceAmount: 12000,
          },
        ],
      },
      {
        name: 'Platos fuertes',
        sortOrder: 2,
        products: [
          {
            sku: 'FUERTE-BANDEJA-PAISA',
            name: 'Bandeja paisa',
            description: 'Plato fuerte colombiano de alto movimiento.',
            priceAmount: 32000,
          },
          {
            sku: 'FUERTE-AJIACO',
            name: 'Ajiaco bogotano',
            description: 'Sopa tradicional con pollo, papa y guascas.',
            priceAmount: 28000,
          },
        ],
      },
      {
        name: 'Bebidas',
        sortOrder: 3,
        products: [
          {
            sku: 'BEB-LIMONADA-COCO',
            name: 'Limonada de coco',
            description: 'Bebida fria para comedor.',
            priceAmount: 9500,
          },
          {
            sku: 'BEB-CAFE',
            name: 'Cafe colombiano',
            description: 'Cafe caliente de cierre.',
            priceAmount: 4500,
          },
        ],
      },
    ];

    for (const categoryDefinition of categoryDefinitions) {
      const category = await tx.productCategory.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: categoryDefinition.name,
          },
        },
        update: {
          sortOrder: categoryDefinition.sortOrder,
          isActive: true,
          deletedAt: null,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          name: categoryDefinition.name,
          sortOrder: categoryDefinition.sortOrder,
          createdById: owner.id,
        },
      });

      for (const productDefinition of categoryDefinition.products) {
        await tx.product.upsert({
          where: {
            tenantId_sku: {
              tenantId: tenant.id,
              sku: productDefinition.sku,
            },
          },
          update: {
            categoryId: category.id,
            name: productDefinition.name,
            description: productDefinition.description,
            priceAmount: productDefinition.priceAmount,
            currency: 'COP',
            isActive: true,
            isSellable: true,
            isInventoried: false,
            deletedAt: null,
            updatedById: owner.id,
          },
          create: {
            tenantId: tenant.id,
            categoryId: category.id,
            sku: productDefinition.sku,
            name: productDefinition.name,
            description: productDefinition.description,
            priceAmount: productDefinition.priceAmount,
            currency: 'COP',
            isActive: true,
            isSellable: true,
            isInventoried: false,
            createdById: owner.id,
          },
        });
      }
    }

    return { tenant, branch, owner };
  });

  console.log(
    `Seed ready: tenant=${result.tenant.slug}, branch=${result.branch.code}, owner=${result.owner.email}`,
  );
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
