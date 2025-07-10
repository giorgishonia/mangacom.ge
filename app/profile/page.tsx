"use client"
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type React from "react"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  LogOut,
  Menu,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings,
  Star,
  Trash2,
  TrendingUp,
  X,
  Save,
  User2,
  MapPin as MapPinIcon,
  Cake as CakeIcon,
  Upload as UploadIcon,
  Crown as CrownIcon,
  Book,
  History,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ImageSkeleton } from "@/components/image-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { getUserProfile, getUserWatchlist, updateProfile, refreshSession } from "@/lib/auth"
import { useAuth } from "@/components/supabase-auth-provider"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { format, differenceInYears, parseISO } from "date-fns"
import { AvatarUploader } from "./components/avatar-uploader"
import { getLibraryItems, MediaStatus, removeFromLibrary } from '@/lib/user-library'
import { ProfileForm } from '@/components/settings/profile-form'
import { BannerUploader } from "@/components/profile/banner-uploader"
import { VIPBadge } from "@/components/ui/vip-badge"
import { AdBanner } from "@/components/ads/ad-banner"
import { supabase as supabaseClient } from '@/lib/supabase'
import { getRecentlyRead, ReadingProgress } from '@/lib/reading-history'
import TopListSection from '@/components/profile/top-list-section'
import FavoriteCharactersSection from '@/components/profile/favorite-characters-section'
import { StatusSelector } from "@/components/ui/status-selector"

// Interface for content item
interface ContentItem {
  id: string;
  type: 'manga' | 'comics';
  title: string; // English title
  georgianTitle: string; // Georgian title
  image: string;
  progress: number;
  total: number | null;
  score: number | null;
  status: MediaStatus;
}

// Interface for activity item
interface ActivityItem {
  id: string;
  type: 'manga' | 'comics';
  action: string;
  contentTitle: string;
  details: string;
  timestamp: string;
}

// Function to calculate age
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  try {
    const date = parseISO(birthDate); // Parse ISO string (e.g., yyyy-MM-dd)
    return differenceInYears(new Date(), date);
  } catch (e) {
    console.error("Error parsing birth date:", e);
    return null;
  }
}

// Compute stats helper (shared)
function computeStats(items: any[]): {
  reading: number;
  completed: number;
  onHold: number;
  dropped: number;
  planToRead: number;
  totalEntries: number;
} {
  let reading = 0,
      completed = 0,
      onHold = 0,
      dropped = 0,
      plan = 0;
  items.forEach((it) => {
    switch (it.status) {
      case 'reading':
        reading++;
        break;
      case 'completed':
        completed++;
        break;
      case 'on_hold':
        onHold++;
        break;
      case 'dropped':
        dropped++;
        break;
      case 'plan_to_read':
        plan++;
        break;
      default:
        break;
    }
  });
  return {
    reading,
    completed,
    onHold,
    dropped,
    planToRead: plan,
    totalEntries: items.length,
  };
}

// Helper to ensure unique activities (no duplicate keys in render)
function deduplicateActivities(list: ActivityItem[]): ActivityItem[] {
  const seen = new Set<string>()
  const result: ActivityItem[] = []
  for (const item of list) {
    const key = `${item.id}-${item.timestamp}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}

export default function ProfilePage() {
  const [activeMangaTab, setActiveMangaTab] = useState("reading")
  const [isLoading, setIsLoading] = useState(true)
  const [mangaReading, setMangaReading] = useState<ContentItem[]>([])
  const [mangaCompleted, setMangaCompleted] = useState<ContentItem[]>([])
  const [mangaPlanToRead, setMangaPlanToRead] = useState<ContentItem[]>([])
  const [mangaOnHold, setMangaOnHold] = useState<ContentItem[]>([])
  const [mangaDropped, setMangaDropped] = useState<ContentItem[]>([])
  const [comicsReading, setComicsReading] = useState<ContentItem[]>([])
  const [comicsCompleted, setComicsCompleted] = useState<ContentItem[]>([])
  const [comicsPlanToRead, setComicsPlanToRead] = useState<ContentItem[]>([])
  const [comicsOnHold, setComicsOnHold] = useState<ContentItem[]>([])
  const [comicsDropped, setComicsDropped] = useState<ContentItem[]>([])
  const [stats, setStats] = useState({
    manga: {
      reading: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToRead: 0,
      totalChapters: 0,
      daysRead: 0,
      meanScore: 0,
    },
    comics: {
      reading: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToRead: 0,
      totalChapters: 0,
      daysRead: 0,
      meanScore: 0,
    },
  })
  const router = useRouter()
  const { user, profile, isLoading: authLoading, isProfileLoading, session } = useAuth()
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [showBannerUpload, setShowBannerUpload] = useState(false)
  const [profileBanner, setProfileBanner] = useState<string | null>(null)
  const [recentReads, setRecentReads] = useState<ReadingProgress[]>([])
  
  // Define isOwnProfile variable - determines if the user is viewing their own profile
  const isOwnProfile = !!user && !!profile // Currently only showing the logged-in user's profile

  useEffect(() => {
    // Determine loading state based on auth and profile loading
    const pageIsLoading = authLoading || isProfileLoading;
    setIsLoading(pageIsLoading);

    if (!authLoading && !user) {
        router.push('/login');
        return; // Exit early if not authenticated
    }

    // Load watchlist and activities only when user and profile are loaded
    async function loadSecondaryData() {
        if (!user || !profile) return;

        try {
            // Sync any local library items first so watchlist is fresh
            await (await import('@/lib/user-library')).syncAllToServer();

            // Get manga watchlist
            const mangaWatchlistResult = await getUserWatchlist(user.id, 'manga')
            if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
                const readingManga: ContentItem[] = []
                const completedManga: ContentItem[] = []
                const planToReadManga: ContentItem[] = []
                const onHoldManga: ContentItem[] = []
                const droppedManga: ContentItem[] = []

                mangaWatchlistResult.watchlist.forEach(wl => {
                  const c = wl.content || {};

                  const georgianTitle = (c.georgian_title && typeof c.georgian_title === 'string' && c.georgian_title.trim() !== '')
                    ? c.georgian_title
                    : (Array.isArray(c.alternative_titles)
                        ? (() => {
                            const geoEntry = c.alternative_titles.find((t: any) => typeof t === 'string' && t.startsWith('georgian:'));
                            return geoEntry ? geoEntry.substring(9) : null;
                          })()
                        : null);
                  
                  const contentItem: ContentItem = {
                    id: c.id ?? wl.content_id,
                    type: 'manga',
                    title: c.title ?? 'Unknown',
                    georgianTitle: georgianTitle || c.title || 'Unknown',
                    image: c.thumbnail || '/placeholder.svg',
                    progress: wl.progress || 0,
                    total: c.chapters_count ?? null,
                    score: wl.rating ?? null,
                    status: wl.status as MediaStatus,
                  };

                  switch (wl.status) {
                    case 'reading':
                      readingManga.push(contentItem);
                      break;
                    case 'completed':
                      completedManga.push(contentItem);
                      break;
                    case 'plan_to_read':
                      planToReadManga.push(contentItem);
                      break;
                    case 'on_hold':
                      onHoldManga.push(contentItem);
                      break;
                    case 'dropped':
                      droppedManga.push(contentItem);
                      break;
                  }
                });

                setMangaReading(readingManga)
                setMangaCompleted(completedManga)
                setMangaPlanToRead(planToReadManga)
                setMangaOnHold(onHoldManga)
                setMangaDropped(droppedManga)

                // Compute stats accurately
                const statData = computeStats(mangaWatchlistResult.watchlist)
                setStats(prev => ({
                  ...prev,                                     // keep both slices
                  manga: {
                    ...prev.manga,
                    reading: statData.reading,
                    completed: statData.completed,
                    onHold: statData.onHold,
                    dropped: statData.dropped,
                    planToRead: statData.planToRead,
                  },
                }))

                /* ------------------------------------------------------------------
                   Build recent activity feed if DB table is empty
                ------------------------------------------------------------------ */
                if (activities.length === 0) {
                  const recentActs: ActivityItem[] = mangaWatchlistResult.watchlist
                    .sort((a: any,b: any)=> new Date(b.updated_at||b.created_at||'').getTime() - new Date(a.updated_at||a.created_at||'').getTime())
                    .slice(0,10)
                    .map((it: any) => {
                      const c = it.content || {};
                      let action = 'განახლება';
                      if (it.status === 'reading') action = 'კითხულობს';
                      else if (it.status === 'completed') action = 'დაასრულა';
                      else if (it.status === 'plan_to_read') action = 'დაამატა სიაში';

                      return {
                        id: it.id,
                        type: 'manga',
                        action,
                        contentTitle: c.georgian_title || c.title || 'Untitled',
                        details: it.progress ? `${it.progress} თავი` : '',
                        timestamp: it.updated_at || it.created_at || new Date().toISOString(),
                      } as ActivityItem;
                    });
                  setActivities(deduplicateActivities(recentActs));
                }

            } else if (mangaWatchlistResult.error) {
               console.error("Error fetching manga watchlist:", mangaWatchlistResult.error)
               toast.error("მანგას სიის ჩატვირთვა ვერ მოხერხდა")
            }
        } catch (mangaError) {
           console.error("Failed to load manga data:", mangaError)
           toast.error("მანგას მონაცემების ჩატვირთვა ვერ მოხერხდა")
        }
        
        // Removed anime watchlist fetching

        // Load localStorage items only if user is available
        if (user) {
             try {
                // Get localStorage manga items...
                const localMangaItems = await getLibraryItems('manga');
                // ... (existing local manga processing logic)
            } catch (localStorageError) {
                console.error('Error loading localStorage items:', localStorageError);
            }
            // Removed localAnimeItems fetching
        }

         // Load user activities...
        if (user) {
            try {
               const { data: activityData, error: activityError } = await supabase
                .from('user_activity')
                .select('*')
                .eq('user_id', user.id)
                .order('timestamp', { ascending: false })
                .limit(10);

              if (activityError) {
                // If table is missing, silently skip; otherwise log
                if (activityError.code === '42P01' || activityError.message?.includes('does not exist')) {
                  console.warn('Activity table not found – skipping activity fetch.');
                } else {
                  throw activityError;
                }
              } else {
                setActivities(deduplicateActivities(activityData as ActivityItem[]));
              }
            } catch (activityError) {
                console.error("Failed to load activity data:", activityError);
            }
        }

        /* -------------------- Comics Watchlist -------------------- */
        const comicsWatchlistResult = await getUserWatchlist(user.id, 'comics');
        if (comicsWatchlistResult.success && comicsWatchlistResult.watchlist) {
          const readingComics: ContentItem[] = [];
          const completedComics: ContentItem[] = [];
          const planToReadComics: ContentItem[] = [];
          const onHoldComics: ContentItem[] = []
          const droppedComics: ContentItem[] = []

          comicsWatchlistResult.watchlist.forEach(wl => {
            const c = wl.content || {};

            const georgianTitle = (c.georgian_title && typeof c.georgian_title === 'string' && c.georgian_title.trim() !== '')
              ? c.georgian_title
              : (Array.isArray(c.alternative_titles)
                  ? (() => {
                      const geoEntry = c.alternative_titles.find((t: any) => typeof t === 'string' && t.startsWith('georgian:'));
                      return geoEntry ? geoEntry.substring(9) : null;
                    })()
                  : null);

            const contentItem: ContentItem = {
              id: c.id ?? wl.content_id,
              type: 'comics',
              title: c.title ?? 'Unknown',
              georgianTitle: georgianTitle || c.title || 'Unknown',
              image: c.thumbnail || '/placeholder.svg',
              progress: wl.progress || 0,
              total: c.chapters_count ?? null,
              score: wl.rating ?? null,
              status: wl.status as MediaStatus,
            };
            
            switch (wl.status) {
                case 'reading':
                    readingComics.push(contentItem);
                    break;
                case 'completed':
                    completedComics.push(contentItem);
                    break;
                case 'plan_to_read':
                    planToReadComics.push(contentItem);
                    break;
                case 'on_hold':
                    onHoldComics.push(contentItem);
                    break;
                case 'dropped':
                    droppedComics.push(contentItem);
                    break;
            }
          });
          
          setComicsReading(readingComics);
          setComicsCompleted(completedComics);
          setComicsPlanToRead(planToReadComics);
          setComicsOnHold(onHoldComics);
          setComicsDropped(droppedComics);

          const comicsStats = computeStats(comicsWatchlistResult.watchlist);
          setStats(prev => ({
            ...prev,
            comics: {
              ...prev.comics,
              reading: comicsStats.reading,
              completed: comicsStats.completed,
              onHold: comicsStats.onHold,
              dropped: comicsStats.dropped,
              planToRead: comicsStats.planToRead,
              totalChapters: prev.comics.totalChapters,
            }
          }));

          // extend fallback activity list
          if (activities.length === 0) {
            const recentC = comicsWatchlistResult.watchlist.sort((a:any,b:any)=> new Date(b.updated_at||'').getTime()-new Date(a.updated_at||'').getTime()).slice(0,5).map((it:any)=>{
              const c=it.content||{};return {id:it.id,type:'comics',action:it.status==='reading'?'კითხულობს':it.status==='completed'?'დაასრულა':'დაამატა',contentTitle:c.georgian_title||c.title||'Untitled',details:it.progress?`${it.progress} თავი`:'' ,timestamp:it.updated_at||new Date().toISOString()} as ActivityItem});
            setActivities(deduplicateActivities([...activities, ...recentC]).slice(0,10));
          }
        }
    }

    if (user && profile) {
        loadSecondaryData();
    }

  }, [user, profile, authLoading, isProfileLoading, router]) // Dependencies

  useEffect(() => {
    // Fetch profile banner if user is VIP
    async function fetchProfileBanner() {
      if (!user || !profile || !profile.vip_status) return;
      
      try {
        const { data, error } = await supabase
          .from('user_banners')
          .select('banner_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
          console.error("Error fetching banner:", error);
        }
        
        if (data) {
          setProfileBanner(data.banner_url);
        }
      } catch (err) {
        console.error("Failed to fetch profile banner:", err);
      }
    }
    
    if (user && profile) {
      fetchProfileBanner();
    }
  }, [user, profile]);
  
  // Handle banner update
  const handleBannerUpdate = (url: string) => {
    setProfileBanner(url);
  };

  // Helper function to format date
  function getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    // Note: Add Georgian localization or use a library for better i18n
    if (diffInSeconds < 60) return `${diffInSeconds} წამის წინ`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} წუთის წინ`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} საათის წინ`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} დღის წინ`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} კვირის წინ`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} თვის წინ`
    return `${Math.floor(diffInSeconds / 31536000)} წლის წინ`
  }

  const handleRefreshSession = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshSession()
      
      if (result.success) {
        toast.success("Session refreshed successfully. Reloading data...")
        // Wait a moment then reload the user data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast.error(result.error?.message || "Failed to refresh session")
        console.error("Session refresh failed:", result.error)
      }
    } catch (error) {
      console.error("Error refreshing session:", error)
      toast.error("Failed to refresh session")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load local reading history once on mount (client-side)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const history = getRecentlyRead(30);
      setRecentReads(history);
    } catch (err) {
      console.error('Failed to load reading history:', err);
    }
  }, []);

  if (isLoading) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
        <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p>პროფილი იტვირთება...</p>
          </div>
        </main>
      </div>
    )
  }

  // Handle case where user is loaded but profile is not (shouldn't happen often with AuthProvider logic)
  if (!profile) {
      return (
         <div className="flex min-h-screen bg-black text-white">
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
                <p className="text-red-500">პროფილის მონაცემების ჩატვირთვა ვერ მოხერხდა.</p>
            </main>
        </div>
      );
  }
  
  // Calculate age
  const age = calculateAge(profile?.birth_date);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden md:pl-[77px]">
        {/* Profile header */}
        <div className="relative">
          {/* Custom VIP banner area */}
          <div className="h-48 overflow-hidden relative">
            {profile?.vip_status && profileBanner ? (
              <Image 
                src={profileBanner}
                alt="Profile Banner"
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-48 bg-gradient-to-r from-purple-900 to-blue-900">
                <div className="absolute inset-0 bg-black/30" />
              </div>
            )}
            
            {/* VIP badge */}
            {profile?.vip_status && (
              <div className="absolute top-4 right-4">
                <VIPBadge size="md" />
              </div>
            )}
            
            {/* Banner upload button (only shown for profile owner) */}
            {isOwnProfile && profile?.vip_status && (
              <Button 
                variant="outline" 
                size="sm"
                className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowBannerUpload(true)}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {profileBanner ? 'Change Banner' : 'Add Banner'}
              </Button>
            )}
          </div>

          {/* Profile info */}
          <div className="container mx-auto px-4">
            <div className="relative -mt-16 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 pb-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {/* Responsive avatar size */}
                <div className={cn(
                  "w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4",
                  profile?.vip_status ? (profile.vip_theme ? `border-${profile.vip_theme}-500` : "border-yellow-400") : "border-black"
                  // Ensure Tailwind is configured for dynamic border colors like border-purple-500, border-blue-500 etc. if using vip_theme.
                  // If vip_theme specific classes are not available, fallback to a generic VIP color e.g. "border-yellow-400"
                )}>
                  <ImageSkeleton
                    src={profile.avatar_url || "/placeholder.svg"}
                    alt={profile.username || "მომხმარებელი"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* User info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-2 md:gap-4">
                   {/* Responsive heading size */}
                  <h1 className="text-2xl md:text-3xl font-bold">
                     {profile.first_name || profile.last_name 
                        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                        : profile.username || "მომხმარებელი"}
                  </h1>
                  <div className="text-gray-400">@{profile.username}</div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>შემოგვიერთდა {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' }) : "ცოტა ხნის წინ"}</span>
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                       <MapPinIcon className="h-4 w-4" />
                       <span>{profile.location}</span>
                    </div>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                       <CakeIcon className="h-4 w-4" />
                       <span>{age} წლის</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-gray-300">{profile.bio || "ბიოგრაფია არ არის დამატებული."}</p>
              </div>

              {/* Actions */}
              {/* Stack buttons vertically on small screens */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="bg-gray-800 border-gray-700 hover:bg-gray-700 w-full sm:w-auto"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      პარამეტრები
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>პროფილის პარამეტრები</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        შეცვალეთ თქვენი მომხმარებლის სახელი, ბიო და კონფიდენციალურობის პარამეტრები.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {user && profile && (
                        <ProfileForm 
                          userId={user.id} 
                          initialData={{
                              id: profile.id,
                              username: profile.username || '',
                              first_name: profile.first_name || null,
                              last_name: profile.last_name || null,
                              avatar_url: profile.avatar_url,
                              bio: profile.bio || '',
                              is_public: profile.is_public ?? true,
                              birth_date: profile.birth_date || null,
                          }}
                          onSuccess={() => {
                             setIsEditProfileOpen(false);
                             toast.info("პროფილი განახლდა.");
                          }} 
                        />
                      )} 
                    </div>
                  </DialogContent>
                </Dialog>
                
                {showRefreshButton && (
                  <Button 
                    variant="outline" 
                    className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                    onClick={handleRefreshSession}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d="M1 4V10H7" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M23 20V14H17" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M20.49 9.00001C19.9828 7.5668 19.1209 6.28542 17.9845 5.27543C16.8482 4.26545 15.4745 3.55976 13.9917 3.22426C12.5089 2.88877 10.9652 2.93436 9.50481 3.35685C8.04437 3.77935 6.71475 4.56397 5.64 5.64001L1 10M23 14L18.36 18.36C17.2853 19.4361 15.9556 20.2207 14.4952 20.6432C13.0348 21.0657 11.4911 21.1113 10.0083 20.7758C8.52547 20.4403 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15"
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    სესიის განახლება
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700 px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                    <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      საჯაროდ ნახვა
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      ანგარიშის წაშლა
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Stats overview */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top List Right */}
            <TopListSection isOwner={isOwnProfile} username={profile.username ?? undefined} />

            {/* Favorite characters */}
            <FavoriteCharactersSection isOwner={isOwnProfile} />
          </div>
        </div>

        {/* Content tabs */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="manga" className="w-full">
            {/* Make TabsList scrollable on small screens */} 
            <TabsList className="mb-6 overflow-x-auto justify-start">
              <TabsTrigger value="manga" className="flex items-center gap-2 flex-shrink-0">
                <BookOpen className="h-4 w-4" />
                მანგა
              </TabsTrigger>
              <TabsTrigger value={"comics" as any} className="flex items-center gap-2 flex-shrink-0">
                <Book className="h-4 w-4" />
                კომიქსი
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2 flex-shrink-0">
                <TrendingUp className="h-4 w-4" />
                აქტივობა
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 flex-shrink-0">
                <History className="h-4 w-4" />
                ისტორია
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manga">
              <div className="mb-6">
                {/* Make tab controls scrollable & buttons smaller */}
                <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn("text-xs md:text-sm", activeMangaTab === "reading" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("reading")}
                    >
                      ვკითხულობ ({stats.manga.reading})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn("text-xs md:text-sm", activeMangaTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("completed")}
                    >
                      დასრულებული ({stats.manga.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn(
                        "text-xs md:text-sm",
                        activeMangaTab === "planToRead" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveMangaTab("planToRead")}
                    >
                      წასაკითხი ({stats.manga.planToRead})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs md:text-sm hover:bg-gray-800/50">
                          მეტი <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer" onClick={() => setActiveMangaTab("on_hold")}>
                          შეჩერებული ({stats.manga.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer" onClick={() => setActiveMangaTab("dropped")}>
                          მიტოვებული ({stats.manga.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Responsive grid columns for manga list */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                  {activeMangaTab === "reading" &&
                    (mangaReading.length > 0 ? 
                      mangaReading.map((manga) => <MangaListItem key={manga.id} item={manga} onRemove={() => setMangaReading(prev => prev.filter(i => i.id !== manga.id))} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის მანგა რომელსაც კითხულობთ</div>
                    )
                  }
                  {activeMangaTab === "completed" &&
                    (mangaCompleted.length > 0 ? 
                      mangaCompleted.map((manga) => <MangaListItem key={manga.id} item={manga} onRemove={() => setMangaCompleted(prev => prev.filter(i => i.id !== manga.id))} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის დასრულებული მანგა</div>
                    )
                  }
                  {activeMangaTab === "planToRead" &&
                    (mangaPlanToRead.length > 0 ? 
                      mangaPlanToRead.map((manga) => <MangaListItem key={manga.id} item={manga} onRemove={() => setMangaPlanToRead(prev => prev.filter(i => i.id !== manga.id))} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის წასაკითხი მანგა</div>
                    )
                  }
                  {activeMangaTab === "on_hold" &&
                    (mangaOnHold.length > 0 ? 
                      mangaOnHold.map((manga) => <MangaListItem key={manga.id} item={manga} onRemove={() => setMangaOnHold(prev => prev.filter(i => i.id !== manga.id))} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის შეჩერებული მანგა</div>
                    )
                  }
                  {activeMangaTab === "dropped" &&
                    (mangaDropped.length > 0 ? 
                      mangaDropped.map((manga) => <MangaListItem key={manga.id} item={manga} onRemove={() => setMangaDropped(prev => prev.filter(i => i.id !== manga.id))} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის მიტოვებული მანგა</div>
                    )
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value={"comics" as any}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className={cn("text-xs md:text-sm", activeMangaTab === "reading" ? "bg-gray-800" : "hover:bg-gray-800/50")} onClick={()=>setActiveMangaTab('reading')}>ვკითხულობ ({stats.comics.reading})</Button>
                    <Button variant="ghost" size="sm" className={cn("text-xs md:text-sm", activeMangaTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")} onClick={()=>setActiveMangaTab('completed')}>დასრულებული ({stats.comics.completed})</Button>
                    <Button variant="ghost" size="sm" className={cn("text-xs md:text-sm", activeMangaTab === "planToRead" ? "bg-gray-800" : "hover:bg-gray-800/50")} onClick={()=>setActiveMangaTab('planToRead')}>წასაკითხი ({stats.comics.planToRead})</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs md:text-sm hover:bg-gray-800/50">
                          მეტი <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer" onClick={() => setActiveMangaTab("on_hold")}>
                          შეჩერებული ({stats.comics.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer" onClick={() => setActiveMangaTab("dropped")}>
                          მიტოვებული ({stats.comics.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                  {activeMangaTab === 'reading' && (comicsReading.length>0? comicsReading.map(c=> <MangaListItem key={c.id} item={c} onRemove={() => setComicsReading(prev => prev.filter(i => i.id !== c.id))}/>):<div className="col-span-full text-center py-10 text-gray-400">ცარიელია</div>)}
                  {activeMangaTab === 'completed' && (comicsCompleted.length>0? comicsCompleted.map(c=> <MangaListItem key={c.id} item={c} onRemove={() => setComicsCompleted(prev => prev.filter(i => i.id !== c.id))}/>):<div className="col-span-full text-center py-10 text-gray-400">ცარიელია</div>)}
                  {activeMangaTab === 'planToRead' && (comicsPlanToRead.length>0? comicsPlanToRead.map(c=> <MangaListItem key={c.id} item={c} onRemove={() => setComicsPlanToRead(prev => prev.filter(i => i.id !== c.id))}/>):<div className="col-span-full text-center py-10 text-gray-400">ცარიელია</div>)}
                  {activeMangaTab === 'on_hold' && (comicsOnHold.length>0? comicsOnHold.map(c=> <MangaListItem key={c.id} item={c} onRemove={() => setComicsOnHold(prev => prev.filter(i => i.id !== c.id))}/>):<div className="col-span-full text-center py-10 text-gray-400">ცარიელია</div>)}
                  {activeMangaTab === 'dropped' && (comicsDropped.length>0? comicsDropped.map(c=> <MangaListItem key={c.id} item={c} onRemove={() => setComicsDropped(prev => prev.filter(i => i.id !== c.id))}/>):<div className="col-span-full text-center py-10 text-gray-400">ცარიელია</div>)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">ბოლო აქტივობა</h2>

                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity, idx) => (
                      <ActivityItemDisplay
                        key={`${activity.id}-${activity.timestamp ?? idx}`}
                        type={activity.type}
                        action={activity.action}
                        title={activity.contentTitle}
                        details={activity.details}
                        time={getTimeAgo(new Date(activity.timestamp))}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      აქტივობა არ მოიძებნა
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Reading History Tab */}
            <TabsContent value="history">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">ბოლო წაკითხვები</h2>
                {recentReads.length > 0 ? (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {recentReads.map((item, idx) => (
                      <div key={`${item.mangaId}-${item.chapterId}-${idx}`} className="flex items-start gap-4 p-3 bg-gray-800/50 rounded-lg">
                        <div className="w-16 h-24 flex-shrink-0 overflow-hidden rounded">
                          <ImageSkeleton
                            src={item.mangaThumbnail || '/placeholder.svg'}
                            alt={item.mangaTitle}
                            className="w-full h-full object-cover rounded-[10px]"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-0.5 line-clamp-2">{item.mangaTitle}</div>
                          <div className="text-xs text-gray-400 mb-1">თავი {item.chapterNumber}: {item.chapterTitle}</div>
                          <Progress value={Math.round((item.currentPage / Math.max(1, item.totalPages)) * 100)} className="h-1 mb-1" />
                          <div className="text-xs text-gray-500">{getTimeAgo(new Date(item.lastRead))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400">ისტორია ცარიელია</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Banner uploader dialog */}
      {user && (
        <BannerUploader
          userId={user.id}
          currentBannerUrl={profileBanner}
          onBannerUpdate={handleBannerUpdate}
          isOpen={showBannerUpload}
          onClose={() => setShowBannerUpload(false)}
        />
      )}
      
      {/* Ad banner - only shown for non-VIP users */}
      {!profile?.vip_status && (
        <div className="mx-auto my-4">
          <AdBanner placement="profile" />
        </div>
      )}
    </div>
  )
}

// Helper components
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg flex items-center">
      <div className="mr-4 text-blue-400">{icon}</div>
      <div>
        <div className="text-gray-400 text-sm">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  )
}

function MangaListItem({ item, onRemove }: { item: ContentItem; onRemove: () => void }) {
  const [currentStatus, setCurrentStatus] = useState(item.status);

  const handleStatusChange = (newStatus: MediaStatus | null) => {
    setCurrentStatus(newStatus);
    // You might want to refresh the list or move the item to a different tab here
    // For now, it just updates locally to reflect the change immediately
  };
  
  const handleRemove = async () => {
    try {
      await removeFromLibrary(item.id, item.type);
      toast.success("წარმატებით წაიშალა");
      onRemove();
    } catch (error) {
      toast.error("წაშლა ვერ მოხერხდა");
      console.error(error);
    }
  };

  return (
    <div className="rounded-[10px] overflow-hidden group flex flex-col">
      <div className="relative">
        <ImageSkeleton
          src={item.image || "/placeholder.svg"}
          alt={item.georgianTitle}
          className="w-full aspect-[2/3] object-cover rounded-[10px]"
          style={{borderRadius: '10px'}}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
              <DropdownMenuItem 
                className="text-red-500 hover:!bg-red-900/50 hover:!text-red-400 cursor-pointer"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                წაშლა
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-medium text-sm line-clamp-2 h-10">{item.georgianTitle}</h3>
        {item.georgianTitle !== item.title && item.title && (
          <p className="text-xs text-gray-400 line-clamp-1 truncate">{item.title}</p>
        )}

        <div className="mt-auto pt-2">
          {item.progress > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">პროგრესი</span>
                <span>
                  {item.progress}/{item.total || "?"}
                </span>
              </div>
              <Progress value={(item.progress / (item.total || item.progress)) * 100} className="h-1 bg-gray-700" />
            </div>
          )}

          <div className="mt-2">
            <StatusSelector
                mediaId={item.id}
                mediaType={item.type}
                mediaTitle={item.georgianTitle}
                mediaThumbnail={item.image}
                currentStatus={currentStatus}
                onStatusChange={handleStatusChange}
                compact={true}
                className="w-full justify-center"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityItemDisplay({
  type,
  action,
  title,
  details,
  time,
}: {
  type: "manga" | "comics";
  action: string;
  title: string;
  details: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
      <div className={`p-2 rounded-full ${
        type === "manga" ? "bg-purple-500/20" : "bg-green-500/20"
      }`}>
        {type === "manga" ? (
          <BookOpen className="h-5 w-5 text-purple-400" />
        ) : (
          <Book className="h-5 w-5 text-green-400" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{action === "reading" ? "კითხულობს" : 
                                         action === "completed" ? "დაასრულა" : 
                                         action === "updated" ? "განაახლა" : action}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{title}</span>
        </div>
        <div className="text-sm text-gray-400">
          {details.includes("Chapter") ? details.replace("Chapter", "თავი") : details}
        </div>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
  )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
