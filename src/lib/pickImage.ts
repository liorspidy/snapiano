import * as ImagePicker from 'expo-image-picker';

/** Opens the gallery; returns the image uri, or undefined if cancelled. PDF is not supported yet. */
export async function pickImage() {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
  return res.canceled ? undefined : res.assets[0].uri;
}
