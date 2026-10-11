import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'screen': Style;
  readonly 'header': Style;
  readonly 'grow': Style;
  readonly 'content': Style;
  readonly 'summary': Style;
  readonly 'page': Style;
  readonly 'band': Style;
  readonly 'bandLabel': Style;
  readonly 'dot': Style;
  readonly 'actions': Style;
  readonly 'question': Style;
  readonly 'modalActions': Style;
};
export default classes;
