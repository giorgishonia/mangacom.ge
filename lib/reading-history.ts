import { supabase } from '@/lib/supabase'

// Define types for reading history
export interface ReadingProgress {
  mangaId: string
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  currentPage: number
  totalPages: number
  lastRead: number // timestamp
  mangaTitle: string
  mangaThumbnail: string
}

// Define types for the total manga pages information
export interface MangaTotalPages {
  id: string;
  totalPages: number;
}

// Supabase table name for reading history (make sure this table exists with proper RLS)
const READING_HISTORY_TABLE = 'reading_history'

// Key for localStorage
const READING_HISTORY_KEY = "manganime-reading-history";


// Helper – get currently authenticated user (fast local token check first)
function getCurrentUserIdSync(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const json = localStorage.getItem('sb-access-token')
    if (!json) return null
    const { user } = JSON.parse(json)
    return user?.id ?? null
  } catch {
    return null
  }
}

async function getCurrentUserIdAsync(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * Upsert a reading-progress row to Supabase. Runs in the background – UI never awaits it.
 */
async function syncProgressToSupabase(progress: ReadingProgress): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No user session, skipping Supabase sync');
      }
      return;
    }

    // Skip syncing for external chapters (e.g., mangadex) that don't exist in
    // our local `chapters` table. This prevents foreign-key violations.
    if (!progress.chapterId || progress.chapterId.length !== 36) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Skipping Supabase sync for external chapter:', progress.chapterId);
      }
      return;
    }

    // Build a minimal payload to reduce chances of column errors
    const payload = {
      user_id: userId,
      manga_id: progress.mangaId,
      chapter_id: progress.chapterId,
      page: progress.currentPage,
      total_pages: progress.totalPages,
      updated_at: new Date().toISOString(),
      last_read: new Date(progress.lastRead).toISOString(),
    };

    // Add retry with exponential backoff
    let retries = 0;
    const maxRetries = 2; // Reduced retries for faster feedback
    
    while (retries < maxRetries) {
      try {
        const { error } = await supabase
          .from(READING_HISTORY_TABLE)
          .upsert(payload, { onConflict: 'user_id,manga_id,chapter_id' });

        if (!error) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Progress synced to Supabase successfully');
          }
          return; // Success
        }

        // Ignore specific expected errors silently
        if (error.code === '23503' || error.code === '409' || error.code === '42703') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Ignoring expected Supabase error:', error.code);
          }
          return; // Consider sync successful
        }

        // For other errors, retry
        throw error;
        
      } catch (error: any) {
        retries++;
        if (retries >= maxRetries) {
          throw error; // Final failure
        }
        
        // Exponential backoff: 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries - 1)));
      }
    }
  } catch (error) {
    // Log error but don't throw - this is fire-and-forget
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to sync progress to Supabase after retries:', error);
    }
  }
}

// Clean up duplicate manga entries (keep only the most advanced progress per manga)
function cleanupDuplicateEntries(history: ReadingProgress[]): ReadingProgress[] {
  const mangaMap = new Map<string, ReadingProgress>();
  
  for (const entry of history) {
    const existingEntry = mangaMap.get(entry.mangaId);
    
    if (!existingEntry) {
      // First entry for this manga
      mangaMap.set(entry.mangaId, entry);
    } else {
      // Compare progress and keep the more advanced one
      let shouldReplace = false;
      
      if (entry.chapterNumber > existingEntry.chapterNumber) {
        shouldReplace = true;
      } else if (entry.chapterNumber === existingEntry.chapterNumber && 
                 entry.currentPage > existingEntry.currentPage) {
        shouldReplace = true;
      } else if (entry.chapterNumber === existingEntry.chapterNumber && 
                 entry.currentPage === existingEntry.currentPage &&
                 entry.lastRead > existingEntry.lastRead) {
        // Same progress but more recent timestamp
        shouldReplace = true;
      }
      
      if (shouldReplace) {
        mangaMap.set(entry.mangaId, entry);
      }
    }
  }
  
  // Convert back to array and sort by lastRead (most recent first)
  return Array.from(mangaMap.values()).sort((a, b) => b.lastRead - a.lastRead);
}

// Get all reading history
export function getReadingHistory(): ReadingProgress[] {
  if (typeof window === "undefined") return [];
  
  try {
    const history = localStorage.getItem(READING_HISTORY_KEY);
    if (!history) return [];
    
    const parsedHistory = JSON.parse(history) as ReadingProgress[];
    
    // Check if we need to clean up duplicates
    const uniqueMangaIds = new Set(parsedHistory.map(item => item.mangaId));
    if (uniqueMangaIds.size < parsedHistory.length) {
      // We have duplicates, clean them up
      const cleanedHistory = cleanupDuplicateEntries(parsedHistory);
      
      // Save the cleaned history back to localStorage
      localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(cleanedHistory));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧹 Cleaned up reading history: ${parsedHistory.length} → ${cleanedHistory.length} entries`);
      }
      
      return cleanedHistory;
    }
    
    return parsedHistory;
  } catch (error) {
    console.error("Failed to get reading history:", error);
    return [];
  }
}

// Get reading progress for a specific manga
export function getMangaProgress(mangaId: string): ReadingProgress | undefined {
  return getReadingHistory().find(item => item.mangaId === mangaId);
}

// Get reading progress for a specific chapter
export function getChapterProgress(mangaId: string, chapterId: string): ReadingProgress | undefined {
  return getReadingHistory().find(
    item => item.mangaId === mangaId && item.chapterId === chapterId
  );
}

// Update reading progress
export function updateReadingProgress(progress: ReadingProgress): void {
  if (typeof window === "undefined") return;
  
  try {
    // Validate the progress data
    if (!progress.mangaId || !progress.chapterId || progress.currentPage < 0 || progress.totalPages <= 0) {
      console.warn("Invalid progress data:", progress);
      return;
    }

    // Ensure currentPage doesn't exceed totalPages
    const validatedProgress = {
      ...progress,
      currentPage: Math.min(progress.currentPage, progress.totalPages - 1),
    };

    const history = getReadingHistory();
    
    // Remove ALL existing entries for this manga (not just this chapter)
    const filteredHistory = history.filter(item => item.mangaId !== validatedProgress.mangaId);
    
    // Check if this is more advanced progress than what we currently have
    const existingMangaProgress = history.find(item => item.mangaId === validatedProgress.mangaId);
    
    let shouldUpdate = true;
    let finalProgress = validatedProgress;
    
    if (existingMangaProgress) {
      // Only update if this is further progress (higher chapter number, or same chapter with higher page)
      if (validatedProgress.chapterNumber < existingMangaProgress.chapterNumber) {
        shouldUpdate = false;
        // Keep existing progress but update thumbnail and title in case they changed
        finalProgress = {
          ...existingMangaProgress,
          mangaTitle: validatedProgress.mangaTitle, // Update title in case it changed
          mangaThumbnail: validatedProgress.mangaThumbnail, // Update thumbnail
          lastRead: Math.max(existingMangaProgress.lastRead, validatedProgress.lastRead) // Update to most recent timestamp
        };
      } else if (validatedProgress.chapterNumber === existingMangaProgress.chapterNumber && 
                 validatedProgress.currentPage < existingMangaProgress.currentPage) {
        shouldUpdate = false;
        // Keep existing progress but update thumbnail and title in case they changed
        finalProgress = {
          ...existingMangaProgress,
          mangaTitle: validatedProgress.mangaTitle, // Update title in case it changed
          mangaThumbnail: validatedProgress.mangaThumbnail, // Update thumbnail
          lastRead: Math.max(existingMangaProgress.lastRead, validatedProgress.lastRead) // Update to most recent timestamp
        };
      } else {
        // This is more advanced progress, use the new progress data
        finalProgress = validatedProgress;
      }
    }
    
    // Add the progress to the beginning (most recent) - always update to refresh metadata
    const updatedHistory = [finalProgress, ...filteredHistory];
    
    // Keep only the 50 most recent entries (one per manga)
    const limitedHistory = updatedHistory.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(limitedHistory));

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      if (shouldUpdate) {
        console.log(`📖 Reading progress updated: ${finalProgress.mangaTitle} - Chapter ${finalProgress.chapterNumber}, Page ${finalProgress.currentPage + 1}/${finalProgress.totalPages}`);
      } else {
        console.log(`📖 Progress not updated (not more advanced) but metadata refreshed: ${finalProgress.mangaTitle} - Chapter ${finalProgress.chapterNumber}, Page ${finalProgress.currentPage + 1}/${finalProgress.totalPages}`);
      }
    }

    // Fire-and-forget Supabase sync with improved error handling (only if progress was updated)
    if (shouldUpdate) {
      syncProgressToSupabase(finalProgress).catch(error => {
        // Silent fail for sync, but log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to sync progress to Supabase:', error);
        }
      });
    }
  } catch (error) {
    console.error("Failed to update reading history:", error);
  }
}

// Check if a manga has been read
export function hasMangaBeenRead(mangaId: string): boolean {
  return getReadingHistory().some(item => item.mangaId === mangaId);
}

// Get percentage read for a manga chapter
export function getReadPercentage(mangaId: string, chapterId: string): number {
  const progress = getChapterProgress(mangaId, chapterId);
  if (!progress) return 0;
  
  return Math.round((progress.currentPage / Math.max(1, progress.totalPages)) * 100);
}

// Get recently read manga
export function getRecentlyRead(limit: number = 10): ReadingProgress[] {
  return getReadingHistory().slice(0, limit);
}

// Clear reading history
export function clearReadingHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(READING_HISTORY_KEY);

  // Also clear from Supabase in the background (best-effort)
  (async () => {
    const userId = await getCurrentUserIdAsync();
    if (!userId) return;
    const { error } = await supabase
      .from(READING_HISTORY_TABLE)
      .delete()
      .eq('user_id', userId);
    if (error) {
      console.error('Failed to clear reading history in Supabase:', error);
    }
  })();
}

// Mark a manga chapter as read
export function markChapterAsRead(
  mangaId: string,
  chapterId: string,
  chapterNumber: number,
  chapterTitle: string,
  mangaTitle: string,
  mangaThumbnail: string,
  totalPages: number
): void {
  const progress: ReadingProgress = {
    mangaId,
    chapterId,
    chapterNumber,
    chapterTitle,
    currentPage: totalPages, // Mark as fully read
    totalPages,
    lastRead: Date.now(),
    mangaTitle,
    mangaThumbnail
  };
  
  updateReadingProgress(progress);
}

// Get total manga progress - returns percentage of entire manga read
export function getMangaTotalProgress(mangaId: string, chapterList: any[]): number {
  if (!mangaId || !chapterList || chapterList.length === 0) return 0;
  
  try {
    // Calculate total pages in the manga
    const totalMangaPages = chapterList.reduce((sum, chapter) => {
      // Get the number of pages in this chapter
      const pageCount = Array.isArray(chapter.pages) ? chapter.pages.length : 0;
      return sum + pageCount;
    }, 0);
    
    if (totalMangaPages === 0) return 0;
    
    // Get all reading history
    const history = getReadingHistory();
    
    // Filter to only this manga's entries
    const mangaEntries = history.filter(item => item.mangaId === mangaId);
    
    if (mangaEntries.length === 0) return 0;

    // Find the furthest read chapter (use the first entry as initial value to satisfy TS types)
    const latestEntry = mangaEntries.reduce<ReadingProgress>((latest, entry) => {
      // Compare chapter numbers
      if (entry.chapterNumber > latest.chapterNumber) return entry;
      if (entry.chapterNumber < latest.chapterNumber) return latest;
      
      // If same chapter, compare page progress
      return entry.currentPage > latest.currentPage ? entry : latest;
    }, mangaEntries[0]);
    
    if (!latestEntry) return 0;
    
    // Count pages in all chapters up to the current chapter
    let readPages = 0;
    
    for (let i = 0; i < chapterList.length; i++) {
      const chapter = chapterList[i];
      const chapterNumber = chapter.number;
      const chapterPages = Array.isArray(chapter.pages) ? chapter.pages.length : 0;
      
      if (chapterNumber < latestEntry.chapterNumber) {
        // Add all pages from fully read chapters
        readPages += chapterPages;
      } else if (chapterNumber === latestEntry.chapterNumber) {
        // Add only read pages from current chapter
        readPages += Math.min(latestEntry.currentPage, chapterPages);
        break;
      } else {
        // Stop counting once we reach chapters beyond the current one
        break;
      }
    }
    
    // Calculate and return percentage
    return Math.round((readPages / totalMangaPages) * 100);
  } catch (error) {
    console.error("Error calculating total manga progress:", error);
    return 0;
  }
}

// Calculate manga progress based on chapter numbers (when we don't have all pages info)
export function calculateMangaProgressByChapter(
  readChapter: number,
  totalChapters: number
): number {
  if (!readChapter || !totalChapters || totalChapters <= 0) return 0;
  
  // Calculate percentage of chapters read
  const percentage = Math.floor((readChapter / totalChapters) * 100);
  
  // Ensure percentage is between 0 and 100
  return Math.max(0, Math.min(100, percentage));
}

// Get manga chapter progress - returns the latest chapter read
export function getLatestChapterRead(mangaId: string): number {
  if (typeof window === "undefined" || !mangaId) return 0;
  
  try {
    const history = getReadingHistory();
    
    // Find all entries for this manga
    const mangaEntries = history.filter(item => item.mangaId === mangaId);
    
    if (mangaEntries.length === 0) return 0;
    
    // Find the highest chapter number
    const latestChapter = mangaEntries.reduce((highest, entry) => {
      return Math.max(highest, entry.chapterNumber);
    }, 0);
    
    return latestChapter;
  } catch (error) {
    console.error("Failed to get latest chapter read:", error);
    return 0;
  }
} 