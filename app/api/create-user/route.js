import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { full_name, email, phone, password, role } = await request.json()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: data.user.id, full_name, phone, role: role || 'vendeur' })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ success: true, user: data.user })
}