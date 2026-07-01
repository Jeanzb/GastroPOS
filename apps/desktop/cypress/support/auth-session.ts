/// <reference types="cypress" />

export interface BranchSummary {
  id: string;
  name: string;
}

export interface TenantLoginResponse {
  user: {
    id: string;
    email?: string;
    fullName?: string;
    role?: string;
    tenantId?: string;
    branchId: string | null;
    permissions?: string[];
    availableRoles?: Array<{ role: string }>;
    sessionId?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
  branch?: BranchSummary;
}

interface LoginEnv {
  apiUrl: string;
  ownerEmail: string;
  ownerPassword: string;
  tenantSlug: string;
  tenantIdentifier: string;
}

const AUTH_STORAGE_KEY = 'gastroai-auth';
const CYPRESS_AUTH_STORAGE_KEY = 'gastroai-cypress-auth';
const TERMINAL_BRANCH_STORAGE_KEY = 'gastroai-terminal-branch';

export function appPath(path: string): string {
  if (path.startsWith('/#')) {
    return path;
  }
  return `/#${path.startsWith('/') ? path : `/${path}`}`;
}

function activeRoleFor(user: TenantLoginResponse['user']): string {
  const roles = user.availableRoles?.map((profile) => profile.role) ?? [];
  if (roles.includes('ADMIN')) {
    return 'ADMIN';
  }
  return roles[0] ?? user.role ?? 'OWNER';
}

function writeTenantAuth(
  win: Window,
  body: TenantLoginResponse,
  branch: BranchSummary | undefined,
): void {
  win.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      state: {
        accessToken: body.tokens.accessToken,
        refreshToken: body.tokens.refreshToken,
        user: body.user,
        activeRole: activeRoleFor(body.user),
      },
      version: 0,
    }),
  );
  win.localStorage.setItem(CYPRESS_AUTH_STORAGE_KEY, JSON.stringify({ ...body, branch }));
  if (branch) {
    // Mirror the sede picker so branch-scoped screens and API helpers use the same branch.
    win.localStorage.setItem(
      TERMINAL_BRANCH_STORAGE_KEY,
      JSON.stringify({ id: branch.id, name: branch.name }),
    );
  }
}

function requestTenantLogin(
  env: LoginEnv,
  shouldPresetBranch: boolean,
): Cypress.Chainable<TenantLoginResponse> {
  return cy
    .request<TenantLoginResponse>({
      method: 'POST',
      url: `${env.apiUrl}/auth/login`,
      body: {
        tenantIdentifier: env.tenantIdentifier,
        email: env.ownerEmail,
        password: env.ownerPassword,
        tenantSlug: env.tenantSlug,
      },
    })
    .then(({ body }) => {
      if (!shouldPresetBranch) {
        return cy.wrap(body);
      }

      return cy
        .request<BranchSummary[]>({
          method: 'GET',
          url: `${env.apiUrl}/branches`,
          headers: { Authorization: `Bearer ${body.tokens.accessToken}` },
        })
        .then(({ body: branches }) => {
          expect(branches, 'available branches for authenticated test user').to.have.length.greaterThan(
            0,
          );
          const userBranch = branches.find((branch) => branch.id === body.user.branchId);
          return cy.wrap({ ...body, branch: userBranch ?? branches[0] });
        });
    });
}

export function restoreTenantSession(
  path = '/',
  options: { presetBranch?: boolean } = { presetBranch: true },
): Cypress.Chainable<TenantLoginResponse> {
  const shouldPresetBranch = options.presetBranch ?? true;

  return cy
    .env<LoginEnv>(['apiUrl', 'ownerEmail', 'ownerPassword', 'tenantSlug', 'tenantIdentifier'])
    .then((env) => {
      const sessionKey = [
        'tenant-session',
        env.apiUrl,
        env.tenantIdentifier,
        env.ownerEmail,
        shouldPresetBranch ? 'branch' : 'no-branch',
      ];

      cy.session(
        sessionKey,
        () =>
          requestTenantLogin(env, shouldPresetBranch).then((session) => {
            cy.visit('/#/login', {
              onBeforeLoad(win) {
                writeTenantAuth(win, session, session.branch);
              },
            });
          }),
        { cacheAcrossSpecs: true },
      );

      return cy.visit(appPath(path)).then(() =>
        cy.window().then((win) => {
          const storedAuth = win.localStorage.getItem(CYPRESS_AUTH_STORAGE_KEY);
          expect(storedAuth, 'cached Cypress tenant auth').to.be.a('string');
          return JSON.parse(storedAuth as string) as TenantLoginResponse;
        }),
      );
    });
}
