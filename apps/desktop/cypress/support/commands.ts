import { restoreTenantSession } from './auth-session';

interface LoginByApiOptions {
  presetBranch?: boolean;
}

interface ResponsiveViewport {
  name: string;
  width: number;
  height: number;
}

Cypress.Commands.add('loginByApi', (path = '/', options: LoginByApiOptions = { presetBranch: true }) => {
  return restoreTenantSession(path, options).then(() => undefined);
});

Cypress.Commands.add('setResponsiveViewport', (viewport: ResponsiveViewport) => {
  cy.viewport(viewport.width, viewport.height);
});

Cypress.Commands.add('assertNoGlobalOverflow', () => {
  cy.window().then((win) => {
    const root = win.document.documentElement;
    const body = win.document.body;
    const rootOverflow = root.scrollWidth - root.clientWidth;
    const bodyOverflow = body.scrollWidth - body.clientWidth;

    expect(rootOverflow, 'document horizontal overflow').to.be.lessThan(2);
    expect(bodyOverflow, 'body horizontal overflow').to.be.lessThan(2);
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginByApi(path?: string, options?: LoginByApiOptions): Chainable<void>;
      setResponsiveViewport(viewport: ResponsiveViewport): Chainable<void>;
      assertNoGlobalOverflow(): Chainable<void>;
    }
  }
}

export {};
