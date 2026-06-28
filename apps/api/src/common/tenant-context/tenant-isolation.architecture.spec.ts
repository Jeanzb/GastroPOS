import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MANUALLY_SCOPED_MODELS, TENANT_SCOPED_MODELS } from './tenant-scope.extension';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const SCHEMA_PATH = resolve(REPO_ROOT, 'prisma/schema.prisma');
const MODULES_DIR = resolve(__dirname, '../../modules');

function modelsWithTenantId(schema: string): string[] {
  const models: string[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(schema)) !== null) {
    const [, name, body] = match;
    if (/^\s*tenantId\s+/m.test(body)) {
      models.push(name);
    }
  }
  return models;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('multi-tenant isolation guardrails', () => {
  it('classifies every tenant-owned model as auto-scoped or manually-scoped', () => {
    const schema = readFileSync(SCHEMA_PATH, 'utf8');
    const tenantOwned = modelsWithTenantId(schema);

    expect(tenantOwned.length).toBeGreaterThan(0);

    const unclassified = tenantOwned.filter(
      (model) => !TENANT_SCOPED_MODELS.has(model) && !MANUALLY_SCOPED_MODELS.has(model),
    );

    // A new model carrying `tenantId` must be added to one of the two sets in
    // tenant-scope.extension.ts so isolation is a deliberate choice, not an accident.
    expect(unclassified).toEqual([]);
  });

  it('never lists a model in both the auto-scoped and manually-scoped sets', () => {
    const overlap = [...TENANT_SCOPED_MODELS].filter((model) =>
      MANUALLY_SCOPED_MODELS.has(model),
    );
    expect(overlap).toEqual([]);
  });

  it('forbids business DTOs from accepting a client-supplied tenantId', () => {
    const dtoFiles = walk(MODULES_DIR).filter((file) => file.endsWith('.dto.ts'));
    expect(dtoFiles.length).toBeGreaterThan(0);

    const offenders = dtoFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /^\s*tenantId[?!]?\s*:/m.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
