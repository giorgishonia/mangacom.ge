import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";

// Define schema for content validation
const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  alternativeTitles: z.array(z.string()).optional(),
  type: z.enum(["anime", "manga", "comics"], "Type must be either 'anime', 'manga', or 'comics'"),
  genres: z.array(z.string()).optional(),
  status: z.enum(["airing", "completed", "upcoming", "canceled"]),
  description: z.string().optional(),
  coverImage: z.string().url("Invalid cover image URL"),
  bannerImage: z.string().url("Invalid banner image URL").optional(),
  rating: z.number().min(0).max(10).optional(),
  episodeCount: z.number().int().positive().optional(),
  seasonYear: z.number().int().positive().optional(),
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
  studio: z.string().optional(),
  author: z.string().optional(),
  releaseDate: z.string().optional(),
  endDate: z.string().optional(),
  featured: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  const featured = searchParams.get("featured");
  
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    if (id) {
      // Get specific content by ID
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else {
      // Build query based on filters
      let query = supabase.from("content").select("*");
      
      if (type) {
        query = query.eq("type", type);
      }
      
      if (featured === "true") {
        query = query.eq("featured", true);
      }
      
      // Apply pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await query
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
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
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
    const contentData = await request.json();
    
    // Validate content data
    const validatedData = contentSchema.parse(contentData);
    
    // Insert content into database
    const { data, error } = await supabase
      .from("content")
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
    
    console.error("Error creating content:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
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
      { error: "Content ID is required" },
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
    const contentData = await request.json();
    
    // Validate content data
    const validatedData = contentSchema.parse(contentData);
    
    // Update content in database
    const { data, error } = await supabase
      .from("content")
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
    
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
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
      { error: "Content ID is required" },
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
    // Delete content from database
    // Note: This should cascade delete related episodes/chapters
    const { error } = await supabase
      .from("content")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
} 