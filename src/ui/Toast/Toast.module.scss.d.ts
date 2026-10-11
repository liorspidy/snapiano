import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'viewport': Style;
  readonly 'toast': Style;
  readonly 'dot': Style;
  readonly 'dotSuccess': Style;
  readonly 'message': Style;
};
export default classes;
