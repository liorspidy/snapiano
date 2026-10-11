import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'row': Style;
  readonly 'white': Style;
  readonly 'black': Style;
  readonly 'labelRight': Style;
  readonly 'labelLeft': Style;
};
export default classes;
