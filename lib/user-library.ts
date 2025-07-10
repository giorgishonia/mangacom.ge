// Types for user library management
import { supabase } from './supabase';
import { toast } from '@/components/ui/use-toast';

// Define the type for media status
export type MediaStatus = 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read' | null;

// Define the type for media type - REMOVE 'anime'
export type MediaType = 'manga' | 'comics';

export interface LibraryItem {
  id: string;
  type: MediaType;
  title: string;
  thumbnail: string;
  status: MediaStatus;
  progress: number; // Chapter number
  totalItems?: number; // Total chapters
  score?: number; // User rating (1-10)
  startDate?: number; // Timestamp
  finishDate?: number; // Timestamp
  lastUpdated: number; // Timestamp
}

// LocalStorage keys (used as fallback when offline or not logged in)
const USER_LIBRARY_KEY = 'manganime-user-library';

// Helper to get current Supabase user id (supports async)
async function getCurrentUserIdAsync(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// Legacy sync helper (falls back to localStorage token decode if needed). May return null quickly.
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const json = localStorage.getItem('sb-access-token');
  if (!json) return null;
  try {
    const { user } = JSON.parse(json);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// Get all items in user's library (combines Supabase and localStorage)
export async function getUserLibrary(): Promise<LibraryItem[]> {
  const userId = getCurrentUserId();

  // If not logged in or running on server side, use localStorage only
  if (!userId || typeof window === 'undefined') {
    return getLocalLibrary();
  }
  
  try {
    // Get data from Supabase
    const { data, error } = await supabase
      .from('watchlist')
      .select('*, content(*)')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to get watchlist from Supabase:', error);
      return getLocalLibrary(); // Fallback to localStorage if Supabase fails
    }
    
    // Convert Supabase watchlist format to LibraryItem format
    const libraryItems: LibraryItem[] = data.map(item => ({
      id: item.content_id,
      type: item.content_type as MediaType,
      title: item.content?.title || 'Unknown',
      thumbnail: item.content?.thumbnail || '',
      status: mapStatusFromServer(item.status),
      progress: item.progress || 0,
      totalItems: item.content?.chapters_count, // Only chapters_count is needed now
      score: item.rating,
      startDate: item.started_at ? new Date(item.started_at).getTime() : undefined,
      finishDate: item.finished_at ? new Date(item.finished_at).getTime() : undefined,
      lastUpdated: item.updated_at ? new Date(item.updated_at).getTime() : Date.now()
    }));
    
    // Get local items too and merge them (for items not yet synced)
    const localItems = getLocalLibrary();
    const serverIds = new Set(libraryItems.map(item => `${item.id}-${item.type}`));
    
    // Add local items that aren't on the server yet
    const unsyncdLocalItems = localItems.filter(
      item => !serverIds.has(`${item.id}-${item.type}`)
    );
    
    if (unsyncdLocalItems.length > 0) {
      console.log(`Found ${unsyncdLocalItems.length} items in localStorage that need syncing to server`);
      // Sync these items to server
      for (const item of unsyncdLocalItems) {
        syncItemToServer(item);
      }
      
      // Include these items in the result
      libraryItems.push(...unsyncdLocalItems);
    }
    
    return libraryItems;
  } catch (error) {
    console.error('Error fetching user library:', error);
    return getLocalLibrary(); // Fallback to localStorage
  }
}

// Helper function to get library from localStorage
function getLocalLibrary(): LibraryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const library = localStorage.getItem(USER_LIBRARY_KEY);
    return library ? JSON.parse(library) : [];
  } catch (error) {
    console.error('Failed to get user library from localStorage:', error);
    return [];
  }
}

// Helper function to map status from server format to client format
function mapStatusFromServer(serverStatus: string): MediaStatus {
  const statusMap: Record<string, MediaStatus> = {
    // Removed 'watching' and 'plan_to_watch' mappings as they are no longer valid client statuses
    'completed': 'completed',
    'on_hold': 'on_hold',
    'dropped': 'dropped',
    'reading': 'reading',
    'plan_to_read': 'plan_to_read'
  };
  
  // Default to 'plan_to_read' if server status is not recognized (e.g., old 'watching' status)
  return statusMap[serverStatus] || 'plan_to_read';
}

// Helper function to map status from client format to server format
function mapStatusToServer(status: MediaStatus, type: MediaType): string {
  if (!status) return 'plan_to_read';
  const statusMap: Record<Exclude<MediaStatus, null>, string> = {
    reading: 'reading',
    completed: 'completed',
    on_hold: 'on_hold',
    dropped: 'dropped',
    plan_to_read: 'plan_to_read',
  };
  return statusMap[status] ?? 'plan_to_read';
}

// Helper function to sync an item from localStorage to server
async function syncItemToServer(item: LibraryItem): Promise<boolean> {
  const userId = await getCurrentUserIdAsync();
  if (!userId) return false;
  
  try {
    // Handle statuses
    const { error } = await supabase
      .from('watchlist')
      .upsert({
        user_id: userId,
        content_id: item.id,
        content_type: item.type,
        status: mapStatusToServer(item.status, item.type),
        progress: item.progress,
        rating: item.score,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,content_id,content_type' });
    
    if (error) {
      console.error('Failed to sync library item to server:', JSON.stringify(error));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing item to server:', error);
    return false;
  }
}

// Get items filtered by type and/or status
export async function getLibraryItems(type?: MediaType, status?: MediaStatus): Promise<LibraryItem[]> {
  const library = await getUserLibrary();
  
  return library.filter(item => {
    if (type && item.type !== type) return false;
    if (status && item.status !== status) return false;
    return true;
  });
}

// Get a specific item from library
export async function getLibraryItem(id: string, type: MediaType): Promise<LibraryItem | undefined> {
  // First check faster localStorage
  const localItem = getLocalLibrary().find(item => item.id === id && item.type === type);
  if (localItem) return localItem;
  
  // If not found locally, check server
  const items = await getUserLibrary();
  return items.find(item => item.id === id && item.type === type);
}

// Synchronous version that only checks localStorage (for immediate UI feedback)
export function getLibraryItemSync(id: string, type: MediaType): LibraryItem | undefined {
  return getLocalLibrary().find(item => item.id === id && item.type === type);
}

// Check if an item exists in library
export async function isInLibrary(id: string, type: MediaType): Promise<boolean> {
  // First check faster localStorage
  const inLocalLibrary = getLocalLibrary().some(item => item.id === id && item.type === type);
  if (inLocalLibrary) return true;
  
  // If not found locally, check server
  const items = await getUserLibrary();
  return items.some(item => item.id === id && item.type === type);
}

// Synchronous version that only checks localStorage (for immediate UI feedback)
export function isInLibrarySync(id: string, type: MediaType): boolean {
  return getLocalLibrary().some(item => item.id === id && item.type === type);
}

// Check if an item has a specific status
export async function hasStatus(id: string, type: MediaType, status: MediaStatus): Promise<boolean> {
  const item = await getLibraryItem(id, type);
  return item ? item.status === status : false;
}

// Synchronous version that only checks localStorage (for immediate UI feedback)
export function hasStatusSync(id: string, type: MediaType, status: MediaStatus): boolean {
  const item = getLibraryItemSync(id, type);
  return item ? item.status === status : false;
}

// Add or update item in library
export async function updateLibraryItem(item: LibraryItem): Promise<void> {
  // Update localStorage first for immediate feedback
  updateLocalLibraryItem(item);
  
  // Then update server if user is logged in
  const userId = await getCurrentUserIdAsync();
  if (!userId) return;
  
  try {
    await syncItemToServer(item);
  } catch (error) {
    console.error('Failed to update server library item:', error);
    toast({
      title: "Sync Error",
      description: "Failed to sync with server. Changes saved locally.",
      duration: 3000,
    });
  }
}

// Helper function to update item in localStorage
function updateLocalLibraryItem(item: LibraryItem): void {
  if (typeof window === 'undefined') return;
  
  try {
    const library = getLocalLibrary();
    const existingIndex = library.findIndex(
      existing => existing.id === item.id && existing.type === item.type
    );
    
    // Update lastUpdated timestamp
    const updatedItem = {
      ...item,
      lastUpdated: Date.now()
    };
    
    let updatedLibrary;
    if (existingIndex >= 0) {
      // Update existing item
      updatedLibrary = [
        ...library.slice(0, existingIndex),
        updatedItem,
        ...library.slice(existingIndex + 1)
      ];
    } else {
      // Add new item to beginning
      updatedLibrary = [updatedItem, ...library];
    }
    
    localStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error('Failed to update local library item:', error);
  }
}

// Remove item from library
export async function removeFromLibrary(id: string, type: MediaType): Promise<void> {
  removeFromLocalLibrary(id, type);
  
  const userId = await getCurrentUserIdAsync();
  if (!userId) return;
  
  try {
    // Remove from watchlist
    const { error: watchlistError } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('content_id', id)
      .eq('content_type', type);
      
    if (watchlistError) {
      console.error('Failed to remove watchlist item from server:', watchlistError);
      toast({
        title: "Sync Error",
        description: "Failed to remove from server. Removed locally.",
        duration: 3000,
      });
    }
  } catch (error) {
    console.error('Failed to remove library item from server:', error);
  }
}

// Helper function to remove from localStorage
function removeFromLocalLibrary(id: string, type: MediaType): void {
  if (typeof window === 'undefined') return;
  
  try {
    const library = getLocalLibrary();
    const updatedLibrary = library.filter(
      item => !(item.id === id && item.type === type)
    );
    
    localStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error('Failed to remove library item from localStorage:', error);
  }
}

// Update item status
export async function updateItemStatus(
  id: string, 
  type: MediaType, 
  status: MediaStatus, 
  title: string, 
  thumbnail: string,
  progress: number = 0,
  totalItems?: number,
  score?: number
): Promise<void> {
  const existingItem = await getLibraryItem(id, type);
  
  await updateLibraryItem({
    id,
    type,
    title,
    thumbnail,
    status,
    progress: existingItem?.progress || progress,
    totalItems: totalItems || existingItem?.totalItems,
    score: score || existingItem?.score,
    startDate: existingItem?.startDate || (status === 'reading' ? Date.now() : undefined),
    finishDate: existingItem?.finishDate || (status === 'completed' ? Date.now() : undefined),
    lastUpdated: Date.now()
  });
}

// Get library statistics
export async function getLibraryStats(type: MediaType): Promise<{
  total: number;
  reading: number;
  completed: number;
  onHold: number;
  dropped: number;
  planToRead: number;
}> {
  const library = await getLibraryItems(type);
  
  let reading = 0;
  let completed = 0;
  let onHold = 0;
  let dropped = 0;
  let planToRead = 0;
  
  for (const item of library) {
    if (item.status === 'reading') reading++;
    else if (item.status === 'completed') completed++;
    else if (item.status === 'on_hold') onHold++;
    else if (item.status === 'dropped') dropped++;
    else if (item.status === 'plan_to_read') planToRead++;
  }
  
  return {
    total: library.length,
    reading,
    completed,
    onHold,
    dropped,
    planToRead,
  };
}

// Update progress for an item
export async function updateProgress(id: string, type: MediaType, progress: number): Promise<void> {
  const item = await getLibraryItem(id, type);
  
  if (item) {
    await updateLibraryItem({
      ...item,
      progress,
      // If progress is set to total items, mark as completed
      status: progress > 0 && item.totalItems && progress >= item.totalItems 
        ? 'completed' 
        : (item.status === 'plan_to_read' ? 'reading' : item.status)
    });
  }
}

// Update score for an item
export async function updateScore(id: string, type: MediaType, score: number): Promise<void> {
  const item = await getLibraryItem(id, type);
  
  if (item) {
    await updateLibraryItem({
      ...item,
      score
    });
  }
}

// Sync all localStorage items to server
export async function syncAllToServer(): Promise<number> {
  const userId = await getCurrentUserIdAsync();
  if (!userId) return 0;
  
  const localItems = getLocalLibrary();
  if (localItems.length === 0) return 0;
  
  let syncedCount = 0;
  
  for (const item of localItems) {
    const success = await syncItemToServer(item);
    if (success) syncedCount++;
  }
  
  console.log(`Synced ${syncedCount} of ${localItems.length} items to server`);
  
  if (syncedCount > 0) {
    toast({
      title: "Sync Complete",
      description: `Synced ${syncedCount} items to your account`,
      duration: 3000,
    });
  }
  
  return syncedCount;
} 