import { NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Helper to verify database setup
async function verifyDatabaseSetup() {
  try {
    // Check if profiles table exists
    const { error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('Error verifying profiles table:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    console.error('Unexpected error verifying database:', err)
    return { success: false, error: 'Failed to verify database setup' }
  }
}

export async function POST(request: Request) {
  try {
    // First verify database setup
    const dbCheck = await verifyDatabaseSetup()
    if (!dbCheck.success) {
      return NextResponse.json(
        { message: `Database setup issue: ${dbCheck.error}` },
        { status: 500 }
      )
    }
    
    const { email, password, username } = await request.json()
    
    // Basic validation
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    
    // Username validation
    if (username.length < 3) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters long' },
        { status: 400 }
      )
    }
    
    // Register the user in Supabase
    const result = await registerUser(email, password, username)
    
    if (!result.success) {
      // Check for specific error types
      const errorMessage = result.error?.message || '';
      console.log('Registration error full details:', result.error);
      
      if (errorMessage.includes('already registered') || errorMessage.includes('already in use')) {
        return NextResponse.json(
          { message: 'This email is already registered' },
          { status: 409 }
        )
      }
      
      if (errorMessage.includes('profiles_username_key')) {
        return NextResponse.json(
          { message: 'This username is already taken' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { message: errorMessage || 'Registration failed' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Registration successful', user: result.user },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
} 