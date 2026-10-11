import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'header': Style;
  readonly 'grow': Style;
  readonly 'content': Style;
};
export default classes;
