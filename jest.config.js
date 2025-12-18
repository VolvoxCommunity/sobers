module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|@sentry|native-base|react-native-svg|@supabase|lucide-react-native)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(spec|test).[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/test-utils/',
    // Only ignore worktrees subdirectories under rootDir, not the worktree itself
    '<rootDir>/worktrees/',
    '<rootDir>/.worktrees/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/worktrees/', '<rootDir>/.worktrees/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock expo virtual modules to prevent ESM parsing errors
    '^expo/virtual/(.*)$': '<rootDir>/__mocks__/expoVirtualMock.js',
    // Mock expo-router/head to prevent ESM parsing errors
    '^expo-router/head$': '<rootDir>/__mocks__/expoRouterHead.js',
    // Mock lucide-react-native icons
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85,
    },
  },
};
