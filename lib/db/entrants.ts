import { supabaseAdmin } from '../supabaseAdmin';
import { Entrant, EntrantRow } from '../types';
import { MARBLE_COLOURS } from '../constants';

export function rowToEntrant(row: EntrantRow): Entrant {
  return {
    id: row.id,
    raceId: row.race_id,
    displayName: row.display_name,
    normalisedDisplayName: row.normalised_display_name,
    colour: row.colour,
    marbleTextureUrl: row.marble_texture_url,
    joinedAt: row.joined_at,
    marbleNumber: row.marble_number,
    browserSessionId: row.browser_session_id,
  };
}

export async function getEntrantsByRace(raceId: string): Promise<Entrant[]> {
  const { data, error } = await supabaseAdmin
    .from('entrants')
    .select('*')
    .eq('race_id', raceId)
    .order('marble_number', { ascending: true });
  if (error) {
    console.error('[getEntrantsByRace] Supabase error:', error.message, error.code);
    return [];
  }
  if (!data) return [];
  return (data as EntrantRow[]).map(rowToEntrant);
}

export async function getEntrantById(id: string): Promise<Entrant | null> {
  const { data, error } = await supabaseAdmin
    .from('entrants')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToEntrant(data as EntrantRow);
}

export async function countEntrantsByRace(raceId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('entrants')
    .select('*', { count: 'exact', head: true })
    .eq('race_id', raceId);
  if (error) return 0;
  return count ?? 0;
}

export async function createEntrant(params: {
  raceId: string;
  displayName: string;
  browserSessionId: string;
}): Promise<Entrant | null> {
  const normalisedName = params.displayName.trim().toLowerCase();

  // Get current count to assign marble number and colour
  const count = await countEntrantsByRace(params.raceId);
  const marbleNumber = count + 1;
  const colour = MARBLE_COLOURS[count % MARBLE_COLOURS.length];

  const { data, error } = await supabaseAdmin
    .from('entrants')
    .insert({
      race_id: params.raceId,
      display_name: params.displayName.trim(),
      normalised_display_name: normalisedName,
      colour,
      marble_number: marbleNumber,
      browser_session_id: params.browserSessionId,
    })
    .select('*')
    .single();

  if (error || !data) return null;
  return rowToEntrant(data as EntrantRow);
}

export async function updateEntrantTexture(
  entrantId: string,
  textureUrl: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('entrants')
    .update({ marble_texture_url: textureUrl })
    .eq('id', entrantId);
  return !error;
}

export async function deleteEntrant(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('entrants').delete().eq('id', id);
  return !error;
}

export async function checkSessionInRace(
  raceId: string,
  browserSessionId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('entrants')
    .select('id')
    .eq('race_id', raceId)
    .eq('browser_session_id', browserSessionId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function checkNameInRace(
  raceId: string,
  normalisedName: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('entrants')
    .select('id')
    .eq('race_id', raceId)
    .eq('normalised_display_name', normalisedName)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
