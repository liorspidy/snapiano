import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'wrap': Style;
  readonly 'row': Style;
  readonly 'rowContent': Style;
  readonly 'remove': Style;
  readonly 'add': Style;
  readonly 'pressed': Style;
};
export default classes;
