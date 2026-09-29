import { supabase, unwrap } from '~/api/supabase'
import type { Match, MatchFeedback } from '~/types/domain'
import { toMatch } from '~/utils/mappers'

export async function listMyMatches(limit = 50): Promise<Match[]> {
  return unwrap(await supabase().rpc('my_matches', { p_limit: limit })).map(toMatch)
}

export async function setMatchFeedback(matchId: string, feedback: MatchFeedback): Promise<void> {
  unwrap(await supabase().rpc('set_match_feedback', { p_match: matchId, p_feedback: feedback }))
}
