import { supabase } from './supabase';

export type Mark = { m: number; s: number; d: number; h: 'R' | 'L'; line: number; x: number; y: number };
export type Line = { uri: string; w: number; h: number };
export type Piece = { bpm: number; notes: Mark[]; lines: Line[] };

/** Loads a piece and signed URLs for its line images (private bucket, valid 1 hour). */
export async function loadPiece(id: string): Promise<Piece> {
  const { data, error } = await supabase.from('pieces').select('notes_json').eq('id', id).single();
  if (error || !data?.notes_json) throw new Error('piece_not_found');
  const json = data.notes_json as { bpm: number; notes: Mark[]; lines: { path: string; w: number; h: number }[] };
  const signed = await supabase.storage.from('pieces').createSignedUrls(json.lines.map((l) => l.path), 3600);
  if (signed.error) throw signed.error;
  const lines = json.lines.map((l, i) => ({ uri: signed.data[i].signedUrl ?? '', w: l.w, h: l.h }));
  return { bpm: json.bpm, notes: json.notes, lines };
}
