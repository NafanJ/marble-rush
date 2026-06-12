import { supabaseAdmin } from '../supabaseAdmin';

const TEXTURE_BUCKET = 'marble-textures';

/**
 * Delete all uploaded marble textures for a race. Textures are only read
 * while a race is live, so this runs whenever a race reaches a terminal
 * state (complete/cancelled) or is restarted. Layout in the bucket is
 * <raceId>/<entrantId>/<file>.
 *
 * Best-effort: a cleanup failure must never break race completion.
 */
export async function deleteRaceTextures(raceId: string): Promise<void> {
  try {
    const bucket = supabaseAdmin.storage.from(TEXTURE_BUCKET);
    const { data: entrantDirs } = await bucket.list(raceId);
    if (!entrantDirs?.length) return;

    const paths: string[] = [];
    for (const dir of entrantDirs) {
      const { data: files } = await bucket.list(`${raceId}/${dir.name}`);
      for (const f of files ?? []) {
        paths.push(`${raceId}/${dir.name}/${f.name}`);
      }
    }
    if (paths.length > 0) {
      await bucket.remove(paths);
    }
  } catch (err) {
    console.warn(`texture cleanup failed for race ${raceId}:`, err);
  }
}
