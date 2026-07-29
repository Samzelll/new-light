import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple SHA256 hashing in Deno
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get auth token and verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization header required')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Parse body parameters
    const { contestId, stageId, groupId, participantId, trustWeight } = await req.json()
    if (!contestId || !stageId || !groupId || !participantId) {
      throw new Error('Missing parameters')
    }

    // 3. Extract IP address
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    const ipSalt = Deno.env.get('IP_SALT') ?? 'default_salt_key_129'
    const ipHash = await sha256(ip + ipSalt)

    // 4. Check/Upsert vote_ip_log count
    const { data: ipLog, error: logError } = await supabase
      .from('vote_ip_log')
      .select('vote_count')
      .eq('ip_hash', ipHash)
      .eq('group_id', groupId)
      .eq('participant_id', participantId)
      .maybeSingle()

    let voteCount = 1
    if (ipLog) {
      voteCount = (ipLog.vote_count || 0) + 1
    }

    const { error: upsertErr } = await supabase
      .from('vote_ip_log')
      .upsert({
        ip_hash: ipHash,
        contest_id: contestId,
        stage_id: stageId,
        group_id: groupId,
        participant_id: participantId,
        vote_count: voteCount,
        last_vote_at: new Date().toISOString(),
        is_flagged: voteCount > 10
      }, { onConflict: 'ip_hash,group_id,participant_id' })

    if (upsertErr) throw upsertErr

    // 5. Determine final trust weight
    // Collapse rules: if votes from same IP for same candidate > 10, collapse weight to 0.1
    const finalWeight = voteCount > 10 ? 0.1 : (Number(trustWeight) || 1.0)

    // 6. Record the vote in the database
    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .insert({
        contest_id: contestId,
        stage_id: stageId,
        group_id: groupId,
        voter_id: user.id,
        participant_id: participantId,
        trust_weight: finalWeight,
        ip_hash: ipHash
      })
      .select()
      .single()

    if (voteError) throw voteError

    return new Response(JSON.stringify({ success: true, data: voteData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
