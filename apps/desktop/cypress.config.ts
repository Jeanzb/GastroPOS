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
      tenantIdentifier: process.env.CYPRESS_TENANT_IDENTIFIER ?? 'GastroAI Demo',
      platformEmail: process.env.CYPRESS_PLATFORM_EMAIL ?? 'platform@gastroai.local',
      platformPassword: process.env.CYPRESS_PLATFORM_PASSWORD ?? 'ChangeMePlatform123!',
      responsiveViewports: [
        { name: 'mobile-sm', width: 360, height: 740 },
        { name: 'mobile', width: 390, height: 844 },
        { name: 'mobile-lg', width: 430, height: 932 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'tablet-lg', width: 834, height: 1194 },
        { name: 'desktop', width: 1366, height: 768 },
        { name: 'desktop-lg', width: 1440, height: 900 },
        { name: 'wide', width: 1920, height: 1080 },
      ],
    },
  },
});
