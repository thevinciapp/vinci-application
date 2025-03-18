const tsConfigPaths = require('tsconfig-paths');
const path = require('path');
const tsConfig = require('./electron/tsconfig.json');

tsConfigPaths.register({
  baseUrl: path.resolve('./'),
  paths: tsConfig.compilerOptions.paths
});