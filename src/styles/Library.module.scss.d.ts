import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'header': Style;
  readonly 'titleRow': Style;
  readonly 'account': Style;
  readonly 'list': Style;
  readonly 'empty': Style;
  readonly 'row': Style;
  readonly 'actions': Style;
  readonly 'grow': Style;
  readonly 'centered': Style;
  readonly 'pressed': Style;
};
export default classes;
