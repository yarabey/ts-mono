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
        tsconfig: 'apps/sample/backend/tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@acme/sample-domain$': '<rootDir>/../../../libs/sample/domain/src/index.ts',
  },
};
