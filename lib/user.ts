'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from './session';

export async function getProfile(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  return getProfile(user.id);
} 