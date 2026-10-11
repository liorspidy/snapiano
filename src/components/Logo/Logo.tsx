import { Image } from 'react-native';

// The app icon tile (navy rounded square with the S mark), same art as the launcher icon.
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <Image
      source={require('../../../assets/logo-tile.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
