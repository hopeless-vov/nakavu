import { supabase, unwrap } from '~/api/supabase'
import type { Profile, ProfilePatch } from '~/types/domain'
import { toProfile, toProfileUpdate } from '~/utils/mappers'

export async function getProfile(id: string): Promise<Profile> {
  return toProfile(unwrap(await supabase().from('profiles').select('*').eq('id', id).single()))
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<Profile> {
  return toProfile(unwrap(await supabase().from('profiles').update(toProfileUpdate(patch)).eq('id', id).select('*').single()))
}

/** Uploads a profile photo and returns its public URL (cache-busted). */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/avatar.${ext}`
  const storage = supabase().storage.from('avatars')
  unwrap(await storage.upload(path, file, { upsert: true, contentType: file.type }))
  return `${storage.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

export async function deleteMyAccount(): Promise<void> {
  unwrap(await supabase().rpc('delete_my_account'))
}
