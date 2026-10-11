import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'row': Style;
  readonly 'text': Style;
  readonly 'pressed': Style;
};
export default classes;
