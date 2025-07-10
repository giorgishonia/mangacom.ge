import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";

// Define schema for episode validation
const episodeSchema = z.object({
  contentId: z.string().uuid("Invalid content ID"),
  number: z.number().int().positive("Episode number must be positive"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  thumbnail: z.string().url("Invalid thumbnail URL").optional(),
  videoUrl: z.string().url("Invalid video URL"),
  duration: z.number().int().positive("Duration must be positive").optional(),
  releaseDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const contentId = searchParams.get("contentId");
  
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    if (id) {
      // Get specific episode by ID
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else if (contentId) {
      // Get episodes for a specific content
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("contentId", contentId)
        .order("number");
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else {
      // Get all episodes with pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from("episodes")
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
    console.error("Error fetching episodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch episodes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify user is authenticated and has admin role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: userData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
    
  if (userData?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const episodeData = await request.json();
    
    // Validate episode data
    const validatedData = episodeSchema.parse(episodeData);
    
    // Verify content exists
    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", validatedData.contentId)
      .single();
      
    if (contentError || !contentData) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }
    
    if (contentData.type !== "anime") {
      return NextResponse.json(
        { error: "Episodes can only be added to anime content" },
        { status: 400 }
      );
    }
    
    // Insert episode into database
    const { data, error } = await supabase
      .from("episodes")
      .insert(validatedData)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating episode:", error);
    return NextResponse.json(
      { error: "Failed to create episode" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json(
      { error: "Episode ID is required" },
      { status: 400 }
    );
  }
  
  // Verify user is authenticated and has admin role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: userData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
    
  if (userData?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const episodeData = await request.json();
    
    // Validate episode data
    const validatedData = episodeSchema.parse(episodeData);
    
    // Update episode in database
    const { data, error } = await supabase
      .from("episodes")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error updating episode:", error);
    return NextResponse.json(
      { error: "Failed to update episode" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json(
      { error: "Episode ID is required" },
      { status: 400 }
    );
  }
  
  // Verify user is authenticated and has admin role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: userData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
    
  if (userData?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    // Delete episode from database
    const { error } = await supabase
      .from("episodes")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting episode:", error);
    return NextResponse.json(
      { error: "Failed to delete episode" },
      { status: 500 }
    );
  }
} 