/// <reference types="cypress" />

describe('Fiscal workspace', () => {
  it('keeps fiscal operations branch-scoped while tenant admins configure Factus safely', () => {
    cy.intercept('GET', '**/api/v1/fiscal/documents*').as('fiscalDocuments');
    cy.intercept('GET', '**/api/v1/fiscal/documents/*').as('fiscalDocumentDetail');

    cy.loginByApi('/fiscal');

    cy.get('[data-cy="fiscal-workspace"]').should('be.visible');
    cy.wait('@fiscalDocuments')
      .its('request.headers')
      .should((headers) => {
        expect(headers['x-gastroia-branch-id']).to.be.a('string').and.not.be.empty;
      });
    cy.contains('Configuracion DIAN').should('be.visible');
    cy.contains('Conexion Factus').should('be.visible');
    cy.get('[data-cy="factus-connection-configure"]').click();
    cy.get('[role="dialog"]')
      .should('contain.text', 'Conexion Factus')
      .and('contain.text', 'credenciales se cifran')
      .and('not.contain.text', 'access_token')
      .and('not.contain.text', 'refresh_token');
    cy.contains('[role="dialog"] button', 'Cancelar').click();

    cy.get('[aria-label="Ver detalle"]').first().click();
    cy.get('[data-cy="fiscal-document-detail"]')
      .should('be.visible')
      .and('not.contain.text', 'client secret');
    cy.wait('@fiscalDocumentDetail')
      .its('request.headers')
      .should((headers) => {
        expect(headers['x-gastroia-branch-id']).to.be.a('string').and.not.be.empty;
      });
    cy.assertNoGlobalOverflow();
  });
});
