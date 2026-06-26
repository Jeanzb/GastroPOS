import bcrypt from 'bcrypt';
import { DiningTableStatus, PrismaClient, UserRole } from '../generated/prisma';
import { DEFAULT_INVENTORY_CATEGORIES } from '../src/modules/inventory/inventory-categories.constants';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

function envValue(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function passwordEnvValue(name: string, developmentFallback: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured before production seed.`);
  }
  return developmentFallback;
}

export async function seedInitialData(): Promise<void> {
  const tenantName = envValue('SEED_TENANT_NAME', 'GastroAI Demo');
  const tenantSlug = envValue('SEED_TENANT_SLUG', 'gastroai-demo');
  const branchName = envValue('SEED_BRANCH_NAME', 'Sede El Poblado');
  const branchCode = envValue('SEED_BRANCH_CODE', 'MAIN');
  const ownerEmail = envValue('SEED_OWNER_EMAIL', 'owner@gastroai.local');
  const ownerPassword = passwordEnvValue('SEED_OWNER_PASSWORD', 'ChangeMe123!');
  const platformOwnerEmail = envValue('SEED_PLATFORM_OWNER_EMAIL', 'platform@gastroai.local');
  const platformOwnerPassword = passwordEnvValue(
    'SEED_PLATFORM_OWNER_PASSWORD',
    'ChangeMePlatform123!',
  );

  if (ownerPassword.length < 12) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters long.');
  }
  if (platformOwnerPassword.length < 12) {
    throw new Error('SEED_PLATFORM_OWNER_PASSWORD must be at least 12 characters long.');
  }

  const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);
  const platformPasswordHash = await bcrypt.hash(platformOwnerPassword, BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const platformOwner = await tx.platformUser.upsert({
      where: { email: platformOwnerEmail },
      update: {
        fullName: 'GastroIA Platform Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: platformOwnerEmail,
        fullName: 'GastroIA Platform Owner',
        role: 'PLATFORM_OWNER',
        passwordHash: platformPasswordHash,
      },
    });

    const basicPlan = await tx.plan.upsert({
      where: { code: 'BASIC' },
      update: { name: 'Basic', isActive: true },
      create: {
        code: 'BASIC',
        name: 'Basic',
        description: 'Suscripcion unica con todos los modulos incluidos.',
      },
    });

    const featureDefinitions = [
      ['pos.enabled', 'POS'],
      ['tables.enabled', 'Mesas'],
      ['cash.enabled', 'Caja'],
      ['inventory.enabled', 'Inventario'],
      ['purchases.enabled', 'Compras'],
      ['employees.enabled', 'Empleados'],
      ['reports.basic', 'Reportes basicos'],
      ['reports.advanced', 'Reportes avanzados'],
      ['multi_branch.enabled', 'Multi-sede'],
      ['dian.enabled', 'DIAN readiness'],
    ] as const;

    for (const [code, name] of featureDefinitions) {
      const feature = await tx.feature.upsert({
        where: { code },
        update: { name, isActive: true },
        create: { code, name, isActive: true },
      });
      await tx.planFeature.upsert({
        where: {
          planId_featureId: {
            planId: basicPlan.id,
            featureId: feature.id,
          },
        },
        update: { enabled: true },
        create: {
          planId: basicPlan.id,
          featureId: feature.id,
          enabled: true,
        },
      });
    }

    const tenant = await tx.tenant.upsert({
      where: { slug: tenantSlug },
      update: {
        name: tenantName,
        isActive: true,
        status: 'ACTIVE',
        planId: basicPlan.id,
        deletedAt: null,
      },
      create: {
        name: tenantName,
        slug: tenantSlug,
        status: 'ACTIVE',
        planId: basicPlan.id,
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

    for (const category of DEFAULT_INVENTORY_CATEGORIES) {
      await tx.inventoryCategory.upsert({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: category.code,
          },
        },
        update: {
          name: category.name,
          skuPrefix: category.skuPrefix,
          isActive: true,
          deletedAt: null,
        },
        create: {
          tenantId: tenant.id,
          code: category.code,
          name: category.name,
          skuPrefix: category.skuPrefix,
        },
      });
      await tx.inventorySkuSequence.upsert({
        where: {
          tenantId_prefix: {
            tenantId: tenant.id,
            prefix: category.skuPrefix,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          prefix: category.skuPrefix,
          nextNumber: 1,
        },
      });
    }

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
        documentNumber: '79123456',
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: ownerEmail,
        fullName: 'Maria Restrepo',
        role: UserRole.OWNER,
        documentNumber: '79123456',
        passwordHash,
      },
    });

    const waiter = await tx.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'mesero@gastroai.local',
        },
      },
      update: {
        fullName: 'Diego Gomez',
        role: UserRole.WAITER,
        branchId: branch.id,
        documentNumber: '1098765432',
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: 'mesero@gastroai.local',
        fullName: 'Diego Gomez',
        role: UserRole.WAITER,
        documentNumber: '1098765432',
        passwordHash,
      },
    });
    void waiter;

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
      const existingZone = await tx.diningZone.findFirst({
        where: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: zoneDefinition.name,
        },
      });
      const zone = existingZone
        ? await tx.diningZone.update({
            where: { id: existingZone.id },
            data: {
              sortOrder: zoneDefinition.sortOrder,
              isActive: true,
              deletedAt: null,
              updatedById: owner.id,
            },
          })
        : await tx.diningZone.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              name: zoneDefinition.name,
              sortOrder: zoneDefinition.sortOrder,
              createdById: owner.id,
            },
          });

      for (const tableDefinition of zoneDefinition.tables) {
        const existingTable = await tx.diningTable.findFirst({
          where: {
              tenantId: tenant.id,
              branchId: branch.id,
              number: tableDefinition.number,
          },
        });
        const tableData = {
          zoneId: zone.id,
          seats: tableDefinition.seats,
          status: tableDefinition.status,
          waiterName: tableDefinition.waiterName ?? null,
          openedAt: tableDefinition.openedAt ?? null,
          reservationName: tableDefinition.reservationName ?? null,
          reservationTime: tableDefinition.reservationTime ?? null,
        };
        if (existingTable) {
          await tx.diningTable.update({
            where: { id: existingTable.id },
            data: {
              ...tableData,
              deletedAt: null,
              updatedById: owner.id,
            },
          });
        } else {
          await tx.diningTable.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              number: tableDefinition.number,
              ...tableData,
              createdById: owner.id,
            },
          });
        }
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

    return { tenant, branch, owner, platformOwner };
  });

  console.log(
    `Seed ready: tenant=${result.tenant.slug}, branch=${result.branch.code}, owner=${result.owner.email}, platform=${result.platformOwner.email}`,
  );
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

if (require.main === module) {
  seedInitialData()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
