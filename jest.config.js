module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|@sentry|native-base|react-native-svg|lucide-react-native|@supabase)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(spec|test).[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/test-utils/',
    '/worktrees/',
    '/.worktrees/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/worktrees/', '<rootDir>/.worktrees/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    // Mock image files first (before general @/ alias)
    '^@/assets/images/.*\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock all image files
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // General @/ alias (must come after specific patterns)
    '^@/(.*)$': '<rootDir>/$1',
    // Mock expo virtual modules to prevent ESM parsing errors
    '^expo/virtual/(.*)$': '<rootDir>/__mocks__/expoVirtualMock.js',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    // Exclude landing page components (web-only marketing pages)
    '!components/landing/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 65,
      functions: 75,
      lines: 75,
    },
  },
};
