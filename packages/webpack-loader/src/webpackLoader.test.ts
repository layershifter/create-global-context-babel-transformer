import * as fs from 'fs';
import { createFsFromVolume, Volume } from 'memfs';
import * as path from 'path';
import * as prettier from 'prettier';
import { webpack, Configuration as WebpackConfiguration, StatsError } from 'webpack';
import { merge } from 'webpack-merge';

import type { WebpackLoaderOptions } from './webpackLoader';

type CompileOptions = {
  loaderOptions?: WebpackLoaderOptions;
  webpackConfig?: WebpackConfiguration;
};

const prettierConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../.prettierrc'), { encoding: 'utf-8' }),
);

async function compileSourceWithWebpack(entryPath: string, options: CompileOptions): Promise<string> {
  const defaultConfig: WebpackConfiguration = {
    context: __dirname,
    entry: entryPath,

    mode: 'development',

    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js',
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx|txt)$/,
          include: path.dirname(entryPath),
          use: {
            loader: path.resolve(__dirname, './index.ts'),
            options: options.loaderOptions,
          },
        },
      ],
    },
    externals: {
      react: 'react',
      semver: 'semver',
      'some-third-party': 'some-third-party',
    },
    resolve: {
      alias: {
        'global-context': require.resolve('../../global-context/dist/src/index.js'),
      },
      extensions: ['.js', '.ts'],
    },
  };

  const webpackConfig = merge(defaultConfig, options.webpackConfig || {});
  const compiler = webpack(webpackConfig);

  compiler.outputFileSystem = createFsFromVolume(new Volume());
  compiler.outputFileSystem.join = path.join.bind(path);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      if (typeof stats === 'undefined') {
        reject(new Error('"stats" from Webpack are not available, unknown error...'));
        return;
      }

      const jsonStats = stats.toJson({ source: true });

      if (stats.hasErrors()) {
        reject(stats.toJson().errors![0]);
        return;
      }

      if (!Array.isArray(jsonStats.modules)) {
        reject(new Error(`"stats.toJson().modules" should be an array, this could be a compilation error...`));
        return;
      }

      const entryModule = jsonStats.modules.find(module => module.nameForCondition === entryPath);
      // const globalContextModule = jsonStats.modules.find(module =>
      //   module.nameForCondition?.includes('packages/global-context'),
      // );
      // const moduleNames = jsonStats.modules.map(module => module.nameForCondition);
      if (!entryModule) {
        reject(new Error(`Failed to find a fixture in "stats.toJson().modules", this could be a compilation error...`));
        return;
      }

      resolve(entryModule.source as string);
    });
  });
}

function fixLineEndings(value: string) {
  return String(value).replace(/\r?\n/g, '\n').trim();
}

/**
 * Test utility similar to "babel-plugin-tester".
 *
 * See https://webpack.js.org/contribute/writing-a-loader/#testing.
 */
function testFixture(fixtureName: string, options: CompileOptions = {}) {
  it(`"${fixtureName}" fixture`, async () => {
    const fixturePath = path.resolve(__dirname, '..', '__fixtures__', fixtureName);

    const tsCodePath = path.resolve(fixturePath, 'code.ts');
    const tsxCodePath = path.resolve(fixturePath, 'code.tsx');
    // Specially for cases when "code" contains syntax errors
    const txtCodePath = path.resolve(fixturePath, 'code.txt');

    const tsOutputPath = path.resolve(fixturePath, 'output.ts');
    const tsxOutputPath = path.resolve(fixturePath, 'output.tsx');

    const inputPath = [
      fs.existsSync(tsCodePath) && tsCodePath,
      fs.existsSync(tsxCodePath) && tsxCodePath,
      fs.existsSync(txtCodePath) && txtCodePath,
    ].find(Boolean);
    const outputPath = [
      fs.existsSync(tsOutputPath) && tsOutputPath,
      fs.existsSync(tsxOutputPath) && tsxOutputPath,
    ].find(Boolean);

    const errorPath = path.resolve(fixturePath, 'error.ts');
    const expectedError = fs.existsSync(errorPath) && require(errorPath);

    if (!inputPath) {
      throw new Error(`Failed to find "code.{js,ts,tsx}" in "${fixturePath}"`);
    }

    if (!outputPath && !expectedError) {
      throw new Error(`Failed to find "output.{js,ts,tsx}" or "error.ts" in "${fixturePath}"`);
    }

    if (expectedError) {
      if (!expectedError.default) {
        throw new Error(
          `Please check that "error.ts" contains a default export with an error or regex in "${fixturePath}"`,
        );
      }
    }

    let result = '';
    let resultError: Error | StatsError = new Error();

    try {
      result = fixLineEndings(
        prettier.format(await compileSourceWithWebpack(inputPath, options), {
          ...prettierConfig,
          parser: 'typescript',
        }),
      );
    } catch (err) {
      if (expectedError) {
        resultError = err as StatsError;
      } else {
        throw err;
      }
    }

    if (outputPath) {
      const output = fixLineEndings(await fs.promises.readFile(outputPath, 'utf8'));

      expect(result).toBe(output);
      return;
    }

    if (expectedError) {
      expect(resultError.message).toMatch(expectedError.default);
    }
  });
}

describe('global-context', () => {
  testFixture('call-expression');
  testFixture('call-expression-from-third-party');
  testFixture('member-expression');
});
