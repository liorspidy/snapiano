import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'box': Style;
  readonly 'note': Style;
  readonly 'hit': Style;
};
export default classes;
