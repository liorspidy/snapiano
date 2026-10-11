import { findNodeHandle, GestureResponderEvent, TextInput } from 'react-native';

// Spread on the root view: a touch anywhere that is not the focused input blurs it (which closes the keyboard).
// It only observes the touch (returns false), so buttons, scrolling and other inputs keep working.
export function useBlurOnOutsidePress() {
  return {
    onStartShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const focused = TextInput.State.currentlyFocusedInput();
      if (focused && Number(e.target) !== findNodeHandle(focused as never)) TextInput.State.blurTextInput(focused);
      return false;
    },
  };
}
