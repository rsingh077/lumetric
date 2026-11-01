module.exports = {
  testEnvironment: 'node',
  testTimeout: 15000,
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'services/auth.service.js',
    'services/audit.service.js',
    'services/billing.service.js',
    'services/data.service.js',
    'lib/**/*.js',
    'middleware/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFiles: ['./jest.setup.js'],
};
