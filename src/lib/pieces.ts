import { supabase } from "./supabase";

/** Deletes a piece: its saved page images first, then the row. The scan record stays, with no piece attached. */
export async function deletePiece(pieceId: string, userId: string) {
    const folder = `${userId}/${pieceId}`;
    const { data: files } = await supabase.storage.from("pieces").list(folder);
    if (files?.length) {
        await supabase.storage.from("pieces").remove(files.map((f) => `${folder}/${f.name}`));
    }
    const { error } = await supabase.from("pieces").delete().eq("id", pieceId);
    if (error) throw error;
}

/** Removes every stored file of a user (scan photos and piece page images). Admin only: storage rules enforce that. */
export async function deleteUserFiles(userId: string) {
    const scans = await supabase.storage.from("scans").list(userId, { limit: 1000 });
    if (scans.data?.length) {
        await supabase.storage.from("scans").remove(scans.data.map((f) => `${userId}/${f.name}`));
    }
    const pieces = await supabase.storage.from("pieces").list(userId, { limit: 1000 });
    for (const folder of pieces.data ?? []) {
        const inner = await supabase.storage.from("pieces").list(`${userId}/${folder.name}`, { limit: 1000 });
        if (inner.data?.length) {
            await supabase.storage.from("pieces").remove(inner.data.map((f) => `${userId}/${folder.name}/${f.name}`));
        }
    }
}
