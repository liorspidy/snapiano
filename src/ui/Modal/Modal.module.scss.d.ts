import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'root': Style;
  readonly 'rtl': Style;
  readonly 'rootSheet': Style;
  readonly 'overlay': Style;
  readonly 'dialog': Style;
  readonly 'dialogCentered': Style;
  readonly 'sheet': Style;
  readonly 'header': Style;
  readonly 'titleRow': Style;
  readonly 'titleIcon': Style;
  readonly 'close': Style;
  readonly 'pressed': Style;
  readonly 'body': Style;
  readonly 'footer': Style;
};
export default classes;
