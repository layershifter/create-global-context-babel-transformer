module.exports = {
  displayName: 'webpack-loader',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!(find-up|locate-path|p-locate|p-limit|yocto-queue|path-exists)/)'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '@global-context/babel-preset': '<rootDir>/../babel-preset/src/index.ts',
  },
};
