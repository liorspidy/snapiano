import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'header': Style;
  readonly 'titleRow': Style;
  readonly 'grow': Style;
  readonly 'content': Style;
  readonly 'section': Style;
  readonly 'input': Style;
  readonly 'actions': Style;
  readonly 'modalActions': Style;
};
export default classes;
