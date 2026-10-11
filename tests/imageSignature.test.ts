import assert from "node:assert/strict";
import { test } from "node:test";
import { sniffImage } from "../src/lib/imageSignature.ts";

const bytes = (...b: number[]) => new Uint8Array(b);
const text = (s: string) => new Uint8Array([...Buffer.from(s)]);

test("JPEG is recognised from its first bytes, whatever it is called", () => {
    assert.deepEqual(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10)), { mime: "image/jpeg", extension: "jpg" });
    assert.deepEqual(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe1)), { mime: "image/jpeg", extension: "jpg" }); // EXIF variant
});

test("PNG is recognised", () => {
    assert.deepEqual(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), { mime: "image/png", extension: "png" });
});

test("the real failure (text 'File not found') is not an image", () => {
    assert.equal(sniffImage(text("File not found")), null);
});

test("other formats, empty and truncated data are not accepted", () => {
    assert.equal(sniffImage(text("GIF89a")), null);
    assert.equal(sniffImage(text("RIFF....WEBPVP8 ")), null); // WebP
    assert.equal(sniffImage(text("....ftypheic")), null);      // HEIC
    assert.equal(sniffImage(bytes()), null);
    assert.equal(sniffImage(bytes(0xff, 0xd8)), null);          // two bytes of a JPEG signature
    assert.equal(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a)), null);
});
