import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
type Style = ViewStyle & TextStyle & ImageStyle;
declare const classes: {
  readonly 'badge': Style;
  readonly 'small': Style;
  readonly 'queued': Style;
  readonly 'processing': Style;
  readonly 'done': Style;
  readonly 'failed': Style;
  readonly 'warning': Style;
  readonly 'queuedText': Style;
  readonly 'processingText': Style;
  readonly 'doneText': Style;
  readonly 'failedText': Style;
  readonly 'warningText': Style;
};
export default classes;
