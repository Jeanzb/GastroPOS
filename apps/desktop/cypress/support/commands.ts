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

const AUTH_STORAGE_KEY = 'gastroai-auth';

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

Cypress.Commands.add('loginByApi', (path = '/') => {
  return cy
    .env<{
      apiUrl: string;
      ownerEmail: string;
      ownerPassword: string;
      tenantSlug: string;
    }>(['apiUrl', 'ownerEmail', 'ownerPassword', 'tenantSlug'])
    .then(({ apiUrl, ownerEmail, ownerPassword, tenantSlug }) =>
      cy.request<LoginResponse>({
        method: 'POST',
        url: `${apiUrl}/auth/login`,
        body: {
          email: ownerEmail,
          password: ownerPassword,
          tenantSlug,
        },
      }),
    )
    .then(({ body }) => {
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
        },
      });
    });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginByApi(path?: string): Chainable<void>;
    }
  }
}

export {};
