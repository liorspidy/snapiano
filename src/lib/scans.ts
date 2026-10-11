import { supabase } from './supabase';

export type UploadError = 'scan_quota_exceeded' | 'piece_limit_reached' | 'generic';

/** Uploads the photo to scans/<user_id>/..., then asks the DB to start the scan (quota enforced there). */
export async function uploadAndStart(uri: string, userId: string): Promise<{ scanId?: string; error?: UploadError }> {
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;
  const up = await supabase.storage.from('scans').upload(path, body, { contentType: 'image/jpeg' });
  if (up.error) return { error: 'generic' };

  const { data, error } = await supabase.rpc('start_scan', { p_image_path: path });
  if (error) {
    const known = ['scan_quota_exceeded', 'piece_limit_reached'] as const;
    return { error: known.find((k) => error.message.includes(k)) ?? 'generic' };
  }
  return { scanId: data as string };
}
