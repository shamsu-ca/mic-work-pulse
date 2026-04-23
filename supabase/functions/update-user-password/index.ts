import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const AUTH_DOMAIN = 'erp.mic'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing auth header' }, 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract JWT and verify it using the admin client (more reliable than anon client approach)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await supabaseAdmin
      .from('users').select('role').eq('id', user.id).single()
    if (!callerProfile || callerProfile.role?.toLowerCase() !== 'admin') return json({ error: 'Forbidden: caller is not an Admin' }, 403)

    const body = await req.json()
    const { action, targetUserId, newPassword, profileUpdates,
            username, full_name, role, department, manager } = body

    // ── CREATE USER ──────────────────────────────────────────────────────────
    if (action === 'createUser') {
      if (!username || !newPassword || !full_name) return json({ error: 'Missing required fields' }, 400)
      const cleanId = username.trim().toLowerCase()
      const email = `${cleanId}@${AUTH_DOMAIN}`
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { full_name, role, department, manager }
      })
      if (authError || !authData?.user) return json({ error: authError?.message || 'Failed to create auth user' }, 400)
      const { error: profileError } = await supabaseAdmin.from('users').upsert({
        id: authData.user.id,
        name: full_name,
        username: cleanId,
        role: role || 'Assignee',
        department: department || null,
        manager: manager || null,
      }, { onConflict: 'id' })
      if (profileError) return json({ error: profileError.message }, 500)
      return json({ userId: authData.user.id, username: cleanId })
    }

    if (!targetUserId) return json({ error: 'Missing targetUserId' }, 400)

    // ── UPDATE PROFILE ───────────────────────────────────────────────────────
    if (action === 'updateProfile') {
      if (!profileUpdates) return json({ error: 'Missing profileUpdates' }, 400)
      // If username is changing, update Supabase Auth email too
      if (profileUpdates.username) {
        const cleanId = profileUpdates.username.trim().toLowerCase()
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId, { email: `${cleanId}@${AUTH_DOMAIN}` }
        )
        if (authErr) throw authErr
        profileUpdates.username = cleanId
      }
      const { error } = await supabaseAdmin.from('users').update(profileUpdates).eq('id', targetUserId)
      if (error) throw error
      return json({ message: 'User updated' })
    }

    // ── RESET PASSWORD ───────────────────────────────────────────────────────
    if (action === 'resetPassword') {
      if (!newPassword) return json({ error: 'Missing newPassword' }, 400)
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword })
      if (error) throw error
      return json({ message: 'Password updated' })
    }

    return json({ error: 'Unknown action' }, 400)

  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
