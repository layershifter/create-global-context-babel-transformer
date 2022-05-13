import { validateOptions } from './validateOptions';
import { BabelPluginOptions } from './types';

describe('validateOptions', () => {
  describe('modules', () => {
    it('passes on valid options', () => {
      const pluginOptions: BabelPluginOptions = {
        modules: [{ moduleSource: 'react-make-styles', importName: 'makeStyles' }],
      };

      expect(() => validateOptions(pluginOptions)).not.toThrow();
    });

    it('throws on wrong options', () => {
      const pluginOptions = { modules: {} };

      // @ts-expect-error Invalid options are passed for testing purposes
      expect(() => validateOptions(pluginOptions)).toThrowErrorMatchingInlineSnapshot(
        `"Validation failed for passed config: data/modules must be array"`,
      );
    });
  });

  describe('babelOptions', () => {
    it('passes on valid options', () => {
      const pluginOptions: BabelPluginOptions = {
        babelOptions: {
          presets: ['@babel/preset'],
          plugins: ['@babel/transformPlugin'],
        },
      };

      expect(() => validateOptions(pluginOptions)).not.toThrow();
    });

    it('throws on wrong options', () => {
      const pluginOptions = { babelOptions: [] };

      // @ts-expect-error Invalid options are passed for testing purposes
      expect(() => validateOptions(pluginOptions)).toThrowErrorMatchingInlineSnapshot(
        `"Validation failed for passed config: data/babelOptions must be object"`,
      );
    });
  });

  describe('evaluationRules', () => {
    it('passes on valid options', () => {
      const noopEvaluator = () => ['foo', null];
      const pluginOptions: BabelPluginOptions = {};

      expect(() => validateOptions(pluginOptions)).not.toThrow();
    });

    it('throws on wrong options', () => {
      const pluginOptionsA = { evaluationRules: {} };

      // @ts-expect-error Invalid options are passed for testing purposes
      expect(() => validateOptions(pluginOptionsA)).toThrowErrorMatchingInlineSnapshot(
        `"Validation failed for passed config: data/evaluationRules must be array"`,
      );
    });
  });
});
