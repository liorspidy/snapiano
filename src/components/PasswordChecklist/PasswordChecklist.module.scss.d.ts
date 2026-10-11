import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'root': Style;
  readonly 'bar': Style;
  readonly 'fill': Style;
  readonly 'weak': Style;
  readonly 'medium': Style;
  readonly 'strong': Style;
  readonly 'rule': Style;
  readonly 'ok': Style;
  readonly 'missing': Style;
};
export default classes;
