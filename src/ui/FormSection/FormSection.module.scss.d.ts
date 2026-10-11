import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'section': Style;
  readonly 'header': Style;
  readonly 'fields': Style;
};
export default classes;
