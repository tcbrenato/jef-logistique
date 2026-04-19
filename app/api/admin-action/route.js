import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { action, userId, newPassword } = await request.json()

  // REINITIALISER MOT DE PASSE
  if (action === 'reset_password') {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // SUPPRIMER COMPTE
  if (action === 'delete_user') {
    // Supprimer le profil d'abord
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    // Supprimer l'utilisateur auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
}