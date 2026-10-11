import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'trigger': Style;
  readonly 'compactTrigger': Style;
  readonly 'open': Style;
  readonly 'invalid': Style;
  readonly 'label': Style;
  readonly 'valueRow': Style;
  readonly 'value': Style;
  readonly 'chevron': Style;
  readonly 'menu': Style;
  readonly 'option': Style;
  readonly 'optionOn': Style;
  readonly 'optionText': Style;
  readonly 'optionTextOn': Style;
  readonly 'backdrop': Style;
};
export default classes;
