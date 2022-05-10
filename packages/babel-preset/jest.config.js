export default {
  displayName: 'babel-preset',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      useESM: true,
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
    // 'node_modules/find-up/.+\\.(j|t)sx?$': 'ts-jest',
    // 'node_modules/locate-path/.+\\.(j|t)sx?$': 'ts-jest',
  },
  // transformIgnorePatterns: ['node_modules/(?!find-up/.*)', 'node_modules/(?!locate-path/.*)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: '../../coverage/packages/babel-preset',
};
