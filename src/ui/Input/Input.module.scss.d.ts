import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'box': Style;
  readonly 'focused': Style;
  readonly 'invalid': Style;
  readonly 'label': Style;
  readonly 'input': Style;
};
export default classes;
