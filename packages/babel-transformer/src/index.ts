import { transformPlugin } from './transformPlugin';

import type { ConfigAPI } from '@babel/core';
import type { BabelPluginOptions } from './types';

export { configSchema } from './schema';

export type { BabelPluginOptions };

export default function preset(babel: ConfigAPI, options: BabelPluginOptions) {
  return {
    plugins: [[transformPlugin, options]],
  };
}
