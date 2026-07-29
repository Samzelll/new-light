import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch users active in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimitString = thirtyDaysAgo.toISOString().split('T')[0];

    // Fetch user aggregated activity logs from user_daily_log
    const { data: logs, error: logsError } = await supabase
      .from('user_daily_log')
      .select('user_id, votes_cast, unique_participants_voted, log_date')
      .gte('log_date', dateLimitString);

    if (logsError) throw logsError;

    // Group logs by user_id to compute stats
    const userStatsMap = new Map<string, {
      activeDays: number;
      totalVotes: number;
      uniqueVoted: number;
    }>();

    for (const log of logs) {
      const stats = userStatsMap.get(log.user_id) || { activeDays: 0, totalVotes: 0, uniqueVoted: 0 };
      stats.activeDays += 1;
      stats.totalVotes += log.votes_cast || 0;
      stats.uniqueVoted += log.unique_participants_voted || 0;
      userStatsMap.set(log.user_id, stats);
    }

    // 3. Recalculate scores and update user_trust
    const results = [];
    for (const [userId, stats] of userStatsMap.entries()) {
      // Fetch current score
      const { data: currentTrust } = await supabase
        .from('user_trust')
        .select('score')
        .eq('user_id', userId)
        .single();

      const currentScore = Number(currentTrust?.score ?? 1.0);

      // Component 1: active days in last 30 days (30% weight, max 6.0)
      const daysComponent = Math.min(stats.activeDays / 30, 1) * 6;

      // Component 2: contests voted in (40% weight, max 8.0)
      // (Using active days or votes count proxy for contests count)
      const votesComponent = Math.min(stats.totalVotes / 20, 1) * 8;

      // Component 3: vote diversity index (30% weight, max 6.0)
      const diversity = stats.totalVotes > 0 ? stats.uniqueVoted / stats.totalVotes : 0;
      const diversityComponent = diversity * 6;

      const rawScore = daysComponent + votesComponent + diversityComponent;

      // Cap daily growth: max +2 per day
      const maxDailyGrowth = 2.0;
      const newScore = Math.min(rawScore, currentScore + maxDailyGrowth);
      const score = Math.max(1.0, Math.min(20.0, newScore));

      // Resolve level
      let level = 'new';
      if (score >= 11.0) level = 'senior';
      else if (score >= 6.0) level = 'trusted';
      else if (score >= 2.0) level = 'regular';

      // Update in database
      const { error: updateErr } = await supabase
        .from('user_trust')
        .upsert({
          user_id: userId,
          score,
          level,
          days_active: stats.activeDays,
          contests_voted: stats.totalVotes, // proxy count
          vote_diversity: parseFloat(diversity.toFixed(3)),
          last_updated: new Date().toISOString().split('T')[0],
        });

      if (!updateErr) {
        results.push({ userId, score, level });
      }
    }

    return new Response(JSON.stringify({ success: true, processedCount: results.length }), {
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
