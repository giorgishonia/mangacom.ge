"use client"

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Star, 
  CalendarDays, 
  Clock, 
  Heart, 
  BookOpen, 
  ChevronRight, 
  MenuIcon,
  Bookmark,
  Share,
  Users,
  Info,
  Book,
  Home,
  Search,
  BookMarked,
  History,
  Settings,
  ListChecks,
  Plus,
  Check,
  CheckCheck,
  PauseCircle,
  XCircle,
  X,
  ChevronDown,
  Bell,
  Loader2,
  Eye,
  ChevronLeft,
  Share2,
  Play,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MangaReader } from '@/components/manga-reader'
import { ImageSkeleton } from '@/components/image-skeleton'
import { RelatedContent } from '@/components/related-content'
import { RecommendedContent } from '@/components/recommended-content'
import { DetailViewSkeleton, BannerSkeleton } from '@/components/ui/skeleton'
import { stripHtml, formatStatus } from '@/lib/anilist'
import { getContentById, getChapters, incrementContentView } from '@/lib/content'
import { CharacterSection } from '@/components/character-section'
import { CommentSection } from '@/components/comment-section'
import ChapterManager from '@/components/admin/chapter-manager'
import { isValid } from "date-fns";
import { getMangaProgress, getChapterProgress, getReadPercentage, getMangaTotalProgress, getLatestChapterRead, calculateMangaProgressByChapter } from '@/lib/reading-history'
import { Progress } from '@/components/ui/progress'
import { MediaStatus, MediaType, getLibraryItem, getLibraryItemSync, hasStatus, hasStatusSync, updateItemStatus } from '@/lib/user-library'
import { toast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { useAuth } from '@/components/supabase-auth-provider'
import { AppSidebar } from '@/components/app-sidebar'
import { EmojiRating, EMOJI_REACTIONS } from '@/components/emoji-rating'
import { supabase } from '@/lib/supabase'
import { VipPromoBanner } from '@/components/ads/vip-promo-banner'
import { LogoLoader } from '@/components/logo-loader'

// Animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Helper function to safely create a valid date string or undefined
const formatSafeDate = (dateString: string | undefined) => {
  if (!dateString) return undefined;
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : dateString;
  } catch (e) {
    console.warn("Invalid date format:", dateString);
    return undefined;
  }
};

type Emoji = typeof EMOJI_REACTIONS[number]['emoji'];

export default function ComicPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const unwrappedParams = React.use(params as any) as { id: string }
  const comicId = unwrappedParams.id
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [comicData, setComicData] = useState<any>(null)
  const [isFromDatabase, setIsFromDatabase] = useState(false)
  const [readingProgress, setReadingProgress] = useState<any>(null)
  const [initialReaderPage, setInitialReaderPage] = useState(0)
  const [libraryStatus, setLibraryStatus] = useState<MediaStatus | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubProcessing, setIsSubProcessing] = useState(false)
  const { userId, isAuthenticated } = useUnifiedAuth()
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminCheckComplete, setIsAdminCheckComplete] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(20);
  const previousScrollY = useRef(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const viewIncrementedRef = useRef(false);

  // Logo loader overlay states
  const [showLogoLoader, setShowLogoLoader] = useState(true);
  const [logoAnimationDone, setLogoAnimationDone] = useState(false);

  // --- Character favorites ---
  const [favoriteCharacters, setFavoriteCharacters] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('favorites');
      if (!raw) return;
      const obj = JSON.parse(raw);
      const map: { [id: string]: boolean } = {};
      Object.keys(obj).forEach((k) => {
        if (k.startsWith('character-')) map[k.slice(10)] = true; // remove "character-" prefix
      });
      setFavoriteCharacters(map);
    } catch (err) {
      console.error('Failed to parse favorites', err);
    }
  }, []);

  const toggleCharacterFavorite = (char: any) => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      const key = `character-${char.id}`;
      if (favorites[key]) {
        delete favorites[key];
        setFavoriteCharacters((prev) => ({ ...prev, [char.id]: false }));
      } else {
        favorites[key] = {
          id: char.id,
          type: 'character',
          title: char.name,
          image: char.image,
          from: processedData?.title || '',
          addedAt: new Date().toISOString(),
        };
        setFavoriteCharacters((prev) => ({ ...prev, [char.id]: true }));
      }
      localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (err) {
      console.error('Failed to toggle character favorite', err);
    }
  };

  // Hide logo loader when data is ready and animation is done
  useEffect(() => {
    if (!isLoading && logoAnimationDone) {
      setShowLogoLoader(false);
    }
  }, [isLoading, logoAnimationDone]);

  // Handle scroll effect for background
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const position = scrollRef.current.scrollTop
        setScrollPosition(position)
      }
    }

    const currentScrollRef = scrollRef.current
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  // Update the useEffect for scroll handling to only affect the overlay div
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 20; // Reduced from 100 to 20 for faster response
      
      // Calculate opacity based on scroll position
      let newOpacity = 20;
      if (currentScrollY > scrollThreshold) {
        // Map scroll position to opacity (20-100) with higher multiplier
        newOpacity = Math.min(100, 20 + (currentScrollY - scrollThreshold) * 3);
      }
      
      setOverlayOpacity(Math.floor(newOpacity));
      previousScrollY.current = currentScrollY;
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Define fetchComicData outside useEffect
  const fetchComicData = async () => {
    setIsLoading(true);
    try {
      // First, try to get the content from our database
      const dbResult = await getContentById(comicId);
      
      // Check for type 'comics'
      if (dbResult.success && dbResult.content && dbResult.content.type === 'comics') { 
        console.log("Found comic in database:", dbResult.content);
        
        // Fetch chapters for this comic
        const chaptersResult = await getChapters(comicId);
        const chapters = chaptersResult.success ? chaptersResult.chapters : [];
        console.log("Fetched chapters:", chapters);
        
        // Format content with chapters data
        let fetchedComicData = {
          ...formatDatabaseContent(dbResult.content),
          chaptersData: chapters
        };
        setIsFromDatabase(true);
        setComicData(fetchedComicData);

        // Reaction fetching is now handled by the EmojiRating component itself.
        // The commented out block below is removed.

      } else {
        // If not found in database or wrong type, set data to null
        console.log("Comic not found in database or wrong type.");
        setComicData(null); 
        // Remove AniList fallback
      }
    } catch (error) {
      console.error("Error fetching comic data:", error);
      setComicData(null); // Set data to null on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch comic data on component mount
  useEffect(() => {
    fetchComicData();
  }, [comicId, userId]);

  // --- NEW useEffect to increment view count ---
  useEffect(() => {
    if (comicId && !viewIncrementedRef.current) {
      incrementContentView(comicId)
        .then(result => {
          if (result.success) {
            console.log(`View count API called successfully for comic ${comicId}`);
          } else {
            console.error("Failed to increment view count for comic", comicId, result.error);
          }
        });
      viewIncrementedRef.current = true;
    }
  }, [comicId]);
  // --- END NEW useEffect ---

  // Add useEffect for admin check within the page component
  useEffect(() => {
    async function checkIfAdmin() {
      console.log("ComicPage: Starting admin check...");
      setIsAdminCheckComplete(false);
      if (!user) {
        console.log("ComicPage: No user, not admin.");
        setIsAdmin(false);
        setIsAdminCheckComplete(true);
        return;
      }

      // DEVELOPMENT MODE BYPASS - Temporarily removing this section
      /*
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.log("ComicPage: DEVELOPMENT MODE - Bypassing admin check.");
        setIsAdmin(true);
        setIsAdminCheckComplete(true);
        return;
      }
      */

      try {
        console.log("ComicPage: Fetching admin status...");
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        console.log("ComicPage: Admin check response:", data);
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error("ComicPage: Failed to check admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsAdminCheckComplete(true);
        console.log(`ComicPage: Admin check complete. isAdmin: ${isAdmin}`);
      }
    }
    checkIfAdmin();
  }, [user]); // Rerun check if user changes

  // Get reading progress for this comic
  useEffect(() => {
    if (comicId) {
      const progress = getMangaProgress(comicId)
      setReadingProgress(progress)
    }
  }, [comicId, isReaderOpen])

  // Updated formatDatabaseContent function to remove volumes
  const formatDatabaseContent = (content: any) => {
    console.log("Formatting database comic content:", content);

    // --- DEBUG: Log raw image values ---
    console.log(`[comic formatDB] Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
    const bannerToUse = (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail;
    console.log(`[comic formatDB] Banner to use: ${bannerToUse}`);
    // ---------------------------------

    // Extract release date details for logging
    const releaseYear = content.release_year || null;
    const releaseMonth = content.release_month || null;
    const releaseDay = content.release_day || null;
    
    console.log("Release date information:", { 
      year: releaseYear, 
      month: releaseMonth, 
      day: releaseDay 
    });
    
    // Return content in a format that matches what the UI expects
    return {
      id: content.id,
      title: {
        english: content.title,
        romaji: content.title,
        native: content.georgian_title || content.alternative_titles?.[0] || content.title,
      },
      description: content.description,
      coverImage: {
        large: content.thumbnail,
        extraLarge: content.thumbnail,
      },
      bannerImage: bannerToUse,
      status: content.status ? content.status.toUpperCase() : 'UNKNOWN',
      averageScore: typeof content.rating === 'number' ? content.rating * 10 : null,
      popularity: content.popularity || 0,
      genres: content.genres || [],
      startDate: {
        year: releaseYear !== null ? parseInt(releaseYear) : null,
        month: releaseMonth !== null ? parseInt(releaseMonth) : null,
        day: releaseDay !== null ? parseInt(releaseDay) : null,
      },
      chapters: content.chapters_count || 0,
      relations: { 
        edges: content.relations?.map((rel: any) => ({
          relationType: rel.type || "RELATED",
          node: {
            id: rel.id,
            title: {
              romaji: rel.title,
              english: rel.title
            },
            coverImage: {
              large: rel.image
            },
            startDate: {
              year: rel.year
            }
          }
        })) || [], 
      },
      recommendations: { 
        nodes: content.recommendations?.map((rec: any) => ({
          mediaRecommendation: {
            id: rec.id,
            title: {
              romaji: rec.title,
              english: rec.title
            },
            coverImage: {
              large: rec.image
            },
            startDate: {
              year: rec.year
            },
            genres: rec.genres || []
          }
        })) || [], 
      },
      characters: { 
        nodes: content.characters?.map((char: any) => ({
          id: char.id,
          name: {
            full: char.name
          },
          image: {
            large: char.image
          }
        })) || [],
        edges: content.characters?.map((char: any) => ({
          role: char.role || "MAIN",
          node: {
            id: char.id
          }
        })) || []
      },
      staff: {
        edges: content.staff?.map((staff: any) => ({
          role: staff.role,
          node: {
            id: staff.id,
            name: {
              full: staff.name
            },
            image: {
              large: staff.image
            }
          }
        })) || []
      },
      view_count: content.view_count ?? 0,
      logo: content.logo || null,
    };
  };

  const handleBackClick = () => {
    if (isReaderOpen) {
      setIsReaderOpen(false)
    } else {
      router.back()
    }
  }

  const handleReadClick = (chapterIndex = 0, resumeFromProgress = false) => {
    let selectedIndex = chapterIndex;
    let initialPage = 0;
    
    // If resuming from progress, find the chapter index that matches the stored progress
    if (resumeFromProgress && readingProgress && comicData) {
      const progressChapterIndex = comicData.chapterList.findIndex(
        (ch: any) => ch.id === readingProgress.chapterId || 
                     ch.number === readingProgress.chapterNumber
      );
      
      if (progressChapterIndex !== -1) {
        selectedIndex = progressChapterIndex;
        // Also set the initial page to resume from
        initialPage = readingProgress.currentPage;
      }
    }
    
    setSelectedChapter(selectedIndex);
    // Store the initial page to use when opening the reader
    setInitialReaderPage(initialPage);
    setIsReaderOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (!comicData || comicData.chapterList.length === 0) {
      toast({
        title: "თავები არ არის",
        description: "ამ კომიქსს ჯერ არ აქვს ხელმისაწვდომი თავები.",
        duration: 3000,
      });
      return;
    }
  };

  // Replace the generateMockChapters function with a formatChapters function
  const formatChapters = (chaptersData: any[] = []) => {
    if (!chaptersData || chaptersData.length === 0) {
      // Return empty array or fallback to mock data if needed
      console.log("No chapters available for this comic.");
      return [];
    }
    
    return chaptersData.map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      releaseDate: chapter.release_date ? new Date(chapter.release_date).toLocaleDateString() : "Unknown",
      thumbnail: chapter.thumbnail || comicData?.coverImage?.large || "/placeholder.svg",
      pages: chapter.pages || []
    }));
  };

  // Process comicData into processedData - ADJUST STRUCTURE
  const processedData = comicData ? {
    id: comicData.id,
    title: comicData.title?.english || comicData.title?.romaji || "Unknown Title",
    subtitle: comicData.title?.native,
    georgianTitle: isFromDatabase ? comicData.georgian_title : null, 
    coverImage: comicData.coverImage?.large || "/placeholder.svg",
    bannerImage: comicData.bannerImage || comicData.coverImage?.large || "/placeholder.svg",
    releaseDate: comicData.startDate && comicData.startDate.year 
      ? `${comicData.startDate.year}` 
      : "Unknown",
    status: formatStatus(comicData.status || ""),
    chapters: comicData.chaptersData?.length || comicData.chapters || 0, // Ensure it's a number or 0
    rating: comicData.averageScore ? Math.max(0, Math.min(10, comicData.averageScore / 10)) : null,
    popularity: comicData.popularity || 0,
    genres: comicData.genres || [],
    author: comicData.staff?.edges?.find((staff: any) => 
      staff.role?.toLowerCase().includes('author') || 
      staff.role?.toLowerCase().includes('story')
    )?.node?.name?.full || "Unknown Author",
    synopsis: stripHtml(comicData.description || "No description available"), 
    // Directly assign the formatted chapters array
    chapterList: formatChapters(comicData.chaptersData), 
    // Map relations to the expected flat structure
    relations: comicData.relations?.edges?.filter((edge: any) => edge?.node && edge?.node?.id)
      .map((relation: any) => ({
        id: relation.node.id,
        title: relation.node.title?.english || relation.node.title?.romaji || "Unknown",
        type: relation.relationType || "RELATED",
        year: relation.node.startDate?.year || "Unknown",
        image: relation.node.coverImage?.large || relation.node.coverImage?.medium || "/placeholder.svg",
      })) || [], 
    // Map recommendations to the expected flat structure
    recommendations: comicData.recommendations?.nodes?.filter((node: any) => node?.mediaRecommendation && node?.mediaRecommendation?.id)
      .map((rec: any) => ({
        id: rec.mediaRecommendation.id,
        title: rec.mediaRecommendation.title?.english || rec.mediaRecommendation.title?.romaji || "Unknown",
        year: rec.mediaRecommendation.startDate?.year || "Unknown",
        image: rec.mediaRecommendation.coverImage?.large || rec.mediaRecommendation.coverImage?.medium || "/placeholder.svg",
        genres: rec.mediaRecommendation.genres || [],
      })) || [], 
    // Directly assign the mapped characters array
    characters: mapCharacters(comicData), 
    view_count: comicData.view_count ?? 0,
    logo: comicData.logo || null,
  } : null;

  // Add a debug log for the processed data
  if (processedData) {
    console.log("Final processed data:", {
      dataAvailable: !!processedData,
      hasCharacters: !!processedData.characters,
      characterCount: processedData.characters?.length || 0,
      charactersSample: processedData.characters?.slice(0, 2) || []
    });
  }

  // Add this useEffect for debug logging
  useEffect(() => {
    if (processedData) {
      if (!processedData.relations || processedData.relations.length === 0) {
        console.log("No relations data to display");
      }
      if (!processedData.recommendations || processedData.recommendations.length === 0) {
        console.log("No recommendations data to display");
      }
    }
  }, [processedData]);

  // Add a debug effect to specifically log character data
  useEffect(() => {
    // Debug logging for character data
    console.log("Character data available:", !!comicData?.characters);
    
    if (comicData?.characters) {
      console.log("Raw character data from comic source:", {
        nodes: comicData.characters.nodes?.length || 0,
        edges: comicData.characters.edges?.length || 0,
        sample: comicData.characters.nodes?.[0] || 'No characters'
      });
    }
    
    if (processedData && processedData.characters) {
      console.log("Processed character data:", {
        count: processedData.characters.length,
        sample: processedData.characters[0] || 'No processed characters'
      });
    }
  }, [comicData, processedData]);

  function mapCharacters(data: any) {
    if (!data) {
      console.log('No data provided for character mapping');
      return [];
    }
    
    try {
      if (!data.characters) {
        console.log('No characters property in data');
        if (data.alternative_titles && Array.isArray(data.alternative_titles)) {
           // ... workaround logic ...
        }
        return [];
      }
      
      // Prefer nodes if available
      if (data.characters.nodes && Array.isArray(data.characters.nodes) && data.characters.nodes.length > 0) {
        console.log('Mapping characters from nodes with roles from edges');
        const rolesMap = new Map(data.characters.edges?.map((edge: any) => [edge.node?.id, edge.role]) || []);
        
        const mappedChars = data.characters.nodes
          .filter((node: any) => node?.id && node?.name)
          .map((char: any) => ({
              id: char.id || `char-${Math.random().toString(36).substring(2, 9)}`,
              name: char.name?.full || 'Unknown',
              image: char.image?.large || char.image?.medium || '/placeholder-character.jpg',
              role: rolesMap.get(char.id) || char.role || 'SUPPORTING', // Use rolesMap
              age: char.age || null,
              gender: char.gender || null,
              voiceActor: null
          }));
        console.log(`Mapped ${mappedChars.length} characters from nodes with roles`);
        return mappedChars;
      }
      
      // Fallback to edges if nodes aren't usable
      if (data.characters.edges && Array.isArray(data.characters.edges) && data.characters.edges.length > 0) {
        console.log('Mapping characters from edges data');
        const mappedChars = data.characters.edges
          .filter((edge: any) => edge?.node)
          .map((edge: any) => ({
              id: edge.node.id || `char-${Math.random().toString(36).substring(2, 9)}`,
              name: edge.node.name?.full || 'Unknown',
              image: edge.node.image?.large || edge.node.image?.medium || '/placeholder-character.jpg',
              role: edge.role || 'SUPPORTING',
              age: edge.node.age || null,
              gender: edge.node.gender || null,
              voiceActor: null
          }));
        console.log(`Mapped ${mappedChars.length} characters from edges`);
        return mappedChars;
      }
      
      // Handle flat array (potential database format)
      if (Array.isArray(data.characters)) {
          console.log('Mapping characters from array data (database format)');
          const mappedChars = data.characters
              .filter((char: any) => char)
              .map((char: any) => ({
                  id: char.id || `char-${Math.random().toString(36).substring(2, 9)}`,
                  name: char.name || 'Unknown',
                  image: char.image || '/placeholder-character.jpg',
                  role: char.role || 'SUPPORTING',
                  age: char.age || null,
                  gender: char.gender || null,
                  voiceActor: null
              }));
          console.log(`Mapped ${mappedChars.length} characters from array`);
          return mappedChars;
      }
      
      console.log('No usable character data found in any expected format');
      return [];
    } catch (err) {
      console.error('Error mapping characters:', err);
      return [];
    }
  }

  // Once processedData is defined, add the URL check effect here
  // Check for resume parameter in URL after processedData is defined
  useEffect(() => {
    if (processedData && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldResume = urlParams.get('resume') === 'true';
      const pageParam = urlParams.get('page');
      const startPage = pageParam ? parseInt(pageParam, 10) : 0;
      
      if (shouldResume && readingProgress) {
        // Find chapter index that matches the stored reading progress
        const chapterIndex = processedData.chapterList.findIndex(
          (ch: any) => ch.id === readingProgress.chapterId || 
                       ch.number === readingProgress.chapterNumber
        );
        
        if (chapterIndex !== -1) {
          // Use the page from URL if available, otherwise use the stored progress
          const initialPage = startPage || readingProgress.currentPage;
          setInitialReaderPage(initialPage);
          handleReadClick(chapterIndex, true);
        }
      }
    }
  }, [readingProgress, processedData]);

  // Check library status when comic data is loaded
  useEffect(() => {
    async function checkLibraryStatus() {
      if (comicId && processedData) {
        // Set view count from fetched data
        setViewCount(processedData.view_count ?? 0);
        try {
          const item = await getLibraryItem(comicId, 'comics');
          if (item) {
            setLibraryStatus(item.status);
          } else {
            setLibraryStatus(null);
          }
        } catch (error) {
          console.error("Error checking library status:", error);
          // Fallback to sync check for immediate feedback
          const item = getLibraryItemSync(comicId, 'comics');
          if (item) {
            setLibraryStatus(item.status);
          } else {
            setLibraryStatus(null);
          }
        }
      }
    }
    
    checkLibraryStatus();
  }, [comicId, processedData]);

  // Check subscription status when comic data and user ID are available
  useEffect(() => {
    async function checkSub() {
      if (comicId && userId) {
        // Conceptual: Call checkSubscription
        // const { success, subscribed } = await checkSubscription(userId, comicId);
        const success = true; // Placeholder
        const subscribed = false; // Placeholder
        if (success) {
          setIsSubscribed(subscribed);
        }
      }
    }
    checkSub();
  }, [comicId, userId]);

  // Handle subscription toggle
  const handleToggleSubscription = async () => {
    if (!isAuthenticated || !userId) {
      toast({ title: "გთხოვთ შეხვიდეთ გამოსაწერად.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!processedData) return;

    setIsSubProcessing(true);
    const originalSubscribed = isSubscribed;

    // Optimistic update
    setIsSubscribed(!originalSubscribed);

    try {
      // Conceptual: Call backend toggle function
      // const { success, subscribed, error } = await toggleSubscription(userId, comicId);
      const success = true; // Placeholder
      const subscribed = !originalSubscribed; // Placeholder
      const error: any = null; // Placeholder - explicitly type as any

      if (!success) {
        setIsSubscribed(originalSubscribed); // Revert optimistic update
        // Check error exists and has a message property before accessing it
        const errorMessage = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error';
        toast({ title: "Failed to update subscription", description: errorMessage, variant: "destructive" });
      } else {
        setIsSubscribed(subscribed); // Confirm state
        toast({ title: subscribed ? "გამოწერილია!" : "გამოწერა გაუქმებულია", description: `თქვენ ${subscribed ? 'მიიღებთ' : 'აღარ მიიღებთ'} შეტყობინებებს ${processedData?.title || 'ამ კომიქსზე'}.` });
      }
    } catch (err: any) { // Explicitly type caught err as any
      setIsSubscribed(originalSubscribed); // Revert on error
      toast({ title: "შეცდომა გამოწერისას", variant: "destructive" });
      console.error("Subscription toggle error:", err);
    } finally {
      setIsSubProcessing(false);
    }
  };

  const handleStatusChange = async (status: MediaStatus) => {
    if (!processedData) return;
    
    // Get total chapters as a number for progress tracking
    const totalChapters = typeof processedData.chapters === 'number' 
      ? processedData.chapters 
      : processedData.chapterList?.length || 0;
    
    // Get current progress from reading history
    const progress = readingProgress ? readingProgress.chapterNumber : 0;
    
    try {
      await updateItemStatus(
        comicId, 
        'comics', 
        status, 
        processedData.title, 
        processedData.coverImage,
        progress,
        totalChapters
      );
      
      setLibraryStatus(status);
      
      toast({
        title: "სტატუსი განახლდა",
        description: `"${processedData.title}" - აღინიშნა როგორც ${status ? status.replace('_', ' ') : 'ამოშლილია'}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "შეცდომა",
        description: "სტატუსის განახლება ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.",
        duration: 3000,
      });
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: MediaStatus | null) => {
    switch (status) {
      case 'reading':
        return { icon: <BookOpen className="h-5 w-5" />, label: 'ვკითხულობ', color: 'text-green-500' };
      case 'completed':
        return { icon: <CheckCheck className="h-5 w-5" />, label: 'დასრულებული', color: 'text-blue-500' };
      case 'on_hold':
        return { icon: <PauseCircle className="h-5 w-5" />, label: 'შეჩერებული', color: 'text-yellow-500' };
      case 'dropped':
        return { icon: <XCircle className="h-5 w-5" />, label: 'მიტოვებული', color: 'text-red-500' };
      case 'plan_to_read':
        return { icon: <Bookmark className="h-5 w-5" />, label: 'სამომავლოდ ვგეგმავ', color: 'text-purple-500' };
      default:
        return { icon: <Plus className="h-5 w-5" />, label: 'ბიბლიოთეკაში დამატება', color: 'text-gray-400' };
    }
  };

  const statusInfo = getStatusInfo(libraryStatus);

  // Add useEffect to check favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!userId || !comicId) return;
      
      try {
        // Get favorites from localStorage for now
        const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
        setIsFavorite(!!favorites[`comics-${comicId}`]);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };
    
    checkFavoriteStatus();
  }, [userId, comicId]);

  // Add function to toggle favorite status
  const handleToggleFavorite = async () => {
    if (!isAuthenticated || !userId) {
      toast({ title: "გთხოვთ შეხვიდეთ რჩეულებში დასამატებლად.", variant: "destructive" });
      router.push('/login');
      return;
    }
    
    try {
      // Toggle the state for immediate UI feedback
      setIsFavorite(!isFavorite);
      
      // For now, store favorites in localStorage
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      
      if (isFavorite) {
        // Remove from favorites
        delete favorites[`comics-${comicId}`];
      } else {
        // Add to favorites
        favorites[`comics-${comicId}`] = {
          id: comicId,
          type: 'comics',
          title: processedData?.title || '',
          image: processedData?.coverImage || '',
          addedAt: new Date().toISOString()
        };
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
      
      toast({
        title: !isFavorite ? "რჩეულებიდან წაშლა" : "რჩეულებში დამატება",
        description: !isFavorite 
          ? `"${processedData?.title}" დაემატა რჩეულებს.` 
          : `"${processedData?.title}\" წაიშალა რჩეულებიდან.`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      // Revert UI state if operation failed
      setIsFavorite(!isFavorite);
      toast({
        title: "შეცდომა",
        description: "რჩეულების განახლება ვერ მოხერხდა.",
        duration: 3000,
      });
    }
  };

  // --- Dynamic character grid columns ---
  const charactersToShow = processedData?.characters?.slice(0, 6) || [];
  const getCharacterColumns = (cnt: number) => {
    if (cnt <= 3) return cnt;         // 1-3 characters ⇒ single row
    if (cnt === 4) return 2;          // 4 characters ⇒ 2×2 grid
    return cnt % 3 === 1 ? 4 : 3;     // Balance for 5+ characters
  };
  const characterColumns = getCharacterColumns(charactersToShow.length);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-12 h-12 rounded-full border-4 border-t-purple-500 border-r-purple-500 border-b-purple-300 border-l-purple-300 animate-spin"></div>
      </div>
    );
  }

  // Not found state
  if (!processedData) {
    return (
      <div className="flex min-h-screen bg-black text-white">
         <AppSidebar /> {/* Add sidebar even for not found */}
         <div className="flex-1 flex justify-center items-center">
           <div className="text-center">
             <div className="mb-6">
               <img src="/images/mascot/confused.png" alt="Comics not found" className="mx-auto w-36 h-36" />
             </div>
             <h1 className="text-2xl font-bold mb-4">კომიქსი ვერ მოიძებნა</h1>
             <button onClick={() => router.back()} className="px-4 py-2 bg-purple-600 rounded-md">
               უკან დაბრუნება
             </button>
           </div>
         </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      {/* Add the sidebar */}
      <AppSidebar />
      
      <motion.div 
        ref={scrollRef}
        className="flex-1 min-h-screen text-white relative overflow-y-auto overflow-x-hidden" 
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Background image section - remove md:pl-20 */}
        <AnimatePresence>
          {!isLoading && processedData && (
            <motion.div 
              className="fixed inset-0 z-0" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* --- DEBUG LOG --- */}
              {(() => { console.log("[app/comics/[id]] Rendering Banner. processedData.bannerImage:", processedData?.bannerImage); return null; })()}
              {/* Background image - higher quality with better cropping */}
              <div
                className="absolute inset-0 bg-auto bg-top"
                style={{ 
                  // Explicitly prioritize bannerImage, fallback to coverImage
                  backgroundImage: `url(${processedData.bannerImage || processedData.coverImage || '/placeholder.svg'})`,
                }}
              />
              
              {/* Replace the simplified overlay div with the original gradient structure */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/100 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707]/100 via-[#070707]/0 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-l from-[#070707]/80 via-[#070707]/0 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#070707]/80 via-[#070707]/0 to-transparent" />
                <div 
                  className="absolute inset-0 bg-[#070707] transition-opacity duration-500 ease-in-out" 
                  style={{ opacity: overlayOpacity / 100 }}
                />
                <div className="absolute inset-0 opacity-30" 
                  style={{ 
                    backgroundImage: 'url("/noise-texture.png")',
                    backgroundRepeat: 'repeat',
                    mixBlendMode: 'overlay'
                  }} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 py-6 pb-20">
          {/* Back button */}
          <motion.button 
            onClick={handleBackClick} 
            className="flex items-center gap-6 text-gray-400 hover:text-white mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{isReaderOpen ? "დახურვა" : "უკან დაბრუნება"}</span>
          </motion.button>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BannerSkeleton />
              </motion.div>
            ) : isReaderOpen ? (
              <motion.div
                key="reader"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {processedData.georgianTitle || processedData.title}: {processedData.chapterList[selectedChapter]?.title || `თავი ${processedData.chapterList[selectedChapter]?.number}`}
                    </h2>
                    <span className="text-gray-400">{processedData.chapterList[selectedChapter]?.releaseDate}</span>
                  </div>
                </div>

                <MangaReader
                  chapter={processedData.chapterList[selectedChapter]}
                  onClose={() => setIsReaderOpen(false)}
                  chapterList={processedData.chapterList}
                  onChapterSelect={setSelectedChapter}
                  mangaId={comicId}
                  mangaTitle={processedData.title}
                  initialPage={initialReaderPage}
                />
              </motion.div>
            ) : (
              <motion.div
                key="details"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0 }}
              >
                {/* Manga header */}
                <motion.div 
                  className="flex flex-col md:flex-row gap-8 mt-24 mb-12"
                  variants={itemVariants}
                >
                  {/* Cover image - Adjust width slightly */}
                  <motion.div 
                    className="w-full sm:w-60 md:w-[260px] flex-shrink-0 mx-auto md:mx-0" /* Center on mobile */
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative">
                      <ImageSkeleton
                        src={processedData.coverImage || "/placeholder.svg"}
                        alt={processedData.title}
                        className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl"
                      />
                    </div>
                    {/* Emoji Rating Component Added Below CoverImage */}
                    <motion.div 
                      className="w-full sm:w-60 md:w-[260px] mx-auto md:mx-0 mt-4"
                    >
                      {/* Simplified EmojiRating call - it handles its own data */}
                      {processedData && (
                        <EmojiRating 
                          contentId={comicId} 
                          contentType="comics"
                        />
                      )}
                    </motion.div>
                  </motion.div>

                  {/* Details */}
                  {/* Center text on mobile */} 
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2 text-sm">
                      <div className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full">
                        {(() => {
                          const map: Record<string, string> = {
                            completed: "დასრულებული",
                            ongoing: "გამოდის",
                            publishing: "გამოდის",
                            hiatus: "შეჩერებული",
                            on_hold: "შეჩერებული",
                            dropped: "მიტოვებული",
                            cancelled: "გაუქმებული",
                            reading: "ვკითხულობ",
                            plan_to_read: "წასაკითხი",
                          };
                          const key = String(processedData.status).toLowerCase().replace(" ", "_");
                          return map[key] || processedData.status;
                        })()}
                      </div>
                      
                      {viewCount !== null && (
                        <div className="flex items-center gap-1.5 text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
                          <Eye className="h-4 w-4 text-primary/80" />
                          <span>{viewCount.toLocaleString()} ნახვა</span>
                        </div>
                      )}
                    </div>
                
                    {/* Display native title as subtitle if no Georgian title */}
                    {!processedData.georgianTitle && processedData.subtitle && (
                      <motion.h2 
                        className="text-4xl font-bold mb-2"
                        variants={itemVariants}
                      >
                        {processedData.subtitle}
                      </motion.h2>
                    )}

                    <motion.h1 
                      className="text-xl text-gray-400 mb-4"
                      variants={itemVariants}
                    >
                      {processedData.georgianTitle || processedData.title}
                    </motion.h1>

                    {/* Responsive grid columns for details */}
                    <motion.div 
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 text-sm justify-items-center md:justify-items-start" /* Adjusted grid/justify */
                      variants={itemVariants}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        <span>{processedData.releaseDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <span>
                          {typeof processedData.chapters === 'number' 
                            ? `${processedData.chapters} თავი${processedData.chapters !== 1 ? '' : ''}`
                            : `${processedData.chapters} თავები`
                          }
                        </span>
                      </div>
                      {/* Add rating here */}
                      {processedData.rating !== null && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium text-white">{processedData.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">/10</span>
                        </div>
                      )}
                      {/* Add view count here */}
                      {processedData.view_count !== undefined && processedData.view_count !== null && (
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span>{processedData.view_count.toLocaleString()} ნახვა</span>
                        </div>
                      )}
                    </motion.div>

                    <motion.p 
                      className="text-gray-300 mb-8 max-w-3xl"
                      variants={itemVariants}
                    >
                      {processedData.synopsis}
                    </motion.p>
                  </div>
                </motion.div>

                {/* Button alignment */}
                <motion.div 
                  className="mt-8">
                   {/* Make buttons stack on mobile */}
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full max-w-xs sm:max-w-none mx-auto sm:mx-0 md:w-auto justify-center md:justify-start"
                    variants={itemVariants}
                  >
                    {readingProgress ? (
                      <motion.button
                        className=" px-6 py-3 flex justify-center bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-900/20 font-medium"
                        onClick={() => handleReadClick(0, true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <BookOpen className="h-5 w-5" />
                        კითხვის გაგრძელება
                        <span className="ml-1 text-xs bg-purple-500 px-2 py-0.5 rounded-full">
                          {readingProgress.chapterNumber}
                        </span>
                      </motion.button>
                    ) : (
                      <motion.button
                        className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center md:justify-start gap-2 shadow-lg shadow-purple-900/20 font-medium"
                        onClick={() => handleReadClick(0)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <BookOpen className="h-5 w-5" />
                        კითხვის დაწყება
                      </motion.button>
                    )}
                    
                    {/* Library Status Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          style={{height: "52px"}}
                          className="w-full md:w-auto bg-black/30 border-gray-700 hover:border-gray-500 flex justify-center md:justify-start"
                        >
                          <span className={statusInfo.color}>{statusInfo.icon}</span>
                          <span className="ml-2">{statusInfo.label}</span>
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      
                      <DropdownMenuContent className="w-48 bg-gray-900/95 backdrop-blur-md border-white/10">
                        <DropdownMenuItem 
                          className={libraryStatus === 'reading' ? "bg-green-900/20 text-green-400" : ""} 
                          onClick={() => handleStatusChange('reading')}
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          <span>ვკითხულობ</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'plan_to_read' ? "bg-purple-900/20 text-purple-400" : ""} 
                          onClick={() => handleStatusChange('plan_to_read')}
                        >
                          <Bookmark className="mr-2 h-4 w-4" />
                          <span>სამომავლოდ ვგეგმავ</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'completed' ? "bg-blue-900/20 text-blue-400" : ""} 
                          onClick={() => handleStatusChange('completed')}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          <span>დასრულებული</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'on_hold' ? "bg-yellow-900/20 text-yellow-400" : ""} 
                          onClick={() => handleStatusChange('on_hold')}
                        >
                          <PauseCircle className="mr-2 h-4 w-4" />
                          <span>შეჩერებული</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'dropped' ? "bg-red-900/20 text-red-400" : ""} 
                          onClick={() => handleStatusChange('dropped')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          <span>მიტოვებული</span>
                        </DropdownMenuItem>

                        {libraryStatus && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-gray-400"
                              onClick={() => {
                                setLibraryStatus(null);
                                updateItemStatus(comicId, 'comics', null, '', '', 0, 0);
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              <span>ბიბლიოთეკიდან ამოშლა</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Favorite Button */}
                    <motion.button
                      className={cn(
                        "p-2 border rounded-md transition-colors flex items-center gap-1.5 text-sm h-[52px]",
                        "w-full md:w-auto justify-center md:justify-start",
                        isFavorite 
                          ? "bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30"
                          : "text-gray-300 hover:text-white border-gray-700 hover:border-gray-500 hover:bg-white/5"
                      )}
                      onClick={handleToggleFavorite}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title={isFavorite ? "რჩეულებიდან წაშლა" : "რჩეულებში დამატება"}
                    >
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={isFavorite ? 
                          { scale: 1.2 } : 
                          { scale: 1 }
                        }
                        whileTap={{ scale: 0.8 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 500,
                          damping: 10
                        }}
                      >
                        <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
                      </motion.div>
                      <span>{isFavorite ? "რჩეულია" : "რჩეულებში დამატება"}</span>
                    </motion.button>

                    {/* Subscribe Button */}
                    <motion.button
                      className={cn(
                        "p-2 border rounded-md transition-colors flex items-center gap-1.5 text-sm h-[52px]",
                        "w-full md:w-auto justify-center md:justify-start",
                        isSubscribed 
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30"
                          : "text-gray-300 hover:text-white border-gray-700 hover:border-gray-500 hover:bg-white/5"
                      )}
                      onClick={handleToggleSubscription}
                      disabled={isSubProcessing}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title={isSubscribed ? "გამოწერის გაუქმება" : "ახალი თავების გამოწერა"}
                    >
                      {isSubProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSubscribed ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                      <span>{isSubscribed ? "გამოწერილია" : "გამოწერა"}</span>
                    </motion.button>
                  </motion.div>
                </motion.div>

                {/* --- RESTORED CONTENT SECTIONS START --- */}
                {/* Main content container - Make single column on mobile */}
                <div className="flex flex-col mt-8 mb-12">
                <div className="flex flex-col-reverse sm:flex-row gap-8 items-stretch">
                {/* Left side: Chapters list */}
                    <div className="lg:w-3/5 order-2 lg:order-1"> {/* Chapters second on mobile */}
                      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold">თავები</h2>
                        
                        {/* Enhanced Chapter selection dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              className="bg-black/40 border border-white/10 hover:border-purple-500/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
                              whileHover={{ scale: 1.02, backgroundColor: "rgba(128, 90, 213, 0.2)" }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <BookOpen className="h-4 w-4 text-purple-400" />
                              <span>{readingProgress ? 'კითხვის გაგრძელება' : 'თავის არჩევა'}</span>
                              <ChevronDown className="h-4 w-4 text-purple-400 ml-1" />
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            className="bg-gray-900/95 backdrop-blur-md border-white/10 border max-h-[400px] overflow-y-auto w-[300px]"
                          >
                            <div className="p-3 sticky top-0 bg-gray-900/95 border-b border-gray-700/50 flex items-center justify-between">
                              <span className="font-semibold text-sm">თავების სია</span>
                              <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full">
                                {processedData?.chapterList?.length} თავი
                              </span>
                            </div>
                            
                            {/* Simple chapter list for dropdown */}
                            <div className="py-2">
                              {processedData?.chapterList?.map((chapter: any, index: number) => {
                                const chapterId = chapter.id || `chapter-${chapter.number}`;
                                const readPercentage = getReadPercentage(comicId, chapterId);
                                const isCurrentlyReading = readingProgress?.chapterId === chapterId || readingProgress?.chapterNumber === chapter.number;
                                
                                return (
                                  <div 
                                    key={`chapter-dropdown-${index}`}
                                    onClick={() => handleReadClick(index)}
                                    className={cn(
                                      "flex items-center p-2 hover:bg-purple-900/20 rounded cursor-pointer transition-colors mx-2",
                                      isCurrentlyReading && "bg-purple-900/20 text-purple-300"
                                    )}
                                  >
                                    <div className={cn(
                                      "h-7 w-7 rounded-full flex items-center justify-center text-xs mr-3 flex-shrink-0",
                                      isCurrentlyReading 
                                        ? "bg-purple-700 text-white ring-2 ring-purple-500/50" 
                                        : readPercentage > 0 
                                          ? "bg-green-700/70 text-white" 
                                          : "bg-gray-800"
                                    )}>
                                      {chapter.number}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-sm truncate">{chapter.title}</span>
                                        {isCurrentlyReading && (
                                          <BookOpen className="h-4 w-4 flex-shrink-0 text-purple-400 ml-1" />
                                        )}
                                      </div>
                                      
                                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                                        <CalendarDays className="h-3 w-3 mr-1" />
                                        {chapter.releaseDate}
                                      </div>
                                      
                                      {readPercentage > 0 && (
                                        <div className="mt-2 w-full">
                                          <Progress 
                                            value={readPercentage} 
                                            className="h-1.5 bg-gray-800/50" 
                                            indicatorClassName={isCurrentlyReading ? "bg-purple-500" : "bg-green-500"}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Responsive chapter list - SCROLLABLE CONTAINER */}
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-h, overflow-y-auto, pr-2 for scrollbar */} 
                        {processedData?.chapterList?.map((chapter: any, index: number) => {
                          const chapterId = chapter.id || `chapter-${chapter.number}`;
                          const readPercentage = getReadPercentage(comicId, chapterId); // Use comicId here
                          const isCurrentlyReading = readingProgress?.chapterId === chapterId || readingProgress?.chapterNumber === chapter.number;
                          
                          return (
                            <motion.div
                              key={`chapter-${index}`}
                              onClick={() => handleReadClick(index)} // Make entire div clickable
                              className={cn(
                                "flex items-center justify-between bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden transition-all duration-200",
                                "hover:bg-purple-600/20 hover:border-purple-500/40 cursor-pointer group" // Enhanced hover, added group
                              )}
                              whileHover={{ scale: 1.02, y: -2 }} // Slightly more noticeable hover scale
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center flex-1 p-3 md:p-4">
                                <div className={cn(
                                  "h-10 w-10 md:h-12 md:w-12 rounded-lg flex items-center justify-center text-lg mr-3 md:mr-4 flex-shrink-0 font-semibold transition-colors duration-200", // Larger, rounded-lg, font-semibold
                                  isCurrentlyReading 
                                    ? "bg-purple-600 text-white ring-2 ring-purple-400/50 group-hover:bg-purple-500"
                                    : readPercentage === 100
                                      ? "bg-green-600 text-white group-hover:bg-green-500"
                                      : readPercentage > 0
                                        ? "bg-sky-600 text-white group-hover:bg-sky-500" // Different color for in-progress
                                        : "bg-gray-700 group-hover:bg-gray-600 text-gray-300"
                                )}>
                                  {chapter.number} {/* Display chapter number directly */}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-sm md:text-base truncate group-hover:text-purple-300 transition-colors duration-200">
                                    {chapter.title} {/* Removed "Chapter {chapter.number}:" */}
                                  </h3>
                                  
                                  <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                    <CalendarDays className="h-3 w-3" />
                                    {chapter.releaseDate}
                                    
                                    {readPercentage > 0 && (
                                      <span className={cn(
                                        "ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium", // Use ml-auto to push to the right
                                        isCurrentlyReading ? "bg-purple-500/80 text-white"
                                        : readPercentage === 100 ? "bg-green-500/80 text-white"
                                        : "bg-sky-500/80 text-white"
                                      )}>
                                        {isCurrentlyReading ? "მიმდინარე" 
                                          : readPercentage === 100 ? "დასრულებულია"
                                          : `${readPercentage}% წაკითხულია`}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {readPercentage > 0 && readPercentage < 100 && !isCurrentlyReading && (
                                    <div className="mt-2 w-full max-w-xs">
                                      <Progress 
                                        value={readPercentage} 
                                        className="h-1 bg-gray-700/50 group-hover:bg-gray-600/50" 
                                        indicatorClassName="bg-sky-500 group-hover:bg-sky-400"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* REMOVED READ BUTTON */}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Right side: Characters grid */}
                    <div className="lg:w-2/5 order-1 lg:order-2 flex flex-col h-full"> {/* Characters first on mobile */}
                      <h2 className="text-xl font-bold mb-4">პერსონაჟები</h2>
                      
                      {/* Display characters section in the UI */}
                      {processedData?.characters && processedData.characters.length > 0 && (
                        <div className="overflow-hidden">
                          {/* Display up to 6 characters in a fixed 3 x 2 grid so everything fits without scrolling */}
                          <div
                            className="grid gap-4"
                            style={{ gridTemplateColumns: `repeat(${characterColumns}, minmax(0, 1fr))` }}
                          >
                            {charactersToShow.map((character: any) => (
                              <div 
                                key={character.id} 
                                className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors h-full flex flex-col"
                              >
                                <div className="aspect-[3/4] relative overflow-hidden w-full">
                                  <img 
                                    src={character.image} 
                                    alt={character.name}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder-character.jpg';
                                    }}
                                  />
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          toggleCharacterFavorite(character);
                                      }}
                                      className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                                      title={favoriteCharacters[character.id] ? "Remove from favorites" : "Add to favorites"}
                                  >
                                      <Heart
                                          className={cn(
                                              "h-4 w-4 transition-all",
                                              favoriteCharacters[character.id] ? "text-red-500 fill-red-500" : "text-white"
                                          )}
                                      />
                                  </button>
                                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/60 to-transparent p-2 pt-10">
                                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block font-semibold text-sm ${
                                      character.role === 'MAIN' 
                                        ? 'bg-purple-500/90 text-white' 
                                        : character.role === 'SUPPORTING' 
                                          ? 'bg-blue-500/80 text-white' 
                                          : 'bg-gray-500/80 text-white'
                                    }`}>
                                      {character.role === 'MAIN' ? 'მთავარი' : 
                                       character.role === 'SUPPORTING' ? 'მეორეხარისხოვანი' : 'მეორადი'}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                  <h3 className="font-semibold text-sm break-words" title={character.name}>
                                    {character.name}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    {character.gender && (
                                      <span className="text-xs text-muted-foreground bg-gray-800/60 px-1.5 py-0.5 rounded">
                                        {character.gender}
                                      </span>
                                    )}
                                    {character.age && (
                                      <span className="text-xs text-muted-foreground bg-gray-800/60 px-1.5 py-0.5 rounded">
                                        {character.age} years
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    
                      {/* Right side (continued): Related/Recommended - Move inside the same column div */}
                      {/* Adjust spacing */} 
                      {/* Related manga */} 
                      {processedData.relations && processedData.relations.length > 0 && (
                        <motion.section 
                          className="mb-12 mt-8 sm:mt-8" /* Consistent margin top */
                          variants={sectionVariants}
                          initial="initial" /* Add animation props */
                          animate="animate"
                        >
                          <motion.h2 
                            className="text-xl font-bold mb-6 flex items-center"
                            variants={itemVariants}
                          >
                            <ChevronRight className="mr-2 h-5 w-5 text-purple-400" />
                            მსგავსი შიგთავსი
                          </motion.h2>
                          <RelatedContent items={processedData.relations} />
                        </motion.section>
                      )}

                      {/* Recommendations */} 
                      {processedData.recommendations && processedData.recommendations.length > 0 && (
                        <motion.section
                          className="mb-12"
                          variants={sectionVariants}
                          initial="initial" /* Add animation props */
                          animate="animate"
                        >
                          <motion.h2 
                            className="text-xl font-bold mb-6 flex items-center"
                            variants={itemVariants}
                          >
                            <Bookmark className="mr-2 h-5 w-5 text-purple-400" />
                            რეკომენდებული
                          </motion.h2>
                          <RecommendedContent items={processedData.recommendations} />
                        </motion.section>
                      )}
                    </div>

                  </div>
                  {/* Add Chapter Manager & Comments after the main grid layout */}
                  <div className="sm:col-span-2 order-3 w-full mt-16">
                    {/* Add Chapter Manager as a separate section but only if from database AND user is admin */}
                      {isFromDatabase && isAdminCheckComplete && isAdmin && (
                        <motion.section 
                          className="mb-12 mt-8"
                          variants={sectionVariants}
                          initial="initial" /* Add animation props */
                          animate="animate"
                        >
                          <ChapterManager 
                            contentId={comicId}
                            onChaptersUpdated={fetchComicData}
                            initialChapters={processedData.chapterList.map((chapter: any) => ({
                              id: chapter.id || `temp-${chapter.number}`,
                              number: chapter.number,
                              title: chapter.title,
                              releaseDate: formatSafeDate(chapter.releaseDate),
                              thumbnail: chapter.thumbnail,
                              pages: Array.isArray(chapter.pages) ? chapter.pages : []
                            }))}
                          />
                        </motion.section>
                      )}

                      {/* VIP promotion banner – only for არავიპ */}
                      <VipPromoBanner className="mb-12" />

                      {/* Comments section */}
                      <CommentSection 
                        contentId={comicId}
                        contentType="comics"
                        sectionVariants={sectionVariants} // Pass variants
                        itemVariants={itemVariants}     // Pass variants
                      />
                    </div>
                </div>
                {/* --- RESTORED CONTENT SECTIONS END --- */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Animated logo loader overlay */}
      {showLogoLoader && processedData && (
        <LogoLoader
          src={(processedData as any).logo || processedData.coverImage || processedData.bannerImage || '/placeholder.svg'}
          onComplete={() => setLogoAnimationDone(true)}
        />
      )}
    </div>
  )
} 