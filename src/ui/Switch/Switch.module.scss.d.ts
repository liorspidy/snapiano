import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'track': Style;
  readonly 'trackOn': Style;
  readonly 'thumb': Style;
  readonly 'disabled': Style;
};
export default classes;
