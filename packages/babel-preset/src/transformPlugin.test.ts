import pluginTester, { prettierFormatter } from 'babel-plugin-tester';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { transformPlugin } from './transformPlugin';

const prettierConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../.prettierrc'), { encoding: 'utf-8' }),
);
const fixturesDir = path.join(__dirname, '..', '__fixtures__');

pluginTester({
  babelOptions: {
    parserOpts: {
      plugins: ['typescript'],
    },
  },
  pluginOptions: {
    babelOptions: {
      presets: ['@babel/typescript'],
    },
  },
  formatResult: code =>
    prettierFormatter(code, {
      config: {
        ...prettierConfig,
        parser: 'typescript',
      },
    }),

  fixtures: fixturesDir,
  tests: [],

  plugin: transformPlugin,
  pluginName: '@griffel/babel-plugin-transform',
});
