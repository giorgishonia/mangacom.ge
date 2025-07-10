import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ authenticated: false })
    }
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
        image: session.user.user_metadata.avatar_url || null
      }
    })
  } catch (error) {
    console.error('Auth status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 