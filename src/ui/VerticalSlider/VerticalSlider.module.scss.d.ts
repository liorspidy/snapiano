import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'column': Style;
  readonly 'touch': Style;
  readonly 'rail': Style;
  readonly 'fill': Style;
  readonly 'thumb': Style;
  readonly 'value': Style;
};
export default classes;
