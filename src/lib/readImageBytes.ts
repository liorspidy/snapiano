import { File } from "expo-file-system";
import { ImageKind, sniffImage } from "./imageSignature";

// A first guard against empty or truncated files, not proof that a file is valid:
// validity is the signature check here and the decode on the server. Change the number here if real photos ever need it.
export const MIN_IMAGE_BYTES = 10 * 1024;

export type ImageReadError = "file_missing" | "file_empty" | "file_too_small" | "not_an_image" | "file_unreadable";
export type ImageRead = { image: ImageKind & { bytes: Uint8Array } } | { error: ImageReadError };

/** Reads a camera or gallery file (file:// or content://) as real bytes and checks that they are a JPEG or PNG. */
export async function readImageBytes(uri: string): Promise<ImageRead> {
    try {
        const file = new File(uri);
        if (!file.exists) return { error: "file_missing" };
        const size = file.size ?? 0;
        if (size === 0) return { error: "file_empty" };
        if (size < MIN_IMAGE_BYTES) return { error: "file_too_small" };
        const bytes = await file.bytes();
        if (bytes.length < MIN_IMAGE_BYTES) return { error: "file_too_small" };
        const kind = sniffImage(bytes);
        if (!kind) return { error: "not_an_image" };
        return { image: { ...kind, bytes } };
    } catch {
        return { error: "file_unreadable" };
    }
}
