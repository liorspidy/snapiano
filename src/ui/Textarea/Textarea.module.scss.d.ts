import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'field': Style;
  readonly 'input': Style;
  readonly 'focused': Style;
  readonly 'invalid': Style;
};
export default classes;
