import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'avatar': Style;
  readonly 'image': Style;
  readonly 'initials': Style;
};
export default classes;
