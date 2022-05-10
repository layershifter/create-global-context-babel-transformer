import type { NodePath, PluginObj, PluginPass, types as t } from '@babel/core';
import babel from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';

import { BabelPluginOptions } from './types';
import { validateOptions } from './validateOptions';
import { findUpSync } from 'find-up';
import { dirname } from 'path';

type BabelPluginState = PluginPass & {
  importDeclarationPaths?: NodePath<t.ImportDeclaration>[];
  requireDeclarationPath?: NodePath<t.VariableDeclarator>;
  expressionPaths?: NodePath<t.CallExpression>[];
};

/**
 * Checks that passed callee imports makesStyles().
 */
function isCreateContextCallee(
  path: NodePath<t.Expression | t.V8IntrinsicIdentifier>,
  modules: NonNullable<BabelPluginOptions['modules']>,
): path is NodePath<t.Identifier> {
  if (path.isIdentifier()) {
    return Boolean(modules.find(module => path.referencesImport(module.moduleSource, module.importName)));
  }

  return false;
}

function createGlobalContextImportDeclaration() {
  return babel.types.importDeclaration(
    [
      babel.types.importSpecifier(
        babel.types.identifier('__createGlobalContext'),
        babel.types.identifier('createContext'),
      ),
    ],
    babel.types.stringLiteral('@fluentui/global-context'),
  );
}

function createGlobalContextCallExpression(expressionPath: NodePath<t.CallExpression>) {
  const args = expressionPath.get('arguments').map(arg => arg.node);
  if (!expressionPath.parentPath.isVariableDeclarator()) {
    return expressionPath.node;
  }
  const id = expressionPath.parentPath.get('id') as NodePath<babel.types.Identifier>;
  return babel.types.callExpression(babel.types.identifier('__createGlobalContext'), [
    ...args,
    babel.types.stringLiteral(id.node.name),
    babel.types.stringLiteral('packageName'),
    babel.types.stringLiteral('1.0.0'),
  ]);
}

/**
 * Checks if import statement import createContext().
 */
function hasReactImport(
  path: NodePath<babel.types.ImportDeclaration>,
  modules: NonNullable<BabelPluginOptions['modules']>,
): boolean {
  return Boolean(modules.find(module => path.node.source.value === module.moduleSource));
}

export const transformPlugin = declare<Partial<BabelPluginOptions>, PluginObj<BabelPluginState>>((api, options) => {
  api.assertVersion(7);

  const pluginOptions: Required<BabelPluginOptions> = {
    babelOptions: {},
    modules: [{ moduleSource: 'react', importName: 'createContext' }],
    evaluationRules: [
      {
        test: /[/\\]node_modules[/\\]/,
        action: 'ignore',
      },
    ],

    ...options,
  };

  validateOptions(pluginOptions);

  return {
    name: '@griffel/babel-plugin-transform',

    pre() {
      this.importDeclarationPaths = [];
      this.expressionPaths = [];
    },

    visitor: {
      Program: {
        enter() {},

        exit(path, state) {
          console.log(state.filename, dirname(state.filename!));
          const cwd = dirname(state.filename!);
          const result = findUpSync('package.json', { cwd });

          console.log(result);

          if (state.importDeclarationPaths!.length === 0 && !state.requireDeclarationPath) {
            return;
          }
          // Adds import for global context
          path.unshiftContainer('body', createGlobalContextImportDeclaration());
          // substitutes expressions of react createContext to global context
          if (state.expressionPaths) {
            for (const expressionPath of state.expressionPaths) {
              expressionPath.replaceWith(createGlobalContextCallExpression(expressionPath));
            }
          }
        },
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      ImportDeclaration(path, state) {
        if (hasReactImport(path, pluginOptions.modules)) {
          state.importDeclarationPaths!.push(path);
        }
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      CallExpression(path, state) {
        /**
         * Handles case when `createContext()` is `CallExpression`.
         *
         * @example createContext({})
         */
        if (state.importDeclarationPaths!.length === 0) {
          return;
        }

        const calleePath = path.get('callee');

        if (!isCreateContextCallee(calleePath, pluginOptions.modules)) {
          return;
        }

        state.expressionPaths!.push(path);
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      MemberExpression(expressionPath, state) {
        /**
         * Handles case when `createContext()` is inside `MemberExpression`.
         *
         * @example module.createContext({})
         */

        const objectPath = expressionPath.get('object');
        const propertyPath = expressionPath.get('property');

        const isCreateContextCall =
          objectPath.isIdentifier({ name: 'React' }) && propertyPath.isIdentifier({ name: 'createContext' });

        if (!isCreateContextCall) {
          return;
        }

        const parentPath = expressionPath.parentPath;

        if (!parentPath.isCallExpression()) {
          return;
        }
        state.expressionPaths?.push(parentPath);
      },
    },
  };
});