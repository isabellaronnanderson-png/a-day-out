// Bridges the local place shape (used throughout the app, see lib/storage.js)
// and the Supabase `day_out_places` table. localStorage stays the fast/
// offline cache; once signed in, Supabase is the source of truth and every
// write here also goes to the cloud.

import { supabase } from './supabaseClient';

const TABLE = 'day_out_places';

function placeToRow(place, userId) {
  return {
    id: place.id,
    user_id: userId,
    name: place.name,
    city: place.city || null,
    address: place.address || null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    categories: place.categories || [],
    tags: place.tags || [],
    cost: place.cost ?? null,
    notes: place.notes || null,
    exhibition_end_date: place.exhibitionEndDate || null,
    opening_hours: place.openingHours || null,
    favorite: !!place.favorite,
    visited: !!place.visited,
    google_place_id: place.googlePlaceId || null,
    created_at: place.createdAt || new Date().toISOString()
  };
}

function rowToPlace(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city || '',
    address: row.address || '',
    lat: row.lat,
    lng: row.lng,
    categories: row.categories || [],
    tags: row.tags || [],
    cost: row.cost,
    notes: row.notes || '',
    exhibitionEndDate: row.exhibition_end_date,
    openingHours: row.opening_hours,
    favorite: !!row.favorite,
    visited: !!row.visited,
    googlePlaceId: row.google_place_id,
    createdAt: row.created_at
  };
}

export async function fetchCloudPlaces(userId) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(rowToPlace);
}

export async function upsertCloudPlace(userId, place) {
  const { error } = await supabase.from(TABLE).upsert(placeToRow(place, userId));
  if (error) throw error;
}

export async function deleteCloudPlace(userId, placeId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', placeId).eq('user_id', userId);
  if (error) throw error;
}

async function bulkUpsertCloudPlaces(userId, places) {
  if (places.length === 0) return;
  const rows = places.map((p) => placeToRow(p, userId));
  const { error } = await supabase.from(TABLE).upsert(rows);
  if (error) throw error;
}

/**
 * Runs once right after sign-in. Merges whatever's in the local cache with
 * whatever's already in the cloud for this user:
 *  - anything local that isn't in the cloud yet gets pushed up (so data
 *    from before this device ever logged in isn't lost)
 *  - the cloud's version wins for anything that exists in both places
 * Returns the merged list, which becomes the new local cache.
 */
export async function syncOnLogin(userId, localPlaces) {
  const cloudPlaces = await fetchCloudPlaces(userId);
  const cloudIds = new Set(cloudPlaces.map((p) => p.id));
  const localOnly = localPlaces.filter((p) => !cloudIds.has(p.id));

  if (localOnly.length > 0) {
    await bulkUpsertCloudPlaces(userId, localOnly);
  }

  return [...cloudPlaces, ...localOnly];
}
