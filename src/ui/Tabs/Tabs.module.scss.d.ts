import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'tabs': Style;
  readonly 'tab': Style;
  readonly 'tabOn': Style;
  readonly 'pressed': Style;
  readonly 'label': Style;
  readonly 'labelOn': Style;
  readonly 'count': Style;
  readonly 'countOn': Style;
  readonly 'countTextOn': Style;
  readonly 'countText': Style;
  readonly 'underlineTabs': Style;
  readonly 'underlineTab': Style;
  readonly 'underlineTabOn': Style;
  readonly 'underlineLabelOn': Style;
};
export default classes;
