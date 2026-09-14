module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@sentinel/crypto-core$': '<rootDir>/packages/crypto-core/src',
    '^@sentinel/shared-types$': '<rootDir>/packages/shared-types/src',
    '^@sentinel/validation$': '<rootDir>/packages/validation/src',
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
