import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'content': Style;
  readonly 'row': Style;
  readonly 'section': Style;
  readonly 'report': Style;
  readonly 'footer': Style;
};
export default classes;
