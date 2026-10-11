const path = require('path');
const sass = require('sass');
const css2rn = require('css-to-react-native-transform').default;
const upstream = require('@expo/metro-config/build/transform-worker/transform-worker');

// Expo's own worker turns every .scss into an empty module on native. Compile it to React Native
// style objects here, then hand the result over as plain JS.
async function transform(config, projectRoot, filename, data, options) {
  if (filename.endsWith('.scss') && options.platform !== 'web') {
    const css = sass.compile(path.resolve(projectRoot, filename), { silenceDeprecations: ['import'] }).css;
    const styles = css2rn(css, { parseMediaQueries: true });
    return upstream.transform(config, projectRoot, `${filename}.js`, Buffer.from(`module.exports = ${JSON.stringify(styles)};`), options);
  }
  return upstream.transform(config, projectRoot, filename, data, options);
}

module.exports = { ...upstream, transform };
