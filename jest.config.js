module.exports = {
  testRegex: '\.test\.ts$',
  preset: 'ts-jest',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', './dist/'],
  // coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts']
};
