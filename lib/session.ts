'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function getCurrentSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  return data.session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  
  if (!session) {
    return null;
  }
  
  return session.user;
} 