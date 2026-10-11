import { Image } from 'react-native';

const ART = require('../../../assets/illustrations/scan-empty.png');
const RATIO = 749 / 720;

// Empty-library illustration: sheets of music with a camera badge.
export function EmptyLibraryArt({ size = 220 }: { size?: number }) {
  return (
    <Image
      source={ART}
      style={{ width: size, height: size * RATIO }}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
