import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the calling user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Admin client with service role — bypasses ALL RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify caller is Admin (using service role so RLS won't block)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'Admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, targetUserId, newPassword, newEmail, profileUpdates } = body

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing targetUserId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Action: updateProfile ──────────────────────────────────────────────
    // Updates profile fields using service role (bypasses RLS)
    if (action === 'updateProfile') {
      if (!profileUpdates || typeof profileUpdates !== 'object') {
        return new Response(JSON.stringify({ error: 'Missing profileUpdates' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', targetUserId)
      if (error) throw error
      return new Response(JSON.stringify({ message: 'Profile updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      })
    }

    // ── Action: resetPassword ──────────────────────────────────────────────
    if (action === 'resetPassword' || newPassword) {
      if (!newPassword) {
        return new Response(JSON.stringify({ error: 'Missing newPassword' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const updatePayload: { password?: string; email?: string } = { password: newPassword }
      if (newEmail) updatePayload.email = newEmail

      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, updatePayload)
      if (error) throw error

      if (newEmail) {
        await supabaseAdmin.from('profiles').update({ email: newEmail }).eq('id', targetUserId)
      }
      return new Response(JSON.stringify({ message: 'Password updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})
