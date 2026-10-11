import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'wrap': Style;
  readonly 'illustration': Style;
  readonly 'icon': Style;
  readonly 'title': Style;
  readonly 'description': Style;
  readonly 'action': Style;
};
export default classes;
