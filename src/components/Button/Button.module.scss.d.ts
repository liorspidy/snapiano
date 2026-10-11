import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'base': Style;
  readonly 'primary': Style;
  readonly 'secondary': Style;
  readonly 'pressed': Style;
  readonly 'disabled': Style;
  readonly 'primaryLabel': Style;
  readonly 'secondaryLabel': Style;
};
export default classes;
