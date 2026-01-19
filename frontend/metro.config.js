const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

const config = getDefaultConfig(projectRoot);

// Allow importing from ../shared
config.watchFolders = [sharedRoot];

// Ensure Metro resolves node_modules from both frontend and repo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Recommended for monorepos to avoid duplicate module instances
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
