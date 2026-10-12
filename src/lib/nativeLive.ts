import { TurboModuleRegistry } from "react-native";

/**
 * True when this app build contains the native parts of the real-time camera (Nitro, used by Vision Camera): a development
 * build made with them. In Expo Go they are missing, and the scan screen keeps using the snapshot camera.
 */
export const isNativeLiveAvailable = () => TurboModuleRegistry.get("NitroModules") != null;
