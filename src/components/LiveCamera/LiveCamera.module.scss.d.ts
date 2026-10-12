import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'fill': Style;
};
export default classes;
