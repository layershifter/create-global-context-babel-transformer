import type { NodePath, PluginObj, PluginPass } from '@babel/core';
import { types as t} from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';
import hash from '@emotion/hash';
import { BabelPluginOptions } from './types';
import { validateOptions } from './validateOptions';
import * as findUp from 'find-up';
import { dirname, relative } from 'path';
import { readFileSync } from 'fs';

type BabelPluginState = PluginPass & {
  importDeclarationPaths?: NodePath<t.ImportDeclaration>[];
  requireDeclarationPath?: NodePath<t.VariableDeclarator>;
  expressionPaths?: NodePath<t.CallExpression>[];
};

interface PackageJSON {
  name: string;
  version: string;
}

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
  return t.importDeclaration(
    [t.importSpecifier(t.identifier('__createGlobalContext'), t.identifier('createContext'))],
    t.stringLiteral('@global-context/react'),
  );
}

function createGlobalContextCallExpression(
  expressionPath: NodePath<t.CallExpression>,
  packageJson: PackageJSON,
  packageJsonPath: string,
  filePath: string,
) {
  // Is there sense in args? `createContext` has a single argument AFAIR
  const args = expressionPath.get('arguments').map(arg => arg.node);
  if (!expressionPath.parentPath.isVariableDeclarator()) {
    return expressionPath.node;
  }

  // Use the relative path from package.json because the same package
  // can be installed under different paths in node_modules if they are duplicated
  const relativePath = relative(packageJsonPath, filePath);
  const id = expressionPath.parentPath.get('id') as NodePath<t.Identifier>;
  return t.callExpression(t.identifier('__createGlobalContext'), [
    ...args,
    t.stringLiteral(hash(`${relativePath}@${id.node.name}`)),
    t.stringLiteral(packageJson.name),
    t.stringLiteral(packageJson.version),
  ]);
}

/**
 * Checks if import statement import createContext().
 */
function hasReactImport(
  path: NodePath<t.ImportDeclaration>,
  modules: NonNullable<BabelPluginOptions['modules']>,
): boolean {
  return Boolean(modules.find(module => path.node.source.value === module.moduleSource));
}

export const transformPlugin = declare<Partial<BabelPluginOptions>, PluginObj<BabelPluginState>>((api, options) => {
  api.assertVersion(7);

  const pluginOptions: Required<BabelPluginOptions> = {
    babelOptions: {},
    modules: [{ moduleSource: 'react', importName: 'createContext' }],
    ...options,
  };

  validateOptions(pluginOptions);

  return {
    name: 'global-context',

    pre() {
      this.importDeclarationPaths = [];
      this.expressionPaths = [];
    },

    visitor: {
      Program: {
        // Cruft
        enter() {},

        exit(path, state) {
          // There is no sense to do this on exit, it's usually better to apply changes in place
          if (state.filename === undefined) {
            return;
          }
          const packageJSONPath = findUp.sync('package.json', { cwd: dirname(state.filename) });
          if (packageJSONPath === undefined) {
            return;
          }
          // Do it really handles require()? I don't see tests for it
          if (state.importDeclarationPaths!.length === 0 && !state.requireDeclarationPath) {
            return;
          }
          // It's a brave assumption that each `package.json` will have `name` and `version`
          // I suggest to at least validate this
          const packageJSON: PackageJSON = JSON.parse(readFileSync(packageJSONPath).toString());

          // Adds import for global context
          path.unshiftContainer('body', createGlobalContextImportDeclaration());
          // substitutes expressions of react createContext to global context
          if (state.expressionPaths) {
            for (const expressionPath of state.expressionPaths) {
              expressionPath.replaceWith(
                createGlobalContextCallExpression(expressionPath, packageJSON, packageJSONPath, state.filename),
              );
            }
          }
        },
      },

      // Folks in XXX are doing:
      // import * as React from 'react'
      // const { createContext } = React
      //
      // I don't think that it handled
      
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
