import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'overlay': Style;
  readonly 'scrim': Style;
  readonly 'octave': Style;
  readonly 'white': Style;
  readonly 'black': Style;
  readonly 'clip': Style;
  readonly 'lit': Style;
  readonly 'label': Style;
};
export default classes;
