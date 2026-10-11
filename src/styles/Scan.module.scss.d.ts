import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'view': Style;
  readonly 'center': Style;
  readonly 'actions': Style;
  readonly 'centered': Style;
};
export default classes;
