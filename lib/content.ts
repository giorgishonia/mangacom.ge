import { supabase, supabasePublic } from './supabase'
import type { Chapter } from './supabase'

// ---------------------------------------------------------------------------
// Internal util flags
// ---------------------------------------------------------------------------

// Remember if the optional mangadex_chapter_cache table exists so we don’t hit
// the network with 404s repeatedly for every page-load.
let HAS_MANGADEX_CACHE_TABLE: boolean | null = null;

// Toggle for verbose logging within content helper functions
const CONTENT_DEBUG = false;

// Helper wrappers to silence logs when debug is off
if (!CONTENT_DEBUG) {
  // eslint-disable-next-line no-console
  console.log = (..._args: any[]) => {};
  // eslint-disable-next-line no-console
  console.warn = (..._args: any[]) => {};
}
// NOTE: console.error is left intact so real errors remain visible.

// Content metadata interface with consistent chapter tracking (episodes removed)
export interface ContentMetadata {
  id: string
  title: string
  description: string
  type: 'manga' | 'comics'
  status: string
  thumbnail: string
  bannerImage?: string
  logo?: string
  rating?: number
  genres: string[]
  chapters_count?: number  // For manga/comics
  georgian_title?: string
  release_year?: number
  view_count?: number
  chapter_data?: {        // More detailed chapter info
    total: number
    latest: number
    lastUpdated: string
  }
}

// Get all content (manga or comics)
export async function getAllContent(
  type: 'manga' | 'comics',
  limit = 20,
  page = 0,
) {
  try {
    // Use the *public* client to avoid RLS differences between anon vs auth.
    const { data, error, count } = await supabasePublic
      .from('content')
      .select('*, view_count', { count: 'exact' })
      .eq('type', type)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      throw error
    }

    // Enrich content with accurate chapter/episode counts
    if (data && data.length > 0) {
      // For manga/comics, get chapter counts
      if (type === 'manga' || type === 'comics') {
        await Promise.all(data.map(async (item) => {
          try {
            const { data: chapters, error: chaptersError } = await supabasePublic
              .from('chapters')
              .select('id, number', { count: 'exact' })
              .eq('content_id', item.id)
              .order('number', { ascending: false })
              .limit(1);
              
            if (!chaptersError && chapters && chapters.length > 0) {
              item.chapters_count = chapters[0].number;
            } else if (!item.chapters_count) {
              item.chapters_count = 0;
            }
          } catch (err) {
            console.error(`Error fetching chapters for ${item.id}:`, err);
          }
        }));
      }
    }

    // --- DEBUG: Log raw data from Supabase in getAllContent ---
    console.log(`[getAllContent - ${type}] Raw Supabase data sample:`, data?.slice(0, 2).map((d: any) => ({ 
      id: d.id, 
      title: d.title, 
      chapters_count: d.chapters_count,
      view_count: d.view_count
    })) || 'No data');
    // -------------------------------------------------------

    return { 
      success: true, 
      content: data, 
      totalCount: count,
      currentPage: page,
      totalPages: count ? Math.ceil(count / limit) : 0
    }
  } catch (error) {
    console.error(`Get ${type} error:`, error)
    return { success: false, error }
  }
}

// Get content by ID (manga or comics)
export async function getContentById(id: string): Promise<{ success: boolean; content: ContentMetadata | null; error?: any }> {
  try {
    const { data, error } = await supabasePublic
      .from('content')
      .select('*, view_count')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    // Process the data to extract character information from alternative_titles
    if (data && data.alternative_titles && Array.isArray(data.alternative_titles)) {
      // Extract character data from alternative_titles
      const characterEntries = data.alternative_titles.filter((title: string) => 
        typeof title === 'string' && title.startsWith('character:')
      );
      
      if (characterEntries.length > 0) {
        console.log(`Found ${characterEntries.length} characters in content data`);
        
        try {
          const characters = characterEntries.map((entry: string) => {
            // Extract the JSON part after "character:"
            const jsonStr = entry.substring(10); // 'character:'.length = 10
            return JSON.parse(jsonStr);
          });
          
          // Add characters array to the content data
          data.characters = characters;
          console.log(`Successfully extracted ${characters.length} characters`);
        } catch (err) {
          console.error('Error extracting characters from alternative_titles:', err);
          data.characters = []; // Set empty array on error
        }
      } else {
        data.characters = []; // Set empty array if no characters found
      }
      
      // Extract release date information
      const releaseYearEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('release_year:')
      );
      
      if (releaseYearEntry) {
        // Extract the year part after "release_year:"
        const year = parseInt(releaseYearEntry.substring(13), 10); // 'release_year:'.length = 13
        if (!isNaN(year)) {
          data.release_year = year;
          console.log(`Extracted release year: ${year}`);
        }
      }
      
      // Extract release month if present
      const releaseMonthEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('release_month:')
      );
      
      if (releaseMonthEntry) {
        // Extract the month part after "release_month:"
        const month = parseInt(releaseMonthEntry.substring(14), 10); // 'release_month:'.length = 14
        if (!isNaN(month) && month >= 1 && month <= 12) {
          data.release_month = month;
          console.log(`Extracted release month: ${month}`);
        }
      }
      
      // Extract release day if present
      const releaseDayEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('release_day:')
      );
      
      if (releaseDayEntry) {
        // Extract the day part after "release_day:"
        const day = parseInt(releaseDayEntry.substring(12), 10); // 'release_day:'.length = 12
        if (!isNaN(day) && day >= 1 && day <= 31) {
          data.release_day = day;
          console.log(`Extracted release day: ${day}`);
        }
      }
      
      // Extract georgian title if present
      const georgianTitleEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('georgian:')
      );
      
      if (georgianTitleEntry) {
        data.georgian_title = georgianTitleEntry.substring(9); // 'georgian:'.length = 9
      }
      
      // Extract publisher if present
      const publisherEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('publisher:')
      );
      
      if (publisherEntry) {
        data.publisher = publisherEntry.substring(10); // 'publisher:'.length = 10
        console.log(`Extracted publisher: ${data.publisher}`);
      }
    } else {
      data.characters = []; // Set empty array if no alternative_titles
    }
    
    // Fetch chapters based on content type (episodes removed)
    if (data && (data.type === 'manga' || data.type === 'comics')) {
      // Get chapters count from chapters table
      const { data: chapters, error: chaptersError } = await supabasePublic
        .from('chapters')
        .select('id, number', { count: 'exact' })
        .eq('content_id', id)
        .order('number', { ascending: false })
        .limit(1); // Just get the latest chapter to check the count
        
      if (!chaptersError && chapters && chapters.length > 0) {
        // Set the counts consistently
        data.chapters_count = chapters[0].number; // Assuming number is sequential
        
        // Add more detailed chapter data
        data.chapter_data = {
          total: chapters[0].number,
          latest: chapters[0].number,
          lastUpdated: new Date().toISOString()
        };
        
        console.log(`Found ${data.chapters_count} chapters for ${data.title}`);
      } else {
        // Fallback - check if chapters_count is already set from before
        if (!data.chapters_count) {
          data.chapters_count = 0;
        }
      }
    }

    // --- DEBUG: Log raw data from Supabase in getContentById ---
    console.log(`[getContentById - ${id}] Raw Supabase data:`, data ? { 
      id: data.id, 
      title: data.title,
      type: data.type,
      chapters_count: data.chapters_count,
      view_count: data.view_count
    } : 'No data');
    // -------------------------------------------------------

    return { success: true, content: data }
  } catch (error) {
    console.error('Get content error:', error)
    return { success: false, error, content: null }
  }
}

// Get content by genre (manga or comics)
export async function getContentByGenre(genre: string, type?: 'manga' | 'comics', limit = 20) {
  try {
    let query = supabasePublic
      .from('content')
      .select('*')
      .contains('genres', [genre])
      .order('rating', { ascending: false })
      .limit(limit)
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Get content by genre error:', error)
    return { success: false, error }
  }
}

// Get trending content (manga or comics)
export async function getTrendingContent(type?: 'manga' | 'comics', limit = 10) {
  try {
    let query = supabasePublic
      .from('content')
      .select('*, view_count')
      .order('view_count', { ascending: false })
      .limit(limit)
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Get trending content error:', error)
    return { success: false, error }
  }
}

// Create new content (manga or comics)
export async function createContent(contentData: any) {
  console.log("Creating content with data:", contentData);
  
  try {
    // Prepare database data object - we'll handle special fields that don't directly map to DB columns
    const alternative_titles = Array.isArray(contentData.alternative_titles) 
      ? [...contentData.alternative_titles] 
      : [];
    
    // Add georgian title to alternative_titles if provided
    if (contentData.georgian_title) {
      alternative_titles.push(`georgian:${contentData.georgian_title}`);
      console.log("Georgian title added to alternative_titles");
    }
    
    // Add publisher to alternative_titles if provided (for comics)
    if (contentData.publisher) {
      alternative_titles.push(`publisher:${contentData.publisher}`);
      console.log("Publisher added to alternative_titles");
    }
    
    // Process characters and add them to alternative_titles
    if (contentData.characters && Array.isArray(contentData.characters)) {
      console.log(`Processing ${contentData.characters.length} characters for storage`);

      contentData.characters.forEach((character: any) => {
        if (!character.name || !character.image) {
          console.warn(`Skipping character due to missing required fields:`, character);
          return;
        }
        
        const characterData = JSON.stringify({
          id: character.id || `char-${Math.random().toString(36).substring(2, 9)}`,
          name: character.name,
          image: character.image,
          role: character.role || 'SUPPORTING',
          age: character.age || '',
          gender: character.gender || ''
        });
        
        alternative_titles.push(`character:${characterData}`);
      });
      
      console.log(`Successfully added ${contentData.characters.length} characters to alternative_titles`);
    } else {
      console.log("No character data provided");
    }
    
    // Store release date information in alternative_titles if provided
    if (contentData.release_year) {
      // Make sure it's a number
      const year = parseInt(contentData.release_year.toString(), 10);
      if (!isNaN(year)) {
        // Store in a special format
        alternative_titles.push(`release_year:${year}`);
        console.log(`Added release year ${year} to alternative_titles`);
      }
    }
    
    // Handle release month if provided
    if (contentData.release_month) {
      const month = parseInt(contentData.release_month.toString(), 10);
      if (!isNaN(month) && month >= 1 && month <= 12) {
        alternative_titles.push(`release_month:${month}`);
      }
    }
    
    // Handle release day if provided
    if (contentData.release_day) {
      const day = parseInt(contentData.release_day.toString(), 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        alternative_titles.push(`release_day:${day}`);
      }
    }
    
    // Prepare final database content object
    const dbContent: any = {
      title: contentData.title,
      description: contentData.description || "",
      type: contentData.type || 'manga',
      status: contentData.status || 'ongoing',
      thumbnail: contentData.thumbnail,
      banner_image: contentData.bannerImage || contentData.thumbnail, 
      logo: contentData.logo || null,
      genres: contentData.genres || [],
      release_year: contentData.release_year ? parseInt(contentData.release_year.toString(), 10) : null,
      chapters_count: contentData.type === 'manga' || contentData.type === 'comics' ? 
                      (parseInt(contentData.chapters_count?.toString() || '0', 10) || 0) : 0,
      alternative_titles: alternative_titles,
      rating: contentData.rating,
      season: contentData.season,
      anilist_id: contentData.anilist_id,
      mal_id: contentData.mal_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Log the prepared data
    console.log("Prepared database data:", dbContent);
    
    // Insert into database
    const { data, error } = await supabase
      .from('content')
      .insert(dbContent)
      .select()
      .single();

    if (error) {
      console.error("Error creating content:", error);
      return { success: false, error: error.message };
    }

    console.log("Content created successfully:", data);
    return { success: true, content: data };
  } catch (error) {
    console.error("Unexpected error creating content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Update content (admin only)
export async function updateContent(id: string, contentData: any) {
  console.log(`[updateContent] Starting - ID: ${id}`);
  console.log(`[updateContent] Input data:`, JSON.stringify(contentData, null, 2));
  
  try {
    // First, get the existing content to handle alternative_titles properly
    console.log(`[updateContent] Fetching existing content with ID: ${id}`);
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error("[updateContent] Error fetching existing content:", fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!existingContent) {
      console.error("[updateContent] No existing content found with ID:", id);
      return { success: false, error: "Content not found" };
    }
    
    console.log("[updateContent] Existing content found:", existingContent.id);
    
    // Process alternative_titles to separate characters, release date, and other special entries
    const existingAltTitles = existingContent?.alternative_titles || [];
    const nonSpecialEntries = existingAltTitles.filter((title: string) => 
      !title.startsWith('character:') && 
      !title.startsWith('georgian:') && 
      !title.startsWith('release_year:') &&
      !title.startsWith('release_month:') &&
      !title.startsWith('release_day:') &&
      !title.startsWith('publisher:')
    );
    
    // Start with basic alternative_titles
    const updatedAltTitles = [...nonSpecialEntries];
    
    // Add georgian title if provided
    if (contentData.georgian_title) {
      updatedAltTitles.push(`georgian:${contentData.georgian_title}`);
      console.log("[updateContent] Added georgian title:", contentData.georgian_title);
    } else {
      // Try to preserve existing georgian title if any
      const existingGeorgianTitle = existingAltTitles.find((title: string) => 
        title.startsWith('georgian:')
      );
      if (existingGeorgianTitle) {
        updatedAltTitles.push(existingGeorgianTitle);
        console.log("[updateContent] Preserved existing georgian title");
      }
    }
    
    // Handle publisher field for comics
    if (contentData.publisher !== undefined) {
      if (contentData.publisher) {
        updatedAltTitles.push(`publisher:${contentData.publisher}`);
        console.log("[updateContent] Added publisher:", contentData.publisher);
      }
    } else {
      // Preserve existing publisher
      const existingPublisher = existingAltTitles.find((title: string) => 
        title.startsWith('publisher:')
      );
      if (existingPublisher) {
        updatedAltTitles.push(existingPublisher);
        console.log("[updateContent] Preserved existing publisher");
      }
    }
    
    // Process release date fields
    if (contentData.release_year !== undefined) {
      if (contentData.release_year) {
        const year = parseInt(contentData.release_year.toString(), 10);
        if (!isNaN(year)) {
          updatedAltTitles.push(`release_year:${year}`);
          console.log(`[updateContent] Updated release year to ${year}`);
        }
      }
    } else {
      // Preserve existing release year
      const existingReleaseYear = existingAltTitles.find((title: string) => 
        title.startsWith('release_year:')
      );
      if (existingReleaseYear) {
        updatedAltTitles.push(existingReleaseYear);
        console.log("[updateContent] Preserved existing release year");
      }
    }
    
    // Handle release month
    if (contentData.release_month !== undefined) {
      if (contentData.release_month) {
        const month = parseInt(contentData.release_month.toString(), 10);
        if (!isNaN(month) && month >= 1 && month <= 12) {
          updatedAltTitles.push(`release_month:${month}`);
          console.log(`[updateContent] Updated release month to ${month}`);
        }
      }
    } else {
      // Preserve existing release month
      const existingReleaseMonth = existingAltTitles.find((title: string) => 
        title.startsWith('release_month:')
      );
      if (existingReleaseMonth) {
        updatedAltTitles.push(existingReleaseMonth);
        console.log("[updateContent] Preserved existing release month");
      }
    }
    
    // Handle release day
    if (contentData.release_day !== undefined) {
      if (contentData.release_day) {
        const day = parseInt(contentData.release_day.toString(), 10);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          updatedAltTitles.push(`release_day:${day}`);
          console.log(`[updateContent] Updated release day to ${day}`);
        }
      }
    } else {
      // Preserve existing release day
      const existingReleaseDay = existingAltTitles.find((title: string) => 
        title.startsWith('release_day:')
      );
      if (existingReleaseDay) {
        updatedAltTitles.push(existingReleaseDay);
        console.log("[updateContent] Preserved existing release day");
      }
    }
    
    // Process characters and add them to alternative_titles
    if (contentData.characters && Array.isArray(contentData.characters)) {
      console.log(`[updateContent] Processing ${contentData.characters.length} characters for update`);
      
      contentData.characters.forEach((character: any, index: number) => {
        // Ensure character has all required fields
        if (!character.name || !character.image) {
          console.warn(`[updateContent] Skipping character at index ${index} due to missing required fields`);
          return;
        }
        
        try {
          const characterData = JSON.stringify({
            id: character.id || `char-${Math.random().toString(36).substring(2, 9)}`,
            name: character.name,
            image: character.image,
            role: character.role || 'SUPPORTING',
            age: character.age,
            gender: character.gender
          });
          
          updatedAltTitles.push(`character:${characterData}`);
          console.log(`[updateContent] Added character: ${character.name}`);
        } catch (error) {
          console.error(`[updateContent] Error processing character at index ${index}:`, error);
          // Continue processing other characters
        }
      });
      
      console.log(`[updateContent] Successfully added ${contentData.characters.length} characters to alternative_titles`);
    } else if (contentData.characters === undefined) {
      // If characters not provided in update, preserve existing character entries
      const existingCharacters = existingAltTitles.filter((title: string) => 
        title.startsWith('character:')
      );
      updatedAltTitles.push(...existingCharacters);
      console.log(`[updateContent] Preserved ${existingCharacters.length} existing characters`);
    } else {
      // If explicitly set to empty array, clear all characters
      console.log("[updateContent] Clearing all characters as empty array was provided");
    }
    
    // Prepare database update object, only include fields that are provided
    const dbContent: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only add fields that are actually provided
    if (contentData.title !== undefined) dbContent.title = contentData.title;
    if (contentData.description !== undefined) dbContent.description = contentData.description;
    if (contentData.type !== undefined) dbContent.type = contentData.type;
    if (contentData.status !== undefined) dbContent.status = contentData.status;
    if (contentData.thumbnail !== undefined) dbContent.thumbnail = contentData.thumbnail;
    if (contentData.bannerImage !== undefined) dbContent.banner_image = contentData.bannerImage || null;
    if (contentData.logo !== undefined) dbContent.logo = contentData.logo || null;
    if (contentData.genres !== undefined) dbContent.genres = contentData.genres;
    if (contentData.rating !== undefined) dbContent.rating = contentData.rating;
    if (contentData.season !== undefined) dbContent.season = contentData.season;
    if (contentData.anilist_id !== undefined) dbContent.anilist_id = contentData.anilist_id;
    if (contentData.mal_id !== undefined) dbContent.mal_id = contentData.mal_id;
    
    // Explicitly handle chapter and episode counts
    if (contentData.type === 'manga' || contentData.type === 'comics') {
      if (contentData.chapters_count !== undefined) {
        dbContent.chapters_count = parseInt(contentData.chapters_count.toString(), 10) || 0;
        console.log(`[updateContent] Setting chapters_count to ${dbContent.chapters_count}`);
      }
    }
    
    // Always update alternative_titles to manage characters
    dbContent.alternative_titles = updatedAltTitles;
    
    // Log the prepared data
    console.log("[updateContent] Prepared update data keys:", Object.keys(dbContent));
    
    // Update in database
    console.log(`[updateContent] Sending update request to Supabase for ID: ${id}`);
    try {
      const { data, error } = await supabase
        .from('content')
        .update(dbContent)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("[updateContent] Error updating content:", JSON.stringify(error, null, 2));
        return { success: false, error: error.message || "Update failed" };
      }

      if (!data) {
        console.error("[updateContent] No data returned after update");
        return { success: false, error: "No data returned from database" };
      }

      console.log("[updateContent] Content updated successfully:", data.id);
      return { success: true, content: data };
    } catch (supabaseError) {
      console.error("[updateContent] Supabase update error:", JSON.stringify(supabaseError, null, 2));
      return { 
        success: false, 
        error: supabaseError instanceof Error ? supabaseError.message : "Unknown Supabase update error"
      };
    }
  } catch (error) {
    console.error("[updateContent] Unexpected error:", JSON.stringify(error, null, 2));
    const errorMessage = error instanceof Error ? error.message : "Unknown error during update process";
    return { success: false, error: errorMessage };
  }
}

// Delete content (admin only)
export async function deleteContent(id: string) {
  try {
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Delete content error:', error)
    return { success: false, error }
  }
}

// Insert new options interface just before getChapters declaration
export interface GetChaptersOptions {
  includeEnglish?: boolean; // whether to include English chapters (MangaDex)
  limitEnglish?: number;   // page size for EN chapter fetch
  offsetEnglish?: number;  // pagination offset for EN fetch
  forceRefresh?: boolean;  // bypass cache
  includeGeorgian?: boolean; // whether to include Georgian chapters (local DB)
}

// Get chapters for manga
export async function getChapters(contentId: string, optionsOrForceRefresh: boolean | GetChaptersOptions = {}) {
  // ---------------------------------------------------------------------
  // Extract options (maintaining backward compatibility with old boolean)
  // ---------------------------------------------------------------------
  let includeEnglish   = true;
  let includeGeorgian  = true;
  let limitEnglish     = 500;
  let offsetEnglish    = 0;

  if (typeof optionsOrForceRefresh === 'object') {
    includeEnglish   = optionsOrForceRefresh.includeEnglish  ?? true;
    includeGeorgian  = optionsOrForceRefresh.includeGeorgian ?? true;
    limitEnglish     = optionsOrForceRefresh.limitEnglish    ?? 500;
    offsetEnglish    = optionsOrForceRefresh.offsetEnglish   ?? 0;
  }

  try {
    const chapters: any[] = [];

    // -------------------------------------------------------------------
    // Georgian chapters (local DB)
    // -------------------------------------------------------------------
    if (includeGeorgian) {
      const { data: geData, error: geError } = await supabasePublic
        .from('chapters')
        .select('*')
        .eq('content_id', contentId)
        .eq('language', 'ge')
        .order('number', { ascending: true });

      if (geError) throw geError;

      chapters.push(...(geData || []).map((ch: any) => ({
        ...ch,
        language: ch.language || 'ge',
      })));
    }

    // -------------------------------------------------------------------
    // English chapters (also in local DB) – supports pagination
    // -------------------------------------------------------------------
    if (includeEnglish) {
      const { data: enData, error: enError } = await supabasePublic
        .from('chapters')
        .select('*')
        .eq('content_id', contentId)
        .eq('language', 'en')
        .order('number', { ascending: true })
        .range(offsetEnglish, offsetEnglish + limitEnglish - 1);

      if (enError) throw enError;

      chapters.push(...(enData || []).map((ch: any) => ({
        ...ch,
        language: 'en',
      })));

      // -----------------------------------------------------------------
      // Fallback / Supplement: fetch from MangaDex API if available
      // -----------------------------------------------------------------
      // Only attempt remote fetch if we didn't get enough EN chapters from
      // the local DB for this page request.
      const fetchedLocalCount = enData ? enData.length : 0;

      if (fetchedLocalCount < limitEnglish) {
        // Retrieve MangaDex ID for this content
        const { data: mdMeta, error: mdErr } = await supabasePublic
          .from('content')
          .select('mangadex_id')
          .eq('id', contentId)
          .maybeSingle();

        if (!mdErr && mdMeta && mdMeta.mangadex_id) {
          const mdId = (mdMeta as any).mangadex_id as string;

          try {
            const url = `/api/mangadx/chapters?mangaId=${mdId}&limit=${limitEnglish}&offset=${offsetEnglish}`;
            const resp = await fetch(url);

            if (resp.ok) {
              const json = await resp.json();
              const mdChaps = json?.data?.data || [];

              chapters.push(
                ...mdChaps.map((item: any, idx: number) => {
                  // Attempt best-effort title extraction
                  let title = '';
                  const rawTitle = item.attributes.title;
                  if (typeof rawTitle === 'string') {
                    title = rawTitle.trim();
                  } else if (rawTitle && typeof rawTitle === 'object') {
                    const firstVal = Object.values(rawTitle)[0];
                    if (typeof firstVal === 'string') title = firstVal.trim();
                  }

                  if (!title) {
                    if (item.attributes.chapter) {
                      title = `Chapter ${item.attributes.chapter}`;
                    } else {
                      title = `Ch ${offsetEnglish + idx + 1}`;
                    }
                  }

                  return {
                    id: item.id,
                    number: parseFloat(item.attributes.chapter) || offsetEnglish + idx + 1,
                    title,
                    pages: [],
                    language: 'en',
                    external: true,
                    created_at: item.attributes.publishAt || null,
                    release_date: item.attributes.publishAt || null,
                  };
                })
              );
            }
          } catch (mdFetchErr) {
            console.error('[getChapters] MangaDex fetch failed:', mdFetchErr);
          }
        }
      }
    }

    // -------------------------------------------------------------------
    // Deduplicate & sort (by language-number key)
    // -------------------------------------------------------------------
    const deduped: Record<string, any> = {};
    chapters.forEach((c) => {
      const key = `${c.language}-${c.number}`;
      if (!deduped[key]) deduped[key] = c;
    });

    const merged = Object.values(deduped).sort((a: any, b: any) => {
      const numA = typeof a.number === 'number' ? a.number : parseFloat(a.number);
      const numB = typeof b.number === 'number' ? b.number : parseFloat(b.number);
      return numA - numB;
    });

    return { success: true, chapters: merged };
  } catch (error) {
    console.error('[getChapters] DB fetch error:', error);
    return { success: false, error };
  }
}

// Get chapter by number
export async function getChapterByNumber(contentId: string, chapterNumber: number) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('content_id', contentId)
      .eq('number', chapterNumber)
      .single()

    if (error) {
      throw error
    }

    return { success: true, chapter: data }
  } catch (error) {
    console.error('Get chapter error:', error)
    return { success: false, error }
  }
}

// Add chapter (admin only)
export async function addChapter(chapterData: Omit<Chapter, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        ...chapterData,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      throw error
    }
    
    // Update the content chapter count after adding a chapter
    if (data && data.length > 0) {
      const contentId = data[0].content_id;
      const contentType = 'manga'; // Assuming chapters are for manga
      
      // Update the content with the latest chapter count
      await updateContentCounts(contentId, contentType);
      console.log(`Updated manga chapter counts after adding chapter ${data[0].number}`);
    }

    return { success: true, chapter: data }
  } catch (error) {
    console.error('Add chapter error:', error)
    return { success: false, error }
  }
}

// Search content (manga or comics)
export async function searchContent(query: string, type?: 'manga' | 'comics', limit = 20) {
  try {
    let contentQuery = supabasePublic
      .from('content')
      .select('*, view_count')
      .or(`title.ilike.%${query}%, description.ilike.%${query}%`)
      .limit(limit)
    
    if (type) {
      contentQuery = contentQuery.eq('type', type)
    }
    
    const { data, error } = await contentQuery

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Search content error:', error)
    return { success: false, error }
  }
}

// Update content chapter/episode counts
export async function updateContentCounts(id: string, type: 'manga' | 'comics'): Promise<boolean> {
  try {
    let updates: any = {
      updated_at: new Date().toISOString()
    };
    
    // Check what we're updating based on content type
    if (type === 'manga' || type === 'comics') {
      // Get latest chapter info
      const { data: chapters, error: chaptersError } = await supabasePublic
        .from('chapters')
        .select('id, number', { count: 'exact' })
        .eq('content_id', id)
        .order('number', { ascending: false })
        .limit(1);
        
      if (!chaptersError && chapters && chapters.length > 0) {
        updates.chapters_count = chapters[0].number;
      }
    }
    
    // Only update if we have something to update
    if ((updates.chapters_count !== undefined)) {
      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', id);
        
      if (error) {
        console.error(`Error updating content counts for ${id}:`, error);
        return false;
      }
      
      console.log(`Updated content counts for ${id}:`, 
        updates.chapters_count !== undefined ? `chapters: ${updates.chapters_count}` : 'no updates');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error in updateContentCounts for ${id}:`, error);
    return false;
  }
}

// --- NEW FUNCTION ---
// Increment the view count for a specific content item
export async function incrementContentView(contentId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const response = await fetch('/api/content/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contentId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    console.log(`View count incremented for ${contentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { success: false, error };
  }
}
// --- END NEW FUNCTION --- 