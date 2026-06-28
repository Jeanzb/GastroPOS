interface LoginResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    tenantId: string;
    branchId: string | null;
    permissions: string[];
    availableRoles: Array<{ role: string }>;
    sessionId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface BranchSummary {
  id: string;
  name: string;
}

interface LoginByApiOptions {
  presetBranch?: boolean;
}

const AUTH_STORAGE_KEY = 'gastroai-auth';
const TERMINAL_BRANCH_STORAGE_KEY = 'gastroai-terminal-branch';

function appPath(path: string): string {
  if (path.startsWith('/#')) {
    return path;
  }
  return `/#${path.startsWith('/') ? path : `/${path}`}`;
}

function activeRoleFor(user: LoginResponse['user']): string {
  const roles = user.availableRoles.map((profile) => profile.role);
  if (roles.includes('ADMIN')) {
    return 'ADMIN';
  }
  return roles[0] ?? user.role;
}

function visitAuthenticated(
  path: string,
  body: LoginResponse,
  branch: BranchSummary | undefined,
): void {
  cy.visit(appPath(path), {
    onBeforeLoad(win) {
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
      if (branch) {
        // Mimic the sede picker so branch-scoped screens are operable.
        win.localStorage.setItem(
          TERMINAL_BRANCH_STORAGE_KEY,
          JSON.stringify({ id: branch.id, name: branch.name }),
        );
      }
    },
  });
}

Cypress.Commands.add('loginByApi', (path = '/', options: LoginByApiOptions = { presetBranch: true }) => {
  const shouldPresetBranch = options.presetBranch ?? true;
  return cy
    .env<{
      apiUrl: string;
      ownerEmail: string;
      ownerPassword: string;
      tenantSlug: string;
      tenantIdentifier: string;
    }>(['apiUrl', 'ownerEmail', 'ownerPassword', 'tenantSlug', 'tenantIdentifier'])
    .then(({ apiUrl, ownerEmail, ownerPassword, tenantSlug, tenantIdentifier }) =>
      cy
        .request<LoginResponse>({
          method: 'POST',
          url: `${apiUrl}/auth/login`,
          body: {
            tenantIdentifier,
            email: ownerEmail,
            password: ownerPassword,
            tenantSlug,
          },
        })
        .then(({ body }) => {
          if (!shouldPresetBranch) {
            visitAuthenticated(path, body, undefined);
            return;
          }
          return cy.request<BranchSummary[]>({
            method: 'GET',
            url: `${apiUrl}/branches`,
            headers: { Authorization: `Bearer ${body.tokens.accessToken}` },
          }).then(({ body: branches }) => {
            expect(branches, 'available branches for authenticated test user').to.have.length.greaterThan(
              0,
            );
            const userBranch = branches.find((branch) => branch.id === body.user.branchId);
            visitAuthenticated(path, body, userBranch ?? branches[0]);
          });
        }),
    );
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginByApi(path?: string, options?: LoginByApiOptions): Chainable<void>;
    }
  }
}

export {};
