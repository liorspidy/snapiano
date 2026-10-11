// Decides what a file really is from its first bytes. File names, picker hints (mimeType, fileSize) and
// declared content types are never trusted: only the signature counts.
export type ImageKind = { mime: "image/jpeg" | "image/png"; extension: "jpg" | "png" };

export function sniffImage(bytes: Uint8Array): ImageKind | null {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return { mime: "image/jpeg", extension: "jpg" };
    }
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length >= png.length && png.every((b, i) => bytes[i] === b)) {
        return { mime: "image/png", extension: "png" };
    }
    return null;
}
