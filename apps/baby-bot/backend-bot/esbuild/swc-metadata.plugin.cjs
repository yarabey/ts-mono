/* eslint-disable @typescript-eslint/no-require-imports */
// esbuild plugin: transform .ts through SWC so NestJS gets `emitDecoratorMetadata`
// (design:paramtypes), which esbuild itself does not emit. Module syntax is
// preserved so esbuild still does resolution + bundling. Uses @swc/core, which
// is already a workspace devDependency.
const fs = require('fs');
const { transformSync } = require('@swc/core');

module.exports = {
  name: 'swc-decorator-metadata',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, (args) => {
      if (args.path.includes('/node_modules/')) return null;
      const source = fs.readFileSync(args.path, 'utf8');
      const { code } = transformSync(source, {
        filename: args.path,
        sourceMaps: 'inline',
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2021',
          keepClassNames: true,
        },
        // Preserve ESM import/export; esbuild handles bundling + .js->.ts resolution.
        module: { type: 'es6' },
      });
      return { contents: code, loader: 'js' };
    });
  },
};
