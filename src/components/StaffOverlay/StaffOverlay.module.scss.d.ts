import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'layer': Style;
  readonly 'box': Style;
  readonly 'hint': Style;
  readonly 'hintText': Style;
};
export default classes;
