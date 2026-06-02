/* eslint-disable @typescript-eslint/no-require-imports */
// Merged into the @nx/esbuild build options. Adds the SWC transform plugin so
// NestJS gets emitDecoratorMetadata (which esbuild alone does not emit).
const swcMetadata = require('./swc-metadata.plugin.cjs');

module.exports = {
  plugins: [swcMetadata],
};
