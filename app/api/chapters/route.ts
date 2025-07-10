import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";

// Define schema for chapter validation
const chapterSchema = z.object({
  contentId: z.string().uuid("Invalid content ID"),
  number: z.number().int().positive("Chapter number must be positive"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  thumbnail: z.string().url("Invalid thumbnail URL").optional(),
  pages: z.array(z.string().url("Invalid page URL")),
  releaseDate: z.string().optional(),
});

// Helper function to check admin status
async function checkAdminStatus(request: NextRequest, supabase: any) {
  // Check for service role key in header
  const serviceRoleKey = request.headers.get('x-supabase-service-role');
  
  // If service role key is provided and matches the expected value, bypass auth check
  if (serviceRoleKey && process.env.SUPABASE_SERVICE_ROLE_KEY && 
      serviceRoleKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { isAdmin: true };
  }
  
  // Otherwise do normal admin check
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { isAdmin: false, error: "Not authenticated", status: 401 };
  }
  
  // Get user profile to check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return { isAdmin: false, error: "Failed to verify user role", status: 500 };
  }
  
  // Check if user is admin
  const isAdmin = profile?.role === 'admin';
  
  if (!isAdmin) {
    return { isAdmin: false, error: "Forbidden - Admin access required", status: 403 };
  }
  
  return { isAdmin: true };
}

async function authorizeRequest(request: NextRequest, supabaseInstance: any) {
  // 1. Check for Service Role Key Header (for admin actions from trusted clients)
  const serviceRoleHeader = request.headers.get('x-supabase-service-role');
  if (serviceRoleHeader) {
    if (serviceRoleHeader === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("API Chapters: Authorized via Service Role Key.");
      return { authorized: true, user: null, error: null, status: 200 }; // User is null because it's a service action
    } else {
      console.warn("API Chapters: Invalid Service Role Key received.");
      return { authorized: false, user: null, error: 'Invalid service role key.', status: 403 }; // Forbidden
    }
  }

  // 2. Fallback to User Session Authentication
  const { data: { session }, error: sessionError } = await supabaseInstance.auth.getSession();

  if (sessionError) {
    console.error('API Chapters: Session retrieval error:', sessionError);
    return { authorized: false, user: null, error: 'Session retrieval error', status: 500 };
  }
  if (!session) {
    console.error('API Chapters: No session found. User not authenticated or session expired.');
    return { authorized: false, user: null, error: 'Unauthorized: No active session', status: 401 };
  }

  // Optional: Here you could add an additional check for user role from your 'profiles' table if needed for session-based admin access
  // For now, if a session exists, we'll consider it potentially authorized for general actions,
  // but specific admin role checks should be done if not using service key.
  // const { data: profile } = await supabaseInstance.from('profiles').select('role').eq('id', session.user.id).single();
  // if (profile?.role !== 'admin') { return { authorized: false, user: session.user, error: 'Forbidden: Admin role required', status: 403 }; }

  console.log("API Chapters: Authorized via user session for user:", session.user.id);
  return { authorized: true, user: session.user, error: null, status: 200 };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const contentId = searchParams.get("contentId");
  const contentType = searchParams.get("contentType");
  
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    if (id) {
      // Get specific chapter by ID
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else if (contentId) {
      // Get chapters for a specific content
      // Note: Using the content_id field (snake_case) as per database schema
      console.log("Fetching chapters for contentId:", contentId, "contentType:", contentType);
      
      let query = supabase
        .from("chapters")
        .select("*")
        .eq("content_id", contentId);
      
      // If content type is specified, filter by it
      if (contentType) {
        query = query.eq("content_type", contentType);
      }
      
      const { data, error } = await query.order("number");
        
      if (error) {
        console.error("Error fetching chapters:", error);
        return NextResponse.json([], { status: 200 }); // Return empty array if error
      }
      
      return NextResponse.json(data);
    } else {
      // Get all chapters with pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from("chapters")
        .select("*", { count: "exact" })
        .range(offset, offset + limit - 1)
        .order("createdAt", { ascending: false });
        
      if (error) throw error;
      
      return NextResponse.json({
        data,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil((count || 0) / limit),
        },
      });
    }
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const authResult = await authorizeRequest(request, supabase);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  // If authResult.user is needed for associating with the chapter, it's available here.

  try {
    const chapterData = await request.json();
    if (!chapterData.contentId || typeof chapterData.number !== 'number' || !chapterData.title || !Array.isArray(chapterData.pages)) {
        return NextResponse.json({ error: 'Invalid chapter data. Missing or incorrect required fields.' }, { status: 400 });
    }
    const newChapter = {
        content_id: chapterData.contentId,
        number: chapterData.number,
        title: chapterData.title,
        pages: chapterData.pages,
        release_date: chapterData.release_date || null,
        thumbnail: chapterData.thumbnail || null,
        description: chapterData.description || null,
        // user_id: authResult.user?.id, // Example if you want to link chapter to user
    };
    const { data, error } = await supabase.from('chapters').insert([newChapter]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error('API Chapters POST: Error processing request:', e);
    return NextResponse.json({ error: e.message || 'Server error processing request.' }, { status: e instanceof SyntaxError ? 400 : 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const authResult = await authorizeRequest(request, supabase);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const chapterDataToUpdate = await request.json();
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('id');
    if (!chapterId) return NextResponse.json({ error: 'Chapter ID required.' }, { status: 400 });

    const updatePayload: { [key: string]: any } = {};
    if (chapterDataToUpdate.title !== undefined) updatePayload.title = chapterDataToUpdate.title;
    if (chapterDataToUpdate.number !== undefined) updatePayload.number = chapterDataToUpdate.number;
    if (chapterDataToUpdate.pages !== undefined) updatePayload.pages = chapterDataToUpdate.pages;
    if (chapterDataToUpdate.description !== undefined) updatePayload.description = chapterDataToUpdate.description;
    updatePayload.release_date = chapterDataToUpdate.release_date;
    updatePayload.thumbnail = chapterDataToUpdate.thumbnail;
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields for update.' }, { status: 400 });
    }

    const { data, error } = await supabase.from('chapters').update(updatePayload).eq('id', chapterId).select().single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Chapter not found or update failed.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('API Chapters PUT: Error processing request:', e);
    return NextResponse.json({ error: e.message || 'Server error processing request.' }, { status: e instanceof SyntaxError ? 400 : 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const authResult = await authorizeRequest(request, supabase);

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('id');
    if (!chapterId) return NextResponse.json({ error: 'Chapter ID required.' }, { status: 400 });

    const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
    if (error) throw error;
    return NextResponse.json({ message: 'Chapter deleted successfully.' });
  } catch (e: any) {
    console.error('API Chapters DELETE: Error processing request:', e);
    return NextResponse.json({ error: e.message || 'Server error processing request.' }, { status: 500 });
  }
}

// Ensure the route is treated as dynamic
export const dynamic = 'force-dynamic'; 