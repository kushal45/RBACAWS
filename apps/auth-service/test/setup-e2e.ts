/**
 * E2E Test Setup
 *
 * Global setup and configuration for end-to-end tests.
 * This file runs before all e2e tests to configure the testing environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Test database configuration
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5433';
process.env.TEST_DB_USERNAME = process.env.TEST_DB_USERNAME || 'postgres';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'postgres';

// Increase test timeout for database operations
jest.setTimeout(30000);

// Global test configuration
beforeAll(() => {
  // Global setup that runs before all test suites
  // Test environment configured via environment variables
});

afterAll(() => {
  // Global cleanup that runs after all test suites
  // Cleanup handled by individual test suites
});

// Silence console logs during tests unless debug mode is enabled
if (!process.env.DEBUG_TESTS) {
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: originalConsole.warn,
    error: originalConsole.error,
  };
}

// Add custom matchers if needed
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },
});
