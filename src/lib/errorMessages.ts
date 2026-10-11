import type { UploadError } from "./scans";

// Maps stable error codes to translation keys. Codes come from the app (UploadError) or from the server (scans.error).
// Raw error text from either side is never shown to the user.

export function uploadErrorKey(code: UploadError): string {
    switch (code) {
        case "scan_quota_exceeded": return "error.quota";
        case "piece_limit_reached": return "error.pieceLimit";
        case "file_missing":
        case "file_empty":
        case "file_too_small":
        case "file_unreadable": return "error.photoUnreadable";
        case "not_an_image": return "error.notAnImage";
        case "upload_failed": return "error.uploadFailed";
        default: return "error.generic";
    }
}

export function scanErrorKey(code: string | null | undefined): string {
    switch (code) {
        case "bad_upload": return "process.badUpload";
        case "image_too_large": return "process.tooLarge";
        case "no_staves": return "process.noStaves";
        case "no_notes": return "process.noNotes";
        default: return "process.failed";
    }
}
