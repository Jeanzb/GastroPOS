import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

type ProductCategoryDto = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type ProductDto = {
  id: string;
  categoryId: string | null;
  sku: string | null;
  name: string;
  priceAmount: number;
  currency: string;
  isActive: boolean;
};

type PaginatedResult<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type LoginResponse = {
  tokens: {
    accessToken: string;
  };
  user: {
    branchId: string | null;
  };
};

type BranchDto = {
  id: string;
  name: string;
};

type MenuItem = {
  categoryName: string;
  productName: string;
  priceAmount: number;
  sourcePrice: string;
};

type ImportPlan = {
  categories: string[];
  items: MenuItem[];
  skipped: Array<{ categoryName: string; productName: string; reason: string }>;
};

const STOP_WORDS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'menu',
  'y',
]);

const REQUIRED_ENV = [
  'GASTROIA_API_URL',
  'GASTROIA_TENANT_IDENTIFIER',
  'GASTROIA_EMAIL',
  'GASTROIA_PASSWORD',
  'GASTROIA_MENU_FILE',
] as const;

async function main() {
  const env = readEnv();
  const apply = env.GASTROIA_APPLY === 'true';
  const api = new GastroiaApi(env.GASTROIA_API_URL);
  const plan = parseMenu(readFileSync(env.GASTROIA_MENU_FILE, 'utf8'));

  console.log(`Menu file: ${basename(env.GASTROIA_MENU_FILE)}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`Parsed categories: ${plan.categories.length}`);
  console.log(`Parsed products: ${plan.items.length}`);
  console.log(`Skipped rows: ${plan.skipped.length}`);

  const login = await api.login({
    tenantIdentifier: env.GASTROIA_TENANT_IDENTIFIER,
    email: env.GASTROIA_EMAIL,
    password: env.GASTROIA_PASSWORD,
  });
  api.setToken(login.tokens.accessToken);

  const branches = await api.getBranches();
  const branch =
    branches.find((candidate) => candidate.id === login.user.branchId) ??
    branches.find((candidate) => candidate.name === env.GASTROIA_BRANCH_NAME) ??
    branches[0];
  if (branch) {
    api.setBranch(branch.id);
    console.log(`Branch context: ${branch.name}`);
  }

  const existingCategories = await api.getAllCategories();
  const existingProducts = await api.getAllProducts();
  const categoriesByName = new Map(
    existingCategories.map((category) => [normalizeKey(category.name), category]),
  );
  const productsByCategoryAndName = new Set(
    existingProducts.map((product) => `${product.categoryId ?? 'none'}:${normalizeKey(product.name)}`),
  );
  const usedSkus = new Set(
    existingProducts
      .map((product) => product.sku)
      .filter((sku): sku is string => Boolean(sku)),
  );
  const nextByPrefix = buildNextSequenceMap(usedSkus);
  const prefixByCategory = assignCategoryPrefixes(plan.categories);

  let createdCategories = 0;
  let reusedCategories = 0;
  let createdProducts = 0;
  let skippedExistingProducts = 0;

  const categoryIds = new Map<string, string>();
  for (const [index, categoryName] of plan.categories.entries()) {
    const existing = categoriesByName.get(normalizeKey(categoryName));
    if (existing) {
      categoryIds.set(categoryName, existing.id);
      reusedCategories += 1;
      continue;
    }

    if (!apply) {
      categoryIds.set(categoryName, `dry-run-category-${index}`);
      createdCategories += 1;
      continue;
    }

    const created = await api.createCategory({
      name: categoryName,
      sortOrder: index + 1,
      isActive: true,
    });
    categoryIds.set(categoryName, created.id);
    categoriesByName.set(normalizeKey(categoryName), created);
    createdCategories += 1;
    console.log(`Created category: ${categoryName}`);
  }

  for (const item of plan.items) {
    const categoryId = categoryIds.get(item.categoryName);
    if (!categoryId) {
      throw new Error(`Missing category id for ${item.categoryName}`);
    }

    const dedupeKey = `${categoryId}:${normalizeKey(item.productName)}`;
    if (productsByCategoryAndName.has(dedupeKey)) {
      skippedExistingProducts += 1;
      continue;
    }

    const prefix = prefixByCategory.get(item.categoryName) ?? 'GEN';
    const sku = nextSku(prefix, nextByPrefix, usedSkus);

    if (!apply) {
      createdProducts += 1;
      continue;
    }

    await api.createProduct({
      name: item.productName,
      sku,
      categoryId,
      priceAmount: item.priceAmount,
      currency: 'COP',
      isActive: true,
      isSellable: true,
      isInventoried: false,
      description: `Importado desde ${basename(env.GASTROIA_MENU_FILE)}. Precio fuente: ${item.sourcePrice}.`,
    });
    productsByCategoryAndName.add(dedupeKey);
    createdProducts += 1;
    console.log(`Created product: ${sku} ${item.productName} - ${item.priceAmount}`);
  }

  console.log('');
  console.log('Import summary');
  console.log(`Categories to create/created: ${createdCategories}`);
  console.log(`Categories reused: ${reusedCategories}`);
  console.log(`Products to create/created: ${createdProducts}`);
  console.log(`Products skipped because they already exist: ${skippedExistingProducts}`);
  if (plan.skipped.length > 0) {
    console.log('Skipped non-fixed-price rows:');
    for (const skipped of plan.skipped) {
      console.log(`- [${skipped.categoryName}] ${skipped.productName}: ${skipped.reason}`);
    }
  }
}

function readEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }

  return {
    GASTROIA_API_URL: normalizeApiUrl(process.env.GASTROIA_API_URL ?? ''),
    GASTROIA_TENANT_IDENTIFIER: process.env.GASTROIA_TENANT_IDENTIFIER ?? '',
    GASTROIA_EMAIL: process.env.GASTROIA_EMAIL ?? '',
    GASTROIA_PASSWORD: process.env.GASTROIA_PASSWORD ?? '',
    GASTROIA_MENU_FILE: process.env.GASTROIA_MENU_FILE ?? '',
    GASTROIA_BRANCH_NAME: process.env.GASTROIA_BRANCH_NAME,
    GASTROIA_APPLY: process.env.GASTROIA_APPLY,
  };
}

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

function parseMenu(markdown: string): ImportPlan {
  const categories: string[] = [];
  const items: MenuItem[] = [];
  const skipped: ImportPlan['skipped'] = [];
  const lines = markdown.split(/\r?\n/);
  let currentH2 = '';
  let currentH3 = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      currentH2 = cleanHeading(h2[1]);
      currentH3 = '';
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      currentH3 = cleanHeading(h3[1]);
      continue;
    }

    if (!isTableLine(line) || isSeparatorLine(line)) {
      continue;
    }

    const tableLines = [line];
    let cursor = index + 1;
    while (cursor < lines.length && isTableLine(lines[cursor].trim())) {
      tableLines.push(lines[cursor].trim());
      cursor += 1;
    }
    index = cursor - 1;

    const categoryName = currentH3 || currentH2;
    if (!categoryName) {
      continue;
    }
    if (!categories.includes(categoryName)) {
      categories.push(categoryName);
    }
    parseTable(categoryName, tableLines, items, skipped);
  }

  return { categories, items, skipped };
}

function parseTable(
  categoryName: string,
  tableLines: string[],
  items: MenuItem[],
  skipped: ImportPlan['skipped'],
): void {
  const rows = tableLines.map(splitTableRow).filter((row) => row.length >= 2);
  if (rows.length < 2) {
    return;
  }

  const headers = rows[0];
  const dataRows = rows.slice(1).filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));
  const productHeader = headers[0]?.trim() || 'Producto';

  for (const row of dataRows) {
    const baseName = row[0]?.trim();
    if (!baseName || /^:?-+:?$/.test(baseName)) {
      continue;
    }

    for (let column = 1; column < headers.length; column += 1) {
      const priceCell = row[column]?.trim() ?? '';
      const priceAmount = parsePrice(priceCell);
      const variant = headers[column]?.trim() ?? 'Precio';
      const productName =
        headers.length > 2 && !/^precio$/i.test(variant)
          ? `${baseName} - ${variant}`
          : normalizeProductName(baseName, productHeader);

      if (priceAmount === null) {
        skipped.push({
          categoryName,
          productName,
          reason: priceCell || 'Sin precio fijo',
        });
        continue;
      }

      items.push({
        categoryName,
        productName,
        priceAmount,
        sourcePrice: priceCell,
      });
    }
  }
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableLine(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|');
}

function isSeparatorLine(line: string): boolean {
  return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line);
}

function parsePrice(value: string): number | null {
  const match = value.match(/\$\s*([\d.,]+)/);
  if (!match) {
    return null;
  }
  const digits = match[1].replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function cleanHeading(value: string): string {
  return value
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeProductName(value: string, productHeader: string): string {
  if (/cantidad/i.test(productHeader)) {
    return value;
  }
  return value.replace(/\s+/g, ' ').trim();
}

function assignCategoryPrefixes(categories: string[]): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();
  for (const category of categories) {
    const words = ascii(category)
      .split(/[^A-Z0-9]+/)
      .filter((word) => word.length > 0 && !STOP_WORDS.has(word.toLowerCase()));
    let prefix = (words[0] ?? 'GEN').slice(0, 3).padEnd(3, 'X');

    if (used.has(prefix) && words.length > 1) {
      prefix = `${words[0][0] ?? 'G'}${words[1]?.[0] ?? 'E'}${words[2]?.[0] ?? words[1]?.[1] ?? 'N'}`;
    }

    let candidate = prefix;
    let suffix = 1;
    while (used.has(candidate)) {
      candidate = `${prefix.slice(0, 2)}${suffix}`;
      suffix += 1;
    }

    used.add(candidate);
    result.set(category, candidate);
  }
  return result;
}

function buildNextSequenceMap(skus: Set<string>): Map<string, number> {
  const map = new Map<string, number>();
  for (const sku of skus) {
    const match = sku.match(/^([A-Z0-9]{3})-(\d{4})$/);
    if (!match) {
      continue;
    }
    const current = map.get(match[1]) ?? 1;
    map.set(match[1], Math.max(current, Number(match[2]) + 1));
  }
  return map;
}

function nextSku(prefix: string, nextByPrefix: Map<string, number>, usedSkus: Set<string>): string {
  let next = nextByPrefix.get(prefix) ?? 1;
  let sku = `${prefix}-${String(next).padStart(4, '0')}`;
  while (usedSkus.has(sku)) {
    next += 1;
    sku = `${prefix}-${String(next).padStart(4, '0')}`;
  }
  nextByPrefix.set(prefix, next + 1);
  usedSkus.add(sku);
  return sku;
}

function normalizeKey(value: string): string {
  return ascii(value).replace(/[^A-Z0-9]+/g, ' ').trim();
}

function ascii(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

class GastroiaApi {
  private token = '';
  private branchId = '';

  constructor(private readonly apiUrl: string) {}

  setToken(token: string): void {
    this.token = token;
  }

  setBranch(branchId: string): void {
    this.branchId = branchId;
  }

  login(payload: { tenantIdentifier: string; email: string; password: string }) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  }

  getBranches() {
    return this.request<BranchDto[]>('/branches');
  }

  async getAllCategories(): Promise<ProductCategoryDto[]> {
    return this.getAll<ProductCategoryDto>('/product-categories');
  }

  async getAllProducts(): Promise<ProductDto[]> {
    return this.getAll<ProductDto>('/products');
  }

  createCategory(payload: { name: string; sortOrder: number; isActive: boolean }) {
    return this.request<ProductCategoryDto>('/product-categories', {
      method: 'POST',
      body: payload,
    });
  }

  createProduct(payload: {
    name: string;
    sku: string;
    categoryId: string;
    priceAmount: number;
    currency: string;
    isActive: boolean;
    isSellable: boolean;
    isInventoried: boolean;
    description: string;
  }) {
    return this.request<ProductDto>('/products', {
      method: 'POST',
      body: payload,
    });
  }

  private async getAll<T>(path: string): Promise<T[]> {
    const rows: T[] = [];
    let page = 1;
    while (true) {
      const result = await this.request<PaginatedResult<T>>(`${path}?page=${page}&pageSize=100`);
      rows.push(...result.data);
      if (page >= result.meta.totalPages) {
        return rows;
      }
      page += 1;
    }
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.auth !== false) {
      headers.Authorization = `Bearer ${this.token}`;
      if (this.branchId) {
        headers['X-GastroIA-Branch-Id'] = this.branchId;
      }
    }

    let response: Response | null = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      response = await fetch(`${this.apiUrl}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (response.status !== 429) {
        break;
      }
      const delayMs = attempt * 10_000;
      console.log(`Rate limited on ${method} ${path}; retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
    if (!response) {
      throw new Error(`${method} ${path} failed before receiving a response.`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
