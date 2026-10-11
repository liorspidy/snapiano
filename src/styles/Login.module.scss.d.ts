import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'scroll': Style;
  readonly 'language': Style;
  readonly 'card': Style;
  readonly 'brand': Style;
  readonly 'tagline': Style;
  readonly 'google': Style;
  readonly 'divider': Style;
  readonly 'dividerLine': Style;
  readonly 'message': Style;
  readonly 'bottom': Style;
  readonly 'terms': Style;
};
export default classes;
