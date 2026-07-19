const Module = require('module');
const path = require('path');

// Restrict node_modules resolution to workspace node_modules only to prevent sandbox violations
Module._nodeModulePaths = function(from) {
  return ['/Users/aremkevin/project failure /medmemory/node_modules'];
};

// Hook require to intercept and print loaded modules for debug
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  return originalRequire.apply(this, arguments);
};

// Run target script passed as argument
const targetScript = process.argv[2];
if (targetScript) {
  const absolutePath = path.resolve(targetScript);
  console.log(`Running script under sandbox protection: ${absolutePath}`);
  require(absolutePath);
}
