import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/frontend/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'app/actions/**/*.ts',
    'components/resume/editableResume.ts',
    'lib/parsedResumeBody.ts',
    'lib/swagger.ts',
    '!**/*.test.ts',
    '!lib/db.ts',
  ],
};

export default createJestConfig(config);
