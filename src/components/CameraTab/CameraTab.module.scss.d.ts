import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'card': Style;
  readonly 'row': Style;
  readonly 'value': Style;
  readonly 'step': Style;
  readonly 'pressed': Style;
  readonly 'disabled': Style;
};
export default classes;
