const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

const config = getDefaultConfig(projectRoot);

// Allow importing from ../shared
config.watchFolders = [sharedRoot];

// Let Metro resolve node_modules from both frontend and repo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Keep Expo defaults intact; do NOT override assetExts/sourceExts
// Align with Expo defaults to avoid module resolution issues
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
