import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'card': Style;
  readonly 'interactive': Style;
  readonly 'pressed': Style;
};
export default classes;
