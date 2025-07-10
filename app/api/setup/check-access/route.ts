import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

export async function GET() {
  try {
    const results = {
      content: { success: false, count: 0, error: null },
      chapters: { success: false, count: 0, error: null },
      profiles: { success: false, count: 0, error: null },
      comments: { success: false, count: 0, error: null },
      avatarBucket: { success: false, error: null }
    };

    // Check content table access
    try {
      const { data: contentData, error: contentError, count: contentCount } = await supabasePublic
        .from('content')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      results.content = {
        success: !contentError,
        count: contentCount || 0,
        error: contentError ? contentError.message : null
      };
    } catch (err: any) {
      results.content.error = err.message || String(err);
    }

    // Check chapters table access
    try {
      const { data: chaptersData, error: chaptersError, count: chaptersCount } = await supabasePublic
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      results.chapters = {
        success: !chaptersError,
        count: chaptersCount || 0,
        error: chaptersError ? chaptersError.message : null
      };
    } catch (err: any) {
      results.chapters.error = err.message || String(err);
    }

    // Check profiles table access
    try {
      const { data: profilesData, error: profilesError, count: profilesCount } = await supabasePublic
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      results.profiles = {
        success: !profilesError,
        count: profilesCount || 0,
        error: profilesError ? profilesError.message : null
      };
    } catch (err: any) {
      results.profiles.error = err.message || String(err);
    }

    // Check comments table access
    try {
      const { data: commentsData, error: commentsError, count: commentsCount } = await supabasePublic
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      results.comments = {
        success: !commentsError,
        count: commentsCount || 0,
        error: commentsError ? commentsError.message : null
      };
    } catch (err: any) {
      results.comments.error = err.message || String(err);
    }

    // Check avatars bucket access
    try {
      const { data: avatarData, error: avatarError } = await supabasePublic.storage
        .getBucket('avatars');
      
      results.avatarBucket = {
        success: !avatarError && avatarData?.public === true,
        error: avatarError ? avatarError.message : (avatarData?.public !== true ? 'Bucket is not public' : null)
      };
    } catch (err: any) {
      results.avatarBucket.error = err.message || String(err);
    }

    return NextResponse.json({
      success: true,
      message: 'Access check completed',
      results
    });
  } catch (error: any) {
    console.error('Unexpected error checking access:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Unexpected error checking access',
      error: error.message || String(error)
    }, { status: 500 });
  }
} 