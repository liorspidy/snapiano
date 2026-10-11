import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'body': Style;
  readonly 'actions': Style;
  readonly 'centered': Style;
};
export default classes;
