import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Your Supabase client

// Define the expected structure for a single chapter from the request body
interface ChapterData {
  number: number;
  title: string;
  pages: string[]; // Array of image URLs
  contentId: string;
  releaseDate?: string;
  // Add any other fields that MultipleChapterForm sends and your DB expects
}

export async function POST(request: Request) {
  try {
    const chaptersToCreate: ChapterData[] = await request.json();

    if (!Array.isArray(chaptersToCreate) || chaptersToCreate.length === 0) {
      return NextResponse.json({ error: 'No chapters provided or invalid format' }, { status: 400 });
    }

    // Validate each chapter object (basic validation)
    for (const chapter of chaptersToCreate) {
      if (!chapter.contentId || typeof chapter.number !== 'number' || !chapter.title || !Array.isArray(chapter.pages)) {
        return NextResponse.json({ error: 'Invalid chapter data. Ensure contentId, number, title, and pages are correct.' }, { status: 400 });
      }
    }

    const chaptersForDb = chaptersToCreate.map(chapter => ({
      content_id: chapter.contentId,
      number: chapter.number,
      title: chapter.title,
      pages: chapter.pages, // Supabase can handle array of strings directly if column is text[] or jsonb
      // Add other default fields if necessary, e.g., release_date: new Date().toISOString()
      // Default the release_date to the current timestamp so newly uploaded chapters are not marked as "Unknown"
      release_date: chapter.releaseDate ?? new Date().toISOString(),
      // Ensure your table columns match these field names (e.g., content_id not contentId)
    }));

    // Perform the bulk insert operation
    const { data, error } = await supabase
      .from('chapters') // Make sure 'chapters' is your actual table name
      .insert(chaptersForDb)
      .select(); // Optionally select the inserted data if needed

    if (error) {
      console.error('Supabase error creating chapters:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `${data ? data.length : 0} chapters created successfully`,
      createdCount: data ? data.length : 0,
      // chapters: data // Optionally return the created chapters
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error /api/chapters/bulk:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 