const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  // Exclude Playwright tests and browser tests from Jest
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/e2e/',
    '<rootDir>/src/__tests__/browser-puppeteer.test.ts'
  ],
  // Transform ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|@radix-ui)/)'
  ],
  // Disable CSS linting warnings in test files
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [2304, 2307, 6133, 6192, 6196]
      }
    }
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
