import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'field': Style;
  readonly 'options': Style;
  readonly 'option': Style;
  readonly 'optionOn': Style;
  readonly 'optionError': Style;
  readonly 'optionOnError': Style;
  readonly 'pressed': Style;
  readonly 'labelOn': Style;
};
export default classes;
