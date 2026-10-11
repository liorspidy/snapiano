import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'wrap': Style;
  readonly 'skeleton': Style;
  readonly 'image': Style;
};
export default classes;
