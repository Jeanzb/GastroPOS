/// <reference types="cypress" />

// Zero-trust isolation smoke: two tenants created by the platform must never see each
// other's branches, and a tenant token may not operate a branch it does not own.

interface PlatformLoginResponse {
  tokens: { accessToken: string };
}

interface PlatformTenantResponse {
  id: string;
  name: string;
}

interface TenantLoginResponse {
  tokens: { accessToken: string };
}

interface BranchDto {
  id: string;
  tenantId: string;
  name: string;
}

const OWNER_PASSWORD = 'Temporal123!';

interface SeededTenant {
  name: string;
  ownerEmail: string;
}

function createTenant(
  apiUrl: string,
  platformToken: string,
  label: string,
): Cypress.Chainable<SeededTenant> {
  const stamp = `${Date.now()}-${Cypress._.random(1000, 9999)}`;
  const ownerEmail = `owner-${label}-${stamp}@gastroia.test`;
  const name = `Cypress Isolation ${label} ${stamp}`;
  return cy
    .request<PlatformTenantResponse>({
      method: 'POST',
      url: `${apiUrl}/platform/tenants`,
      headers: { Authorization: `Bearer ${platformToken}` },
      body: {
        name,
        ownerEmail,
        ownerFullName: `Owner ${label}`,
        ownerTemporaryPassword: OWNER_PASSWORD,
        branchName: `Sede ${label}`,
        branchCode: `MAIN${label}`,
        branchCity: 'Medellin',
      },
    })
    .then(({ body }) => ({ name: body.name, ownerEmail }));
}

function ownerLogin(apiUrl: string, tenant: SeededTenant): Cypress.Chainable<string> {
  return cy
    .request<TenantLoginResponse>({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: {
        tenantIdentifier: tenant.name,
        email: tenant.ownerEmail,
        password: OWNER_PASSWORD,
      },
    })
    .then(({ body }) => body.tokens.accessToken);
}

describe('branch isolation (two tenants)', () => {
  it('hides cross-tenant branches and rejects cross-tenant branch headers', () => {
    cy.env<{ apiUrl: string; platformEmail: string; platformPassword: string }>([
      'apiUrl',
      'platformEmail',
      'platformPassword',
    ]).then(({ apiUrl, platformEmail, platformPassword }) => {
      cy.request<PlatformLoginResponse>({
        method: 'POST',
        url: `${apiUrl}/platform/auth/login`,
        body: { email: platformEmail, password: platformPassword },
      }).then(({ body }) => {
        const platformToken = body.tokens.accessToken;

        createTenant(apiUrl, platformToken, 'A').then((tenantA) => {
          createTenant(apiUrl, platformToken, 'B').then((tenantB) => {
            ownerLogin(apiUrl, tenantA).then((tokenA) => {
              ownerLogin(apiUrl, tenantB).then((tokenB) => {
                // Each owner sees only their own branch.
                cy.request<BranchDto[]>({
                  method: 'GET',
                  url: `${apiUrl}/branches`,
                  headers: { Authorization: `Bearer ${tokenA}` },
                }).then(({ body: branchesA }) => {
                  cy.request<BranchDto[]>({
                    method: 'GET',
                    url: `${apiUrl}/branches`,
                    headers: { Authorization: `Bearer ${tokenB}` },
                  }).then(({ body: branchesB }) => {
                    expect(branchesA, 'tenant A has a branch').to.have.length.greaterThan(0);
                    expect(branchesB, 'tenant B has a branch').to.have.length.greaterThan(0);

                    const branchA = branchesA[0];
                    const branchB = branchesB[0];
                    const idsA = branchesA.map((b) => b.id);
                    const idsB = branchesB.map((b) => b.id);

                    // No branch crosses the tenant boundary.
                    expect(idsA, 'A cannot see B branch').to.not.include(branchB.id);
                    expect(idsB, 'B cannot see A branch').to.not.include(branchA.id);
                    branchesA.forEach((b) =>
                      expect(b.tenantId, 'A branches belong to A').to.eq(branchA.tenantId),
                    );

                    // Tenant A cannot operate using tenant B's branch id.
                    cy.request({
                      method: 'GET',
                      url: `${apiUrl}/inventory-items`,
                      headers: {
                        Authorization: `Bearer ${tokenA}`,
                        'X-GastroIA-Branch-Id': branchB.id,
                      },
                      failOnStatusCode: false,
                    })
                      .its('status')
                      .should('eq', 403);

                    // Tenant A operating its own branch is accepted.
                    cy.request({
                      method: 'GET',
                      url: `${apiUrl}/inventory-items`,
                      headers: {
                        Authorization: `Bearer ${tokenA}`,
                        'X-GastroIA-Branch-Id': branchA.id,
                      },
                      failOnStatusCode: false,
                    })
                      .its('status')
                      .should('eq', 200);

                    // Fiscal records use the same active-branch boundary.
                    cy.request({
                      method: 'GET',
                      url: `${apiUrl}/fiscal/documents`,
                      headers: {
                        Authorization: `Bearer ${tokenA}`,
                        'X-GastroIA-Branch-Id': branchB.id,
                      },
                      failOnStatusCode: false,
                    })
                      .its('status')
                      .should('eq', 403);

                    cy.request({
                      method: 'GET',
                      url: `${apiUrl}/fiscal/documents`,
                      headers: {
                        Authorization: `Bearer ${tokenA}`,
                        'X-GastroIA-Branch-Id': branchA.id,
                      },
                      failOnStatusCode: false,
                    })
                      .its('status')
                      .should('eq', 200);
                  });
                });

                // Owner A credentials are invalid under tenant B's identity.
                cy.request({
                  method: 'POST',
                  url: `${apiUrl}/auth/login`,
                  body: {
                    tenantIdentifier: tenantB.name,
                    email: tenantA.ownerEmail,
                    password: OWNER_PASSWORD,
                  },
                  failOnStatusCode: false,
                })
                  .its('status')
                  .should('eq', 401);
              });
            });
          });
        });
      });
    });
  });
});
