const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.transformerPath = require.resolve('./metro.transformer.js');

module.exports = config;
