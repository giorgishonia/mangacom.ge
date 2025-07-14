"use client"

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
    Loader2, 
    User as UserIcon, 
    Calendar, 
    Edit, 
    AlertTriangle, 
    Settings, 
    // Add other used icons back
    BookOpen,
    Check,
    ChevronDown,
    Clock,
    Eye,
    Film,
    LogOut,
    Menu,
    MoreHorizontal,
    PauseCircle,
    PlayCircle,
    Plus,
    Star,
    Trash2,
    TrendingUp,
    X,
    Save,
    User2,
    MapPin as MapPinIcon,
    Cake as CakeIcon, 
    Users,
    Flag,
    XCircle,
    Book,
    History,
    Upload as UploadIcon,
} from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/components/supabase-auth-provider';
import { toast } from 'sonner';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
// Correct path assumption, adjust if needed
import { AvatarUploader } from '@/app/profile/components/avatar-uploader';
import { FriendButton } from '@/components/friend-button';
import { getLibraryItems } from '@/lib/user-library';
import { ProfileForm } from '@/components/settings/profile-form';
// Import UserProfile type and specific fetch function FROM LIB/USERS
import { UserProfile, getUserProfileByUsername, getProfileForUser } from '@/lib/users'; 
// Import watchlist/session functions FROM LIB/AUTH
import { getUserWatchlist, refreshSession } from '@/lib/auth'; 
import { ImageSkeleton } from "@/components/image-skeleton"; // Add ImageSkeleton import
import { Progress } from "@/components/ui/progress"; // Add Progress import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Add Tabs imports
// Add DropdownMenu imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { VIPBadge } from '@/components/ui/vip-badge';
import TopListSection from '@/components/profile/top-list-section';
import FavoriteCharactersSection from '@/components/profile/favorite-characters-section';
import { getRecentlyRead, ReadingProgress } from '@/lib/reading-history';
import { cn } from '@/lib/utils';
import { BannerUploader } from '@/components/profile/banner-uploader';

// RE-ADD local interface definitions
// Interface for content item
interface ContentItem {
  id: string;
  title: string; // English title
  georgianTitle: string; // Georgian title
  image: string;
  progress: number;
  total: number | null;
  score: number | null;
}

// Interface for activity item
interface ActivityItem {
  id: string;
  type: "anime" | "manga" | "comics";
  action: string;
  contentTitle: string;
  details: string;
  timestamp: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(str: string) {
  return UUID_REGEX.test(str);
}

// Helper to compute stats from a watchlist array
function computeStats(items: any[]): {
  watching?: number; // for anime
  reading?: number; // for manga/comics
  completed: number;
  onHold: number;
  dropped: number;
  plan: number; // planToWatch / planToRead
  totalEntries: number;
} {
  let watching = 0,
      reading = 0,
      completed = 0,
      onHold = 0,
      dropped = 0,
      plan = 0;

  items.forEach((it) => {
    switch (it.status) {
      case 'watching':
        watching++;
        break;
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
      case 'plan_to_watch':
      case 'plan_to_read':
        plan++;
        break;
      default:
        break;
    }
  });

  return {
    watching,
    reading,
    completed,
    onHold,
    dropped,
    plan,
    totalEntries: items.length,
  };
}

// Helper function to format relative time (Georgian)
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} წამის წინ`;
  if (diff < 3600) return `${Math.floor(diff / 60)} წუთის წინ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} საათის წინ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} დღის წინ`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} კვირის წინ`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} თვის წინ`;
  return `${Math.floor(diff / 31536000)} წლის წინ`;
}

// Enhanced Content Card Component - matching main profile page
function ContentCard({ item }: { item: any }) {
  return (
    <div className="group relative bg-gray-800/30 rounded-xl overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-105">
      <div className="relative">
        <ImageSkeleton 
          src={item.image || "/placeholder.svg"} 
          alt={item.title} 
          className="w-full aspect-[2/3] object-cover"
        />
        
        {/* Progress overlay */}
        {item.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/80">პროგრესი</span>
              <span className="text-white font-medium">
                {item.progress}/{item.total || "?"}
              </span>
            </div>
            <Progress 
              value={(item.progress / (item.total || item.progress)) * 100} 
              className="h-1.5 bg-gray-700/50" 
            />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 mb-2 min-h-[2.5rem]">{item.georgianTitle}</h3>
        {item.georgianTitle !== item.title && item.title && (
          <p className="text-xs text-gray-400 line-clamp-1">{item.title}</p>
        )}
      </div>
    </div>
  );
}

function ActivityItemDisplay({ type, action, title, details, time }: { type: "manga" | "comics" | "anime"; action: string; title: string; details: string; time: string; }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all">
      <div className={`p-3 rounded-full ${
        type === "manga" ? "bg-purple-500/20 text-purple-400" : 
        type === "comics" ? "bg-green-500/20 text-green-400" : 
        "bg-blue-500/20 text-blue-400"
      }`}>
        {type === "manga" ? (
          <BookOpen className="h-5 w-5" />
        ) : type === "comics" ? (
          <Book className="h-5 w-5" />
        ) : (
          <Film className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{action}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-300">{title}</span>
        </div>
        <div className="text-sm text-gray-400">{details}</div>
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0">{time}</div>
    </div>
  );
}

export default function ProfilePage() {
  // Get params using the hook
  const params = useParams();
  const slug = params?.username as string; // can be username or uuid
  
  // State for the profile being viewed
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [targetProfileLoading, setTargetProfileLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  
  // Existing state for lists, stats, tabs etc.
  const [activeAnimeTab, setActiveAnimeTab] = useState("watching");
  const [activeMangaTab, setActiveMangaTab] = useState("reading");
  const [activeMainTab, setActiveMainTab] = useState("anime");
  const [animeWatching, setAnimeWatching] = useState<ContentItem[]>([]);
  const [animeCompleted, setAnimeCompleted] = useState<ContentItem[]>([]);
  const [animePlanToWatch, setAnimePlanToWatch] = useState<ContentItem[]>([]);
  const [mangaReading, setMangaReading] = useState<ContentItem[]>([]);
  const [mangaCompleted, setMangaCompleted] = useState<ContentItem[]>([]);
  const [mangaPlanToRead, setMangaPlanToRead] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState({
    anime: {
      watching: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToWatch: 0,
      meanScore: 0,
      totalEntries: 0,
    },
    manga: {
      reading: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToRead: 0,
      meanScore: 0,
      totalEntries: 0,
    },
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [friends, setFriends] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);
  
  const router = useRouter();
  // Get logged-in user's info (profile will be the logged-in user's profile)
  const { user: loggedInUser, profile: loggedInUserProfile, isLoading: authLoading, isProfileLoading: loggedInProfileLoading } = useAuth();
  
  // State for settings dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State for refresh button (keep as is)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  // VIP profile banner
  const [profileBanner, setProfileBanner] = useState<string | null>(null);

  // Banner uploader dialog visibility
  const [showBannerUpload, setShowBannerUpload] = useState(false);

  // Handle banner update callback
  const handleBannerUpdate = (url: string) => {
    setProfileBanner(url);
  };

  // Determine if the logged-in user is viewing their own profile
  const isOwnProfile = loggedInUserProfile?.id === slug || loggedInUserProfile?.username === slug;

  // Helper to determine if logged-in user is in target's friends list
  const isFriend = loggedInUser?.id ? friends.some(f => f.id === loggedInUser.id) : false;

  // Whether viewer is allowed to see private details
  const canViewPrivate = targetProfile?.is_public || isOwnProfile || isFriend;

  // State for reading history
  const [recentReads, setRecentReads] = useState<ReadingProgress[]>([]);

  // Load recent reads for own profile
  useEffect(() => {
    if (!isOwnProfile) return;
    try {
      const history = getRecentlyRead(30);
      setRecentReads(history);
    } catch (err) {
      console.error('Failed to load reading history', err);
    }
  }, [isOwnProfile]);

  // Effect 1: Fetch the target profile based on username param
  useEffect(() => {
    async function fetchTargetProfile() {
      if (!slug) return;
      console.log(`Fetching profile for slug: ${slug}`);
      setTargetProfileLoading(true);
      setProfileNotFound(false);
      try {
        let fetchedProfile: UserProfile | null = null;
        if (isUUID(slug)) {
          fetchedProfile = await getProfileForUser(slug);
        } else {
          fetchedProfile = await getUserProfileByUsername(slug);
        }
        if (fetchedProfile) {
          setTargetProfile(fetchedProfile);
          console.log(`Profile found for ${slug}:`, fetchedProfile);
        } else {
          setTargetProfile(null);
          setProfileNotFound(true);
          console.log(`Profile not found for ${slug}`);
        }
      } catch (error) {
        console.error(`Error fetching profile for ${slug}:`, error);
        setTargetProfile(null);
        setProfileNotFound(true);
        toast.error("პროფილის ჩატვირთვისას მოხდა შეცდომა.");
      } finally {
        setTargetProfileLoading(false);
      }
    }
    fetchTargetProfile();
  }, [slug]); // Re-run if slug changes

  // Fetch friends list once target profile loaded
  useEffect(() => {
    async function fetchFriends() {
      if (!targetProfile?.id) return;
      try {
        const res = await fetch(`/api/friends/user/${targetProfile.id}`);
        if (!res.ok) throw new Error('failed');
        const data = await res.json() as { friends: { id: string; username: string; avatar_url: string | null }[]; count: number };
        setFriends(data.friends);
        setFriendCount(data.count);
      } catch (err) {
        console.error('failed to load friends', err);
      }
    }
    fetchFriends();
  }, [targetProfile?.id]);

  // Fetch VIP banner for target profile
  useEffect(() => {
    async function fetchProfileBanner() {
      if (!targetProfile?.vip_status) return;
      try {
        const { data, error } = await supabase
          .from('user_banners')
          .select('banner_url')
          .eq('user_id', targetProfile.id)
          .maybeSingle();
        if (!error && data) {
          setProfileBanner(data.banner_url);
        }
      } catch (err) {
        console.error('Failed to fetch profile banner:', err);
      }
    }
    if (targetProfile?.id) {
      fetchProfileBanner();
    }
  }, [targetProfile?.id, targetProfile?.vip_status]);

  // Effect 2: Load secondary data (lists, stats, activity) once target profile is loaded
  useEffect(() => {
    async function loadSecondaryData() {
      if (!targetProfile?.id) return; // Need the target profile ID
      
      const userIdToFetch = targetProfile.id;
      console.log(`Fetching secondary data for user ID: ${userIdToFetch}`);

      // Reset lists before fetching new data
      setAnimeWatching([]);
      setAnimeCompleted([]);
      setAnimePlanToWatch([]);
      setMangaReading([]);
      setMangaCompleted([]);
      setMangaPlanToRead([]);
      setActivities([]);

      try {
        // Fetch anime and manga watchlists in parallel
        const [animeWatchlistResult, mangaWatchlistResult] = await Promise.all([
          getUserWatchlist(userIdToFetch, 'anime'),
          getUserWatchlist(userIdToFetch, 'manga')
        ]);

        // Process anime watchlist
        if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
          // Process anime data
          // Create temporary arrays instead of multiple state updates
          const watching: ContentItem[] = [];
          const completed: ContentItem[] = [];
          const planToWatch: ContentItem[] = [];
          
          // Process watchlist data and organize by status
          animeWatchlistResult.watchlist.forEach(item => {
            const contentItem = {
              id: item.id,
              title: item.title,
              georgianTitle: item.georgian_title || item.title,
              image: item.thumbnail,
              progress: item.progress || 0,
              total: item.episodes_count,
              score: item.user_score
            };
            
            // Add to appropriate array based on status
            if (item.status === 'watching') watching.push(contentItem);
            else if (item.status === 'completed') completed.push(contentItem);
            else if (item.status === 'plan_to_watch') planToWatch.push(contentItem);
          });
          
          // Batch state updates
          setAnimeWatching(watching);
          setAnimeCompleted(completed);
          setAnimePlanToWatch(planToWatch);
        }

        // Process manga watchlist
        if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
          const reading: ContentItem[] = [];
          const completed: ContentItem[] = [];
          const planToRead: ContentItem[] = [];

          mangaWatchlistResult.watchlist.forEach((wl) => {
            const c = wl.content || {};
            const contentItem: ContentItem = {
              id: c.id ?? wl.content_id,
              title: c.title ?? 'Unknown',
              georgianTitle: c.georgian_title || c.title || 'Unknown',
              image: c.thumbnail || '/placeholder.svg',
              progress: wl.progress || 0,
              total: c.chapters_count ?? null,
              score: wl.rating ?? null,
            };

            switch (wl.status) {
              case 'reading':
                reading.push(contentItem);
                break;
              case 'completed':
                completed.push(contentItem);
                break;
              case 'plan_to_read':
                planToRead.push(contentItem);
                break;
              default:
                break;
            }
          });

          setMangaReading(reading);
          setMangaCompleted(completed);
          setMangaPlanToRead(planToRead);
        }

        // Compute stats using helper
        const animeStatsData = computeStats(animeWatchlistResult.success ? animeWatchlistResult.watchlist || [] : []);
        const mangaStatsData = computeStats(mangaWatchlistResult.success ? mangaWatchlistResult.watchlist || [] : []);

        setStats({
          anime: {
            watching: animeStatsData.watching ?? 0,
            completed: animeStatsData.completed,
            onHold: animeStatsData.onHold,
            dropped: animeStatsData.dropped,
            planToWatch: animeStatsData.plan,
            meanScore: 0,
            totalEntries: animeStatsData.totalEntries,
          },
          manga: {
            reading: mangaStatsData.reading ?? 0,
            completed: mangaStatsData.completed,
            onHold: mangaStatsData.onHold,
            dropped: mangaStatsData.dropped,
            planToRead: mangaStatsData.plan,
            meanScore: 0,
            totalEntries: mangaStatsData.totalEntries,
          }
        });

        // Local library items are specific to the logged-in user, 
        // so only merge them if viewing own profile.
        if (isOwnProfile && loggedInUser) {
          try {
            // Get local items in parallel
            const [localMangaItems] = await Promise.all([
              getLibraryItems('manga'),
            ]);
            
            // Process local items if needed
            // ...
          } catch (localStorageError) {
              console.error('Error merging local library items:', localStorageError);
          }
        }
        
        // Generate activities from the most recent items in watchlists
        try {
          const recentActivities: ActivityItem[] = [];
          
          // Get most recent items from each list for activities
          if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
            const recentAnime = [...animeWatchlistResult.watchlist]
              .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
              .slice(0, 3);
              
            recentAnime.forEach(item => {
              recentActivities.push({
                id: `anime-${item.id}`,
                type: "anime",
                action: item.status === 'watching' ? 'ნახვა' : 
                        item.status === 'completed' ? 'დასრულება' : 'დამატება',
                contentTitle: item.georgian_title || item.title,
                details: item.progress ? `${item.progress} ეპიზოდი` : '',
                timestamp: item.updated_at || new Date().toISOString()
              });
            });
          }
          
          if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
            const recentManga = [...mangaWatchlistResult.watchlist]
              .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
              .slice(0, 3);
              
            recentManga.forEach(item => {
              recentActivities.push({
                id: `manga-${item.id}`,
                type: "manga",
                action: item.status === 'reading' ? 'კითხვა' : 
                        item.status === 'completed' ? 'დასრულება' : 'დამატება',
                contentTitle: item.georgian_title || item.title,
                details: item.progress ? `${item.progress} თავი` : '',
                timestamp: item.updated_at || new Date().toISOString()
              });
            });
          }
          
          // Sort by timestamp and take the 5 most recent activities
          setActivities(
            recentActivities
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5)
          );
        } catch (activityError) {
          console.error("Failed to load activity data:", activityError);
        }
        
      } catch (error) {
        console.error("Error loading secondary data:", error);
        toast.error("დამატებითი მონაცემების ჩატვირთვისას მოხდა შეცდომა");
      }
    }

    // Run effect only when target profile is loaded AND auth state is resolved
    if (targetProfile && !targetProfileLoading && !authLoading) {
      loadSecondaryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProfile?.id, targetProfileLoading, isOwnProfile, loggedInUser?.id, authLoading]); // Optimize dependencies

  // Handle session refresh (keep as is)
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

  // --- NEW: fetch activity history from server table ---
  async function fetchActivity() {
    if (!targetProfile?.id) return;
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', targetProfile.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (activityError) {
        // Silently ignore if table missing
        if (activityError.code !== '42P01') {
          console.error('Failed to fetch activity:', activityError);
        }
        return;
      }

      setActivities(activityData as any);
    } catch (err) {
      console.error('Unexpected error fetching activity:', err);
    }
  }

  fetchActivity();

  // --- Render Logic --- 

  // Loading state for the target profile
  if (targetProfileLoading) {
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

  // Profile not found state
  if (profileNotFound || !targetProfile) {
      return (
         <div className="flex min-h-screen bg-black text-white">
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
                {/* Use slug in the message */} 
                <p className="text-red-500">პროფილი '{slug}' ვერ მოიძებნა.</p>
            </main>
        </div>
      );
  }
  
  // Calculate age using target profile's birth date
  const age = calculateAge(targetProfile.birth_date ?? null);

  // Main component render using targetProfile data
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden md:pl-[77px]">
        {/* Profile header */}
        <div className="relative">
          {/* Cover image or VIP banner */}
          <div className="h-56 overflow-hidden relative">
            {targetProfile?.vip_status && profileBanner ? (
              <Image
                src={profileBanner}
                alt="Profile Banner"
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-56 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            )}
            {targetProfile?.vip_status && (
              <div className="absolute top-6 right-6">
                <VIPBadge size="md" />
              </div>
            )}
            {isOwnProfile && targetProfile?.vip_status && (
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-6 right-6 bg-black/60 hover:bg-black/80 text-white border-white/20 backdrop-blur-sm"
                onClick={() => setShowBannerUpload(true)}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {profileBanner ? 'Change Banner' : 'Add Banner'}
              </Button>
            )}
          </div>

          {/* Profile info container with padding */}
          <div className="container mx-auto px-6">
            <div className="relative -mt-20 flex flex-col lg:flex-row items-center lg:items-end gap-6 pb-8">
              {/* Avatar - Increased size and added ring */} 
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 shadow-2xl",
                  targetProfile?.vip_status 
                    ? "border-purple-500 shadow-purple-900/50 ring-4 ring-purple-500/20" 
                    : "border-gray-700 shadow-black/50"
                )}>
                  <ImageSkeleton
                    src={targetProfile.avatar_url || "/placeholder.svg"}
                    alt={targetProfile.username || "მომხმარებელი"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* User info - improved spacing */} 
              <div className="flex-1 text-center lg:text-left lg:ml-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-center lg:justify-start gap-3 lg:gap-4">
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                     {targetProfile.first_name || targetProfile.last_name 
                        ? `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim()
                        : targetProfile.username || "მომხმარებელი"}
                  </h1>
                  <div className="text-gray-400 text-lg">@{targetProfile.username}</div>
                </div>
                {/* Sub-info (Joined, Location, Age) - increased spacing */} 
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-4 text-gray-400 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>შემოგვიერთდა {targetProfile.created_at ? new Date(targetProfile.created_at).toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' }) : "ცოტა ხნის წინ"}</span>
                  </div>
                  {targetProfile.location && (
                    <div className="flex items-center gap-1.5">
                       <MapPinIcon className="h-4 w-4" />
                       <span>{targetProfile.location}</span>
                    </div>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-1.5">
                       <CakeIcon className="h-4 w-4" />
                       <span>{age} წლის</span>
                    </div>
                  )}
                  {/* Friends count */}
                  <div className="flex items-center gap-1.5">
                     <Users className="h-4 w-4" />
                     <span>{friendCount} მეგობარი</span>
                     {friendCount > 0 && (
                       <div className="flex -space-x-2 ml-2">
                         {friends.slice(0, 5).map((f) => (
                           <Avatar key={f.id} className="h-6 w-6 border-2 border-gray-900">
                             <AvatarImage src={f.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${f.id}`} alt={f.username || ''} />
                             <AvatarFallback>{f.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                           </Avatar>
                         ))}
                         {friendCount > 5 && (
                           <span className="text-xs ml-1">+{friendCount - 5}</span>
                         )}
                       </div>
                     )}
                  </div>
                </div>
                {/* Bio */} 
                <p className="mt-4 text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  {targetProfile.bio || "ბიოგრაფია არ არის დამატებული."}
                </p>
              </div>

              {/* Actions - Added spacing */} 
              <div className="flex gap-3 mt-6 lg:mt-0 flex-shrink-0">
                {/* Friend Button - only when viewing someone else's profile */}
                {!isOwnProfile && loggedInUser && targetProfile && (
                  <FriendButton
                    targetUserId={targetProfile.id}
                    currentUserId={loggedInUser.id}
                  />
                )}
                {/* Settings Button */}
                {isOwnProfile && loggedInUser && loggedInUserProfile && (
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="bg-gray-800/80 border-gray-600 hover:bg-gray-700 backdrop-blur-sm"
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
                        <ProfileForm 
                          userId={loggedInUser.id} // Use logged-in user ID for updates
                          initialData={{
                              id: loggedInUserProfile.id,
                              username: loggedInUserProfile.username || '',
                              first_name: loggedInUserProfile.first_name || null,
                              last_name: loggedInUserProfile.last_name || null,
                              avatar_url: loggedInUserProfile.avatar_url,
                              bio: loggedInUserProfile.bio || '',
                              is_public: loggedInUserProfile.is_public ?? true,
                          }}
                          onSuccess={() => {
                            setIsSettingsOpen(false);
                            toast.info("პროფილი განახლდა.");
                            // Optionally trigger a refresh of the loggedInUserProfile in Auth context
                          }} 
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Refresh Button */}
                {showRefreshButton && (
                    <Button 
                        variant="outline" 
                        className="bg-gray-800/80 border-gray-600 hover:bg-gray-700 backdrop-blur-sm"
                        onClick={handleRefreshSession}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? (
                          <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                        ) : (
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              </div>
            </div>
          </div>
        </div>

        {canViewPrivate ? (
          <>
            {/* Stats and sections */}
            <div className="container mx-auto px-6 py-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Top List */}
                <TopListSection isOwner={isOwnProfile} username={targetProfile.username ?? undefined} />

                {/* Favorite characters */}
                <FavoriteCharactersSection isOwner={isOwnProfile} username={targetProfile.username ?? undefined} />
              </div>
            </div>

            {/* Content tabs */}
            <div className="container mx-auto px-6 py-8">
              <Tabs defaultValue="manga" className="w-full">
                <TabsList className="mb-8 overflow-x-auto justify-start bg-gray-900/50 border border-gray-800">
                  <TabsTrigger value="manga" className="flex items-center gap-2 flex-shrink-0 data-[state=active]:bg-purple-600">
                    <BookOpen className="h-4 w-4" />
                    მანგა
                  </TabsTrigger>
                  <TabsTrigger value={"comics" as any} className="flex items-center gap-2 flex-shrink-0 data-[state=active]:bg-green-600">
                    <Book className="h-4 w-4" />
                    კომიქსი
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2 flex-shrink-0 data-[state=active]:bg-blue-600">
                    <TrendingUp className="h-4 w-4" />
                    აქტივობა
                  </TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger value="history" className="flex items-center gap-2 flex-shrink-0 data-[state=active]:bg-orange-600">
                      <History className="h-4 w-4" />
                      ისტორია
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Manga Tab Content */}
                <TabsContent value="manga">
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
                    <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-sm transition-all",
                            activeMangaTab === "reading" 
                              ? "bg-purple-600 text-white hover:bg-purple-700" 
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                          )}
                          onClick={() => setActiveMangaTab("reading")}
                        >
                          ვკითხულობ ({stats.manga.reading})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-sm transition-all",
                            activeMangaTab === "completed" 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                          )}
                          onClick={() => setActiveMangaTab("completed")}
                        >
                          დასრულებული ({stats.manga.completed})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-sm transition-all",
                            activeMangaTab === "planToRead" 
                              ? "bg-green-600 text-white hover:bg-green-700" 
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                          )}
                          onClick={() => setActiveMangaTab("planToRead")}
                        >
                          წასაკითხი ({stats.manga.planToRead})
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {activeMangaTab === "reading" && (mangaReading.length > 0 ? mangaReading.map(m => <ContentCard key={m.id} item={m} />) : <div className="col-span-full text-center py-16 text-gray-400"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>ცარიელია</p></div>)}
                      {activeMangaTab === "completed" && (mangaCompleted.length > 0 ? mangaCompleted.map(m => <ContentCard key={m.id} item={m} />) : <div className="col-span-full text-center py-16 text-gray-400"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>ცარიელია</p></div>)}
                      {activeMangaTab === "planToRead" && (mangaPlanToRead.length > 0 ? mangaPlanToRead.map(m => <ContentCard key={m.id} item={m} />) : <div className="col-span-full text-center py-16 text-gray-400"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>ცარიელია</p></div>)}
                    </div>
                  </div>
                </TabsContent>

                {/* Comics Tab Content */}
                <TabsContent value={"comics" as any}>
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
                    <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-sm transition-all",
                            activeMangaTab === "reading" 
                              ? "bg-green-600 text-white hover:bg-green-700" 
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                          )}
                          onClick={() => setActiveMangaTab("reading")}
                        >
                          ვკითხულობ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-sm transition-all",
                            activeMangaTab === "completed" 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                          )}
                          onClick={() => setActiveMangaTab("completed")}
                        >
                          დასრულებული
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-sm transition-all",
                            activeMangaTab === "planToRead" 
                              ? "bg-purple-600 text-white hover:bg-purple-700" 
                              : "hover:bg-gray-800/50 text-gray-400 hover:text-white"
                          )}
                          onClick={() => setActiveMangaTab("planToRead")}
                        >
                          წასაკითხი
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {activeMangaTab === 'reading' && (mangaReading.length>0? mangaReading.map(c=> <ContentCard key={c.id} item={c}/>):<div className="col-span-full text-center py-16 text-gray-400"><Book className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>ცარიელია</p></div>)}
                      {activeMangaTab === 'completed' && (mangaCompleted.length>0? mangaCompleted.map(c=> <ContentCard key={c.id} item={c}/>):<div className="col-span-full text-center py-16 text-gray-400"><Book className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>ცარიელია</p></div>)}
                      {activeMangaTab === 'planToRead' && (mangaPlanToRead.length>0? mangaPlanToRead.map(c=> <ContentCard key={c.id} item={c}/>):<div className="col-span-full text-center py-16 text-gray-400"><Book className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>ცარიელია</p></div>)}
                    </div>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      ბოლო აქტივობა
                    </h2>
                    <div className="space-y-4">
                      {activities.length > 0 ? (
                        activities.map((activity, idx) => (
                          <ActivityItemDisplay key={`${activity.id}-${idx}`} type={activity.type} action={activity.action} title={activity.contentTitle} details={activity.details} time={getTimeAgo(new Date(activity.timestamp))} />
                        ))
                      ) : (
                        <div className="text-center py-16 text-gray-400">
                          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>აქტივობა არ მოიძებნა</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* History Tab - only for own profile */}
                {isOwnProfile && (
                  <TabsContent value="history">
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <History className="h-5 w-5 text-orange-400" />
                        ბოლო წაკითხვები
                      </h2>
                      {recentReads.length > 0 ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                          {recentReads.map((item, idx) => (
                            <div key={`${item.mangaId}-${idx}`} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all">
                              <div className="w-16 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                                <ImageSkeleton src={item.mangaThumbnail || '/placeholder.svg'} alt={item.mangaTitle} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-sm mb-1 line-clamp-2">{item.mangaTitle}</div>
                                <div className="text-xs text-gray-400 mb-2">თავი {item.chapterNumber}: {item.chapterTitle}</div>
                                <Progress value={Math.round((item.currentPage / Math.max(1, item.totalPages)) * 100)} className="h-2 mb-2" />
                                <div className="text-xs text-gray-500">{getTimeAgo(new Date(item.lastRead))}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 text-gray-400">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>ისტორია ცარიელია</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </>
        ) : (
          <div className="container mx-auto px-6 py-20 text-center text-gray-400">
            <User2 className="h-16 w-16 mx-auto mb-6 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">ეს პროფილი არის დაპრივატებული</h2>
            <p>ამ მომხმარებლის პროფილის სანახავად თქვენ უნდა იყოთ მეგობრები.</p>
          </div>
        )}

      </main>

      {/* Banner uploader dialog – only for VIP owners */}
      {isOwnProfile && targetProfile?.vip_status && loggedInUser && (
        <BannerUploader
          userId={loggedInUser.id}
          currentBannerUrl={profileBanner}
          onBannerUpdate={handleBannerUpdate}
          isOpen={showBannerUpload}
          onClose={() => setShowBannerUpload(false)}
        />
      )}
    </div>
  )
}

// Helper function to calculate age
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = parseISO(birthDate);
  const today = new Date();
  const age = differenceInYears(today, birth);
  return age;
} 