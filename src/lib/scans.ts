import { supabase } from "./supabase";
import { ImageReadError, readImageBytes } from "./readImageBytes";

export type UploadError = "scan_quota_exceeded" | "piece_limit_reached" | ImageReadError | "upload_failed" | "generic";

/**
 * Uploads the photo (real bytes, type taken from the file's own signature) to scans/<user_id>/...,
 * then asks the database to start the scan (the quota is enforced there).
 */
export async function uploadAndStart(uri: string, userId: string): Promise<{ scanId?: string; error?: UploadError }> {
    const read = await readImageBytes(uri);
    if ("error" in read) return { error: read.error };
    const { bytes, mime, extension } = read.image;

    const path = `${userId}/${Date.now()}.${extension}`;
    try {
        const up = await supabase.storage.from("scans").upload(path, bytes, { contentType: mime });
        if (up.error) return { error: "upload_failed" };
    } catch {
        return { error: "upload_failed" }; // network down or cancelled: the call throws instead of returning an error
    }

    const { data, error } = await supabase.rpc("start_scan", { p_image_path: path });
    if (error) {
        // The file is already stored but no scan will use it (quota reached, banned...): do not leave it behind.
        await supabase.storage.from("scans").remove([path]).catch(() => undefined);
        const known = ["scan_quota_exceeded", "piece_limit_reached"] as const;
        return { error: known.find((k) => error.message.includes(k)) ?? "generic" };
    }
    return { scanId: data as string };
}
