import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'backdrop': Style;
  readonly 'rtl': Style;
  readonly 'image': Style;
  readonly 'close': Style;
};
export default classes;
