import * as ImagePicker from "expo-image-picker";

/**
 * Opens the gallery and returns the image uri, or undefined if cancelled. PDF is not supported yet.
 * The picker's mimeType and fileSize are only hints and are not used: the upload reads the file itself
 * and decides the type from its signature (see readImageBytes).
 */
export async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false });
    return res.canceled ? undefined : res.assets[0].uri;
}
