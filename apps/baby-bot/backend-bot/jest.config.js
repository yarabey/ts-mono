/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: ['.*\\.spec\\.ts$', '.*\\.test\\.ts$'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'apps/baby-bot/backend-bot/tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@acme/baby-bot-domain$':
      '<rootDir>/../../../libs/baby-bot/domain/src/index.ts',
    // Resolve ESM-style explicit .js relative imports (used by the domain lib
    // under nodenext) back to their .ts sources for ts-jest.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
