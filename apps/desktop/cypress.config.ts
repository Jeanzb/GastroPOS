import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    defaultCommandTimeout: 10_000,
    requestTimeout: 10_000,
    responseTimeout: 20_000,
    video: false,
    screenshotOnRunFailure: true,
    allowCypressEnv: false,
    env: {
      apiUrl: process.env.CYPRESS_API_URL ?? 'http://localhost:3000/api/v1',
      ownerEmail: process.env.CYPRESS_OWNER_EMAIL ?? 'owner@gastroai.local',
      ownerPassword: process.env.CYPRESS_OWNER_PASSWORD ?? 'ChangeMe123!',
      tenantSlug: process.env.CYPRESS_TENANT_SLUG ?? 'gastroai-demo',
      platformEmail: process.env.CYPRESS_PLATFORM_EMAIL ?? 'platform@gastroai.local',
      platformPassword: process.env.CYPRESS_PLATFORM_PASSWORD ?? 'ChangeMePlatform123!',
    },
  },
});
