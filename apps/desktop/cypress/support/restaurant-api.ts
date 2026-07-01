/// <reference types="cypress" />

import { restoreTenantSession } from './auth-session';

export interface LoginResponse {
  user: {
    id: string;
    branchId: string | null;
  };
  tokens: {
    accessToken: string;
  };
  branch?: BranchSummary;
}

export interface CashMovement {
  type: 'OPENING_BALANCE' | 'CASH_IN' | 'CASH_OUT' | 'SALE_PAYMENT' | 'REFUND' | 'TIP' | 'ADJUSTMENT';
  amount: number;
}

export interface DiningZone {
  id: string;
}

export interface BranchSummary {
  id: string;
  name: string;
}

export interface DiningTable {
  id: string;
  number: string;
}

export interface TableAccount {
  id: string;
  items: Array<{ id: string }>;
}

interface ProductsResponse {
  data: Array<{ id: string }>;
}

export interface CashSessionResponse {
  id: string;
  status: 'OPEN' | 'CLOSED';
}

const CASH_MOVEMENT_SIGN: Record<CashMovement['type'], 1 | -1> = {
  OPENING_BALANCE: 1,
  CASH_IN: 1,
  SALE_PAYMENT: 1,
  TIP: 1,
  ADJUSTMENT: 1,
  CASH_OUT: -1,
  REFUND: -1,
};

export function apiLogin(): Cypress.Chainable<LoginResponse> {
  return restoreTenantSession('/login', { presetBranch: true }).then((session) =>
    cy.wrap({
      user: {
        id: session.user.id,
        branchId: session.user.branchId,
      },
      tokens: {
        accessToken: session.tokens.accessToken,
      },
      branch: session.branch,
    }),
  );
}

export function authHeaders(auth: LoginResponse): {
  Authorization: string;
  'X-GastroIA-Branch-Id'?: string;
} {
  return {
    Authorization: `Bearer ${auth.tokens.accessToken}`,
    ...(auth.branch?.id ? { 'X-GastroIA-Branch-Id': auth.branch.id } : {}),
  };
}

export function closeActiveCashSession(auth: LoginResponse): Cypress.Chainable<void> {
  return cy
    .env<{ apiUrl: string }>(['apiUrl'])
    .then(({ apiUrl }) =>
      cy.request({
        method: 'GET',
        url: `${apiUrl}/cash-sessions/active`,
        headers: authHeaders(auth),
        failOnStatusCode: false,
      }),
    )
    .then((activeResponse) => {
      if (activeResponse.status === 404) {
        return cy.wrap(undefined);
      }

      const sessionId = activeResponse.body.id as string;

      return cy
        .env<{ apiUrl: string }>(['apiUrl'])
        .then(({ apiUrl }) =>
          cy.request<CashMovement[]>({
            method: 'GET',
            url: `${apiUrl}/cash-sessions/${sessionId}/movements`,
            headers: authHeaders(auth),
          }),
        )
        .then(({ body }) => {
          const countedAmount = body.reduce(
            (total, movement) => total + CASH_MOVEMENT_SIGN[movement.type] * movement.amount,
            0,
          );

          return cy
            .env<{ apiUrl: string }>(['apiUrl'])
            .then(({ apiUrl }) =>
              cy.request({
                method: 'POST',
                url: `${apiUrl}/cash-sessions/${sessionId}/close`,
                headers: authHeaders(auth),
                body: { countedAmount, notes: 'Cierre automatico Cypress' },
              }),
            )
            .then(() => undefined);
        });
    });
}

export function openCashSession(
  auth: LoginResponse,
  openingBalance = 100000,
): Cypress.Chainable<CashSessionResponse> {
  return cy
    .env<{ apiUrl: string }>(['apiUrl'])
    .then(({ apiUrl }) =>
      cy.request<CashSessionResponse>({
        method: 'POST',
        url: `${apiUrl}/cash-sessions`,
        headers: authHeaders(auth),
        body: { openingBalance },
      }),
    )
    .then(({ body }) => cy.wrap(body));
}

export function createTestTable(
  auth: LoginResponse,
  tableNumber: string,
): Cypress.Chainable<DiningTable> {
  return cy
    .env<{ apiUrl: string }>(['apiUrl'])
    .then(({ apiUrl }) =>
      cy.request<DiningZone[]>({
        method: 'GET',
        url: `${apiUrl}/dining-zones`,
        headers: authHeaders(auth),
      }),
    )
    .then(({ body: zones }) => {
      if (zones[0]) {
        return cy.wrap(zones[0]);
      }

      return cy
        .env<{ apiUrl: string }>(['apiUrl'])
        .then(({ apiUrl }) =>
          cy.request<DiningZone>({
            method: 'POST',
            url: `${apiUrl}/dining-zones`,
            headers: authHeaders(auth),
            body: { name: `Zona Cypress ${Date.now()}`, sortOrder: 99 },
          }),
        )
        .then(({ body }) => cy.wrap(body));
    })
    .then((zone) =>
      cy
        .env<{ apiUrl: string }>(['apiUrl'])
        .then(({ apiUrl }) =>
          cy.request<DiningTable>({
            method: 'POST',
            url: `${apiUrl}/dining-zones/${zone.id}/tables`,
            headers: authHeaders(auth),
            body: { number: tableNumber, seats: 2 },
          }),
        )
        .then(({ body }) => cy.wrap({ id: body.id, number: body.number })),
    );
}

export function createTableAccountWithFirstProduct(
  auth: LoginResponse,
  tableId: string,
): Cypress.Chainable<TableAccount> {
  return cy
    .env<{ apiUrl: string }>(['apiUrl'])
    .then(({ apiUrl }) =>
      cy.request<TableAccount>({
        method: 'POST',
        url: `${apiUrl}/dining-tables/${tableId}/account`,
        headers: authHeaders(auth),
        body: {
          waiterName: 'Mesero Cypress',
          guestCount: 2,
          customerName: 'Mesa Cypress QA',
        },
      }),
    )
    .then(({ body: account }) =>
      cy
        .env<{ apiUrl: string }>(['apiUrl'])
        .then(({ apiUrl }) =>
          cy.request<ProductsResponse>({
            method: 'GET',
            url: `${apiUrl}/products?isActive=true&page=1&pageSize=1`,
            headers: authHeaders(auth),
          }),
        )
        .then(({ body }) => {
          expect(body.data, 'sellable products').to.have.length.greaterThan(0);

          return cy
            .env<{ apiUrl: string }>(['apiUrl'])
            .then(({ apiUrl }) =>
              cy.request<TableAccount>({
                method: 'POST',
                url: `${apiUrl}/table-accounts/${account.id}/items`,
                headers: authHeaders(auth),
                body: { productId: body.data[0].id, quantity: 1 },
              }),
            )
            .then(({ body: accountWithItem }) => cy.wrap(accountWithItem));
        }),
    );
}

export function uniqueTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Cypress._.random(1000, 9999)}`;
}
