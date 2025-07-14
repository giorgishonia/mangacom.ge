"use client"

import { useState, useEffect } from "react"
import { motion as m, AnimatePresence, useMotionValue, useSpring } from "framer-motion"
import { ChevronRight, Search, Play, Plus, Star, CalendarDays, Clock, Info, ArrowRight, TrendingUp, BookOpen, Calendar, Heart, Book, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentCardHover } from "@/components/content-card-hover"
import { TypewriterText } from "@/components/typewriter-text"
import { MangaView } from "@/components/manga-view"
import { getAllContent, getChapterCountsByLanguage } from "@/lib/content"
import { BannerSkeleton, CategorySkeleton, CarouselSkeleton } from "@/components/ui/skeleton"
import { ImageSkeleton } from "@/components/image-skeleton"
import AssistantChat from "@/components/assistant-chat"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Filter, SortDesc, Grid, List, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { hasMangaBeenRead, getMangaProgress, getRecentlyRead, getLatestChapterRead, calculateMangaProgressByChapter } from "@/lib/reading-history"
import Image from "next/image"
import Link from "next/link"
import NextImage from "next/image"
import { MangaCard } from "@/components/manga-view"
import Flag from 'react-world-flags'

// Define interface for content data from our database
interface ContentData {
  id: string
  title: string
  description: string | null
  thumbnail: string
  bannerImage?: string
  rating?: number
  status: string
  genres: string[]
  type: 'manga' | 'comics'
  release_year?: number
  season?: string
  georgian_title?: string
  chapters_count?: number // Added for manga
  publisher?: string      // Added for comics
  view_count?: number     // Added for view count
  alternative_titles?: string[]
}

// Define interface for featured content data
interface FeaturedContentData {
  id: string;
  title: string;
  englishTitle?: string | null;
  bannerImage: string;
  thumbnail: string;
  type: 'manga' | 'comics';
  chaptersDisplay: string;
  totalChapters: number;
  rating: number;
  status: string;
  genres: string[];
  view_count: number;
  description: string;
  release_year?: number;
  georgianChapters?: number;
  englishChapters?: number;
}

// Animation variants for page transitions
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

// Animation variants for hero content
const heroVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const contentVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const filterVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

// Add a helper function to check if content is favorited
function isContentFavorited(id: string, type: 'manga' | 'comics'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const contentKey = `${type}-${id}`;
    return !!favorites[contentKey];
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

// Add a helper function to toggle favorite status
function toggleContentFavorite(
  id: string, 
  type: 'manga' | 'comics', 
  title: string, 
  image: string
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const contentKey = `${type}-${id}`;
    
    if (favorites[contentKey]) {
      // Remove from favorites
      delete favorites[contentKey];
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites
      favorites[contentKey] = {
        id,
        type,
        title,
        image,
        addedAt: new Date().toISOString()
      };
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return true;
    }
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    return false;
  }
}

export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    ongoing: "გამოდის",
    completed: "დასრულებული",
    hiatus: "შეჩერებული",
    cancelled: "გაუქმებული",
    publishing: "გამოდის",
    on_hold: "შეჩერებული",
    dropped: "მიტოვებული",
    reading: "ვკითხულობ",
    plan_to_read: "წასაკითხი",
  }
  return map[status.toLowerCase()] || status
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"manga" | "comics">("manga") // Default to manga
  const [currentFeatured, setCurrentFeatured] = useState(0)
  const [isChanging, setIsChanging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("ყველა")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null) // Use string ID for hover
  const [isLoading, setIsLoading] = useState(true) // Main loading for initial data fetch
  const [isTabLoading, setIsTabLoading] = useState(false) // Loading state for tab transitions
  const [hoveredContentType, setHoveredContentType] = useState<"MANGA" | "COMICS">("MANGA") // Default to MANGA
  const [featuredContent, setFeaturedContent] = useState<FeaturedContentData[]>([]) // Combined featured content
  const [availableManga, setAvailableManga] = useState<any[]>([])
  const [availableComics, setAvailableComics] = useState<any[]>([])
  const [isFeaturedFavorite, setIsFeaturedFavorite] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  // Tilt motion values for featured thumbnail
  const thumbRotateX = useMotionValue(0);
  const thumbRotateY = useMotionValue(0);
  // Use raw motion values for instantaneous response
  const thumbSpringX = thumbRotateX;
  const thumbSpringY = thumbRotateY;

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'a-z' | 'z-a'>('popular')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [recentlyRead, setRecentlyRead] = useState<any[]>([])

  // Ensure "ყველა" is set as the default category on initial render
  useEffect(() => {
    // Force "ყველა" to be the default selected category on first render
    if (selectedCategory !== "ყველა") {
      setSelectedCategory("ყველა");
    }
  }, []);

  // Fetch data from our database
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch all available manga
        const mangaResponse = await getAllContent('manga', 20);
        
        // Fetch all available comics
        const comicsResponse = await getAllContent('comics', 20);
        
        let transformedManga: any[] = [];
        let transformedComics: any[] = [];
        
        // Get chapter counts by language for all content
        const allContentIds = [
          ...(mangaResponse.success && mangaResponse.content ? mangaResponse.content.map(c => c.id) : []),
          ...(comicsResponse.success && comicsResponse.content ? comicsResponse.content.map(c => c.id) : [])
        ];
        const chapterCounts = await getChapterCountsByLanguage(allContentIds);
        
        if (mangaResponse.success && mangaResponse.content) {
          transformedManga = mangaResponse.content.map((content: ContentData) => {
            // --- DEBUG: Log raw values before transformation
            console.log(`[page.tsx manga map] ID: ${content.id}, Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
            
            // Improved chapter count extraction
            let chapterCount = 0;
            
            // First try to get from chapters_count field (preferred)
            if (typeof content.chapters_count === 'number' && !isNaN(content.chapters_count)) {
              chapterCount = content.chapters_count;
            }
            // Then try to access potential dynamic properties
            else {
              const rawContent = content as any; // Cast to any to access potentially dynamic fields
              
              if (typeof rawContent.chapters === 'number' && !isNaN(rawContent.chapters)) {
                chapterCount = rawContent.chapters;
              }
              else if (typeof rawContent.chapters === 'string' && rawContent.chapters) {
                const extracted = parseInt(rawContent.chapters.replace(/[^\d]/g, ''), 10);
                if (!isNaN(extracted)) {
                  chapterCount = extracted;
                }
              }
              // Debugging info for chapter count extraction
              console.log(`[page.tsx] Manga ${content.id} chapter extraction:`, {
                chapters_count: content.chapters_count,
                rawChapters: rawContent.chapters,
                finalCount: chapterCount
              });
            }
            
            // Get chapter counts by language for this content
            const contentChapterCounts = chapterCounts[content.id] || { georgian: 0, english: 0 };
            
            return {
              id: content.id,
              // Determine Georgian title from explicit column or alternative_titles
              ...(function() {
                const georgianTitle = (content.georgian_title && typeof content.georgian_title === 'string' && content.georgian_title.trim() !== '')
                  ? content.georgian_title
                  : (Array.isArray(content.alternative_titles)
                      ? (() => {
                          const geoEntry = content.alternative_titles.find((t: string) => typeof t === 'string' && t.startsWith('georgian:'));
                          return geoEntry ? geoEntry.substring(9) : null;
                        })()
                      : null);
                return {
                  title: georgianTitle || content.title,
                  englishTitle: georgianTitle ? content.title : null,
                };
              })(),
              description: content.description || "აღწერა არ არის ხელმისაწვდომი",
              image: (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail,
              thumbnail: content.thumbnail,
              rating: content.rating || 0,
              status: content.status,
              chaptersDisplay: chapterCount > 0 ? `${chapterCount} თავი` : "0 თავი",
              totalChapters: chapterCount,
              georgianChapters: contentChapterCounts.georgian,
              englishChapters: contentChapterCounts.english,
              genres: content.genres,
              type: 'manga',
              view_count: content.view_count ?? 0,
              release_year: content.release_year
            }
          }).filter((content: {image?: string}) => content.image);
          
          setAvailableManga(transformedManga);
        }

        // Handle comics content
        if (comicsResponse.success && comicsResponse.content) {
          transformedComics = comicsResponse.content.map((content: ContentData) => {
            console.log(`[page.tsx comics map] ID: ${content.id}, Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
            
            // Extract chapter count for comics - similar to manga
            let chapterCount = 0;
            
            if (typeof content.chapters_count === 'number' && !isNaN(content.chapters_count)) {
              chapterCount = content.chapters_count;
            } else {
              const rawContent = content as any;
              
              if (typeof rawContent.chapters === 'number' && !isNaN(rawContent.chapters)) {
                chapterCount = rawContent.chapters;
              }
              else if (typeof rawContent.chapters === 'string' && rawContent.chapters) {
                const extracted = parseInt(rawContent.chapters.replace(/[^\d]/g, ''), 10);
                if (!isNaN(extracted)) {
                  chapterCount = extracted;
                }
              }
              console.log(`[page.tsx] Comics ${content.id} chapter extraction:`, {
                chapters_count: content.chapters_count,
                rawChapters: rawContent.chapters,
                finalCount: chapterCount
              });
            }
            
            // Get chapter counts by language for this content
            const contentChapterCounts = chapterCounts[content.id] || { georgian: 0, english: 0 };
            
            return {
              id: content.id,
              // Determine Georgian title from explicit column or alternative_titles
              ...(function() {
                const georgianTitle = (content.georgian_title && typeof content.georgian_title === 'string' && content.georgian_title.trim() !== '')
                  ? content.georgian_title
                  : (Array.isArray(content.alternative_titles)
                      ? (() => {
                          const geoEntry = content.alternative_titles.find((t: string) => t.startsWith('georgian:'));
                          return geoEntry ? geoEntry.substring(9) : null;
                        })()
                      : null);
                return {
                  title: georgianTitle || content.title,
                  englishTitle: georgianTitle ? content.title : null,
                };
              })(),
              description: content.description || "აღწერა არ არის ხელმისაწვდომი",
              image: (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail,
              thumbnail: content.thumbnail,
              rating: content.rating || 0,
              status: content.status,
              chaptersDisplay: chapterCount > 0 ? `${chapterCount} თავი` : "0 თავი",
              totalChapters: chapterCount,
              georgianChapters: contentChapterCounts.georgian,
              englishChapters: contentChapterCounts.english,
              genres: content.genres,
              type: 'comics',
              publisher: content.publisher || '',
              view_count: content.view_count ?? 0,
              release_year: content.release_year
            }
          }).filter((content: {image?: string}) => content.image);
          
          setAvailableComics(transformedComics);
        }

        // FEATURED CONTENT MAPPING
        if (transformedManga.length > 0 || transformedComics.length > 0) {
          const combinedFeaturedSource = [...transformedManga.slice(0, 5), ...transformedComics.slice(0, 5)];
          if (combinedFeaturedSource.length > 0) {
             setFeaturedContent(combinedFeaturedSource.map(content => ({
               id: content.id,
               title: content.title, 
               englishTitle: content.englishTitle,
               bannerImage: content.image, 
               thumbnail: content.thumbnail,
               type: content.type as 'manga' | 'comics',
               chaptersDisplay: content.chaptersDisplay, 
               totalChapters: content.totalChapters,
               georgianChapters: content.georgianChapters,
               englishChapters: content.englishChapters,
               rating: content.rating,
               status: content.status,
               genres: content.genres,
               view_count: content.view_count,
               description: content.description,
               release_year: content.release_year
             })));

            // Moved console.log inside the block where combinedFeaturedSource is defined
            console.log("Sample of combinedFeaturedSource before setting state (first item):");
            console.log(combinedFeaturedSource.length > 0 ? combinedFeaturedSource[0] : 'No items in combinedFeaturedSource');
            console.log("--- End of featured content processing log ---");

          }
        } else {
          setFeaturedContent([]);
        }

      } catch (error) {
        console.error("Error fetching initial data:", error);
        // Set empty arrays on error to prevent crashes, but log the error
        setFeaturedContent([]);
        setAvailableManga([]);
        setAvailableComics([]);
      } finally {
        setIsLoading(false);
        // Remove console.log for combinedFeaturedSource from here if it was duplicated
      }
    }

    fetchData();
  }, []); // Removed activeTab from dependency array to prevent re-fetch on tab change

  // Keep featured list in sync with active tab
  const activeFeatured = featuredContent.filter((c) => c.type === activeTab);

  // Reset slider index when tab or list changes
  useEffect(() => {
    setCurrentFeatured(0);
  }, [activeTab, activeFeatured.length]);

  // Change featured content every 7 seconds
  useEffect(() => {
    if (activeFeatured.length <= 1) return; // Don't cycle if only one item
    
    const interval = setInterval(() => {
      setIsChanging(true)
      // Preload the next image briefly before transition
      if (activeFeatured.length > 0) {
        const nextIndex = (currentFeatured + 1) % activeFeatured.length;
        const img = new window.Image();
        img.src = activeFeatured[nextIndex].bannerImage;
      }
      
      setTimeout(() => {
        setCurrentFeatured((prev) => (prev + 1) % activeFeatured.length)
        setIsChanging(false)
      }, 400) // Slightly faster transition
    }, 7000)

    return () => clearInterval(interval)
  }, [activeFeatured, currentFeatured])

  // Update content type based on active tab
  useEffect(() => {
    if (activeTab === "manga") {
      setHoveredContentType("MANGA")
    } else if (activeTab === "comics") {
      setHoveredContentType("COMICS")
    }
  }, [activeTab])

  // Handle tab changes with smooth transitions
  const handleTabChange = (tab: "manga" | "comics") => {
    if (tab === activeTab) return;
    
    setIsTabLoading(true);
    // Wait for exit animation
    setTimeout(() => {
      setActiveTab(tab);
      setSelectedCategory("ყველა"); // Reset category on tab change
      // Wait for new content to mount before removing loading state
      setTimeout(() => {
        setIsTabLoading(false);
      }, 300); 
    }, 300); 
  };

  const featured = activeFeatured[currentFeatured];

  // Prepare categories dynamically based on available content
  const mangaCategories = availableManga.reduce((acc, manga) => {
    manga.genres?.forEach((genre: string) => {
      if (!acc.includes(genre)) acc.push(genre);
    });
    return acc;
  }, [] as string[]);
  
  const comicsCategories = availableComics.reduce((acc, comic) => {
    comic.genres?.forEach((genre: string) => {
      if (!acc.includes(genre)) acc.push(genre);
    });
    return acc;
  }, [] as string[]);

  // Update the featured favorite status when featured content changes
  useEffect(() => {
    if (featured) {
      setIsFeaturedFavorite(isContentFavorited(featured.id, featured.type));
      
      // Debug log for featured content
      console.log("Featured content:", {
        id: featured.id,
        type: featured.type,
        title: featured.title,
        chapters: featured.chaptersDisplay,
      });
    }
  }, [featured]);
  
  // Add a handle favorite function
  const handleFeaturedFavoriteToggle = () => {
    if (!featured) return;
    
    const newStatus = toggleContentFavorite(
      featured.id, 
      featured.type, 
      featured.title, 
      featured.bannerImage
    );
    
    setIsFeaturedFavorite(newStatus);
  };

  useEffect(() => {
    setSearchQuery('')
    setSortBy('popular')
    setSelectedGenres([])
    setFilterOpen(false)
    setViewMode('grid')
  }, [activeTab])

  const availableGenres = activeTab === 'manga' ? mangaCategories : comicsCategories
  let filteredContent = activeTab === 'manga' ? availableManga : availableComics
  if (searchQuery) {
    filteredContent = filteredContent.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.englishTitle && c.englishTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }
  if (selectedGenres.length > 0) {
    filteredContent = filteredContent.filter(c => selectedGenres.every(g => c.genres.includes(g)))
  }
  switch (sortBy) {
    case 'popular':
      filteredContent.sort((a,b) => (b.view_count || 0) - (a.view_count || 0))
      break
    case 'newest':
      filteredContent.sort((a,b) => (b.release_year || 0) - (a.release_year || 0))
      break
    case 'a-z':
      filteredContent.sort((a,b) => a.title.localeCompare(b.title))
      break
    case 'z-a':
      filteredContent.sort((a,b) => b.title.localeCompare(a.title))
      break
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const history = getRecentlyRead(5)
      const readItems = history.map(item => ({
        id: item.mangaId,
        title: item.mangaTitle,
        thumbnail: item.mangaThumbnail,
        chapters: `თავი ${item.chapterNumber}`,
        status: item.currentPage === item.totalPages ? "დასრულებულია" : "მიმდინარე",
        readDate: new Date(item.lastRead).toLocaleDateString(),
        readProgress: Math.round((item.currentPage / item.totalPages) * 100),
        currentPage: item.currentPage,
        totalPages: item.totalPages,
        chapterTitle: item.chapterTitle,
        chapterNumber: item.chapterNumber,
      }))
      setRecentlyRead(readItems)
    }
  }, [])

  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Featured Content */} 
        <section className="relative w-full h-[300px] md:h-[330px]  px-4 pt-16 md:px-0 md:pt-0">
          {/* --- DEBUG LOG --- */}
          {(() => { console.log("[app/page.tsx] Rendering Banner. featured.image:", featured?.bannerImage); return null; })()}
          <AnimatePresence mode="wait">
            {isLoading || !featured ? (
              <m.div
                key="banner-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <BannerSkeleton />
              </m.div>
            ) : (
              <m.div
                key={featured.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: isChanging ? 0.3 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 w-full h-[40vh]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-in-out"
                  style={{
                    backgroundImage: `url(${featured.bannerImage})`,
                    filter: isChanging ? "brightness(0.4)" : "brightness(0.6)", // Slightly darker
                  }}
                />
                
                {/* Simplified gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] to-transparent opacity-100" />
                {/* Light left gradient for text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707] to-transparent opacity-0" /> 
                {/* Subtle noise texture */}
                <div className="absolute inset-0 bg-[url('/noise-texture.png')] opacity-[0.03]"></div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Content positioned correctly with padding */} 
          <div className="absolute top-16 left-0 right-0 pb-18 md:pb-0 px-4 md:px-8 lg:px-24 z-10 mt-0">
            <AnimatePresence mode="wait">
              {isLoading || !featured ? (
                <div className="space-y-4 mt-[-100px]"> {/* Adjust spacing for skeleton */} 
                </div>
              ) : (
                <m.div
                  key={`${featured.id}-content`}
                  variants={heroVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex flex-col md:flex-row items-start gap-6 relative max-w-screen-xl mx-auto"
                >
                  {/* Featured Thumbnail - Hide on small screens */}
                  <m.div 
                    className="hidden md:block w-32 h-48 lg:w-40 lg:h-60 rounded-xl overflow-hidden border-2 border-white/10 shadow-white/20 shadow-[0_0_25px_rgba(139,92,246,0.3)] flex-shrink-0 relative group/thumbnail"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{ perspective: 800, rotateX: thumbSpringX, rotateY: thumbSpringY, transformStyle: "preserve-3d" }}
                    onMouseMove={(e) => {
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const posX = e.clientX - rect.left - rect.width / 2;
                      const posY = e.clientY - rect.top - rect.height / 2;
                      const maxDeg = 10;
                      // Invert direction so card tilts toward cursor position
                      thumbRotateY.set((-posX / (rect.width / 2)) * maxDeg);
                      thumbRotateX.set((posY / (rect.height / 2)) * maxDeg);
                    }}
                    onMouseLeave={() => {
                      thumbRotateX.set(0);
                      thumbRotateY.set(0);
                    }}
                  >
                    
                    <div className="w-full h-full overflow-hidden rounded-lg">
                      <img
                        src={featured.thumbnail}
                        alt={featured.title}
                        className="w-full h-full object-cover transition-transform duration-300 transform-origin-center"
                      />
                    </div>

                    {/* Favorite button for featured content thumbnail */}
                    {featured && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent navigation if the link is on parent
                                handleFeaturedFavoriteToggle();
                            }}
                            className={cn(
                                "absolute top-2 right-2 z-20 p-1.5 rounded-full transition-all duration-300 backdrop-blur-sm border",
                                isFeaturedFavorite 
                                    ? "bg-red-500/30 border-red-500/50 text-red-400"
                                    : "bg-black/50 border-white/20 text-white/80 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40",
                                "opacity-0 group-hover/thumbnail:opacity-100" // Control opacity with group-hover/thumbnail
                            )}
                            aria-label={isFeaturedFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <m.div
                                initial={{ scale: 1 }}
                                animate={{ scale: isFeaturedFavorite ? 1.1 : 1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                            >
                                <Heart className={cn("w-3.5 h-3.5", isFeaturedFavorite && "fill-current")} />
                            </m.div>
                        </button>
                    )}
                  </m.div>
                  
                  <div className="flex-1 min-w-0">
                    <m.h1
                      className="font-extrabold text-white mb-1 truncate max-w-full"
                      variants={heroVariants}
                    >
                      <TypewriterText text={featured.title} />
                    </m.h1>
                        
                    {featured.englishTitle && (
                      <m.h2
                        className="text-lg md:text-xl text-gray-400 mb-3"
                        variants={heroVariants}
                      >
                        {featured.englishTitle}
                      </m.h2>
                    )}
                        
                    <m.div 
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 text-xs md:text-sm"
                      variants={heroVariants}
                    >
                      {featured.type === 'manga' || featured.type === 'comics' ? ( // Combined condition
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                          {featured.georgianChapters !== undefined && featured.englishChapters !== undefined ? (
                            <div className="flex items-center gap-2">
                              {featured.georgianChapters > 0 && (
                                <div className="flex items-center gap-1">
                                  <Flag code="GE" style={{ width: '12px', height: '8px' }} />
                                  <span>{featured.georgianChapters}</span>
                                </div>
                              )}
                              {featured.englishChapters > 0 && (
                                <div className="flex items-center gap-1">
                                  <Flag code="GB" style={{ width: '12px', height: '8px' }} />
                                  <span>{featured.englishChapters}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{featured.chaptersDisplay}</span>
                          )}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Calendar className="h-3.5 w-3.5 text-purple-400" />
                        <span>{translateStatus(featured.status)}</span>
                      </div>
                      {featured.view_count !== undefined && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Eye className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.view_count.toLocaleString()} ნახვა</span>
                        </div>
                      )}
                      {featured.release_year && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <CalendarDays className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.release_year}</span>
                        </div>
                      )}
                      {featured.rating > 0 && (
                        <div className="flex items-center gap-1.5 text-yellow-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="font-medium">{featured.rating}</span>
                        </div>
                      )}
                    </m.div>
                        
                    {/* Description with text fade mask effect */}
                    <m.div 
                      className="relative mb-6 w-fit"
                      variants={heroVariants}
                    >
                      <div 
                        className="max-h-[90px] md:max-h-[120px] w-fit overflow-scroll no-scrollbar"
                        style={{
                          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
                        }}
                      >
                        <p className="text-sm leading-relaxed mb-[24px] max-w-xl text-gray-300">
                          {featured.description}
                        </p>
                      </div>
                    </m.div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab Navigation - Simplified */} 
          <m.div 
            className="absolute bottom-[-63px] left-0 right-0 flex justify-center z-20 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            <m.div 
              className="bg-gray-900/10 border border-gray-800/20 rounded-xl p-1 shadow-md flex gap-1"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              {[ 
                { label: "მანგა", value: "manga" },
                { label: "კომიქსი", value: "comics" }
              ].map((tab) => (
                <m.button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.value ? "bg-purple-600/20 text-white" : "text-gray-400 hover:text-white"
                  )}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">{tab.label}</span>
                </m.button>
              ))}
            </m.div>
          </m.div>
          
          {/* Featured content pagination dots */} 
          {activeFeatured.length > 1 && (
            <div className="absolute bottom-[-7px] md:bottom-[-7px] left-0 right-0 flex justify-center z-20">
              <m.div 
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {activeFeatured.map((_, index) => (
                  <m.button
                    key={`dot-${index}`}
                    className={`rounded-full ${
                      currentFeatured === index 
                        ? 'bg-white w-3 h-3' 
                        : 'bg-white/40 w-3 h-3'
                    }`}
                    onClick={() => {
                      if (currentFeatured === index || isChanging) return;
                      setIsChanging(true);
                      setTimeout(() => {
                        setCurrentFeatured(index);
                        setIsChanging(false);
                      }, 400);
                    }}
                  />
                ))}
              </m.div>
            </div>
          )}
        </section>

        {/* Content based on active tab - Simplified layout */}
        <div className="px-4 py-8 min-h-[500px] pt-20 md:pl-[100px]">
          <AnimatePresence mode="wait">
            {isTabLoading ? (
              <m.div
                key="tab-loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <CategorySkeleton count={8} />
                <CarouselSkeleton count={6} />
              </m.div>
            ) : (
              <m.div
                key={activeTab}
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className=" mx-auto"
              >
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 z-20">
                    <h2 className="text-2xl font-bold self-start md:self-center">{activeTab === 'manga' ? 'მანგის' : 'კომიქსის'} ბიბლიოთეკა</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full sm:w-full md:w-64">
                        <input
                          type="text"
                          placeholder="ძიება..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-black/30 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm w-full md:w-64 focus:outline-none focus:border-purple-500/50"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto bg-black/30 border-white/10 rounded-full h-9 flex items-center justify-center sm:justify-start gap-2">
                            <SortDesc className="h-4 w-4" />
                            <span>დალაგება</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40 bg-gray-900/95 backdrop-blur-md border-white/10 text-white">
                          <DropdownMenuLabel>დალაგების ვარიანტები</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className={sortBy === "popular" ? "bg-purple-500/10 text-purple-400" : ""} onClick={() => setSortBy("popular")}>პოპულარობით</DropdownMenuItem>
                          <DropdownMenuItem className={sortBy === "newest" ? "bg-purple-500/10 text-purple-400" : ""} onClick={() => setSortBy("newest")}>უახლესი</DropdownMenuItem>
                          <DropdownMenuItem className={sortBy === "a-z" ? "bg-purple-500/10 text-purple-400" : ""} onClick={() => setSortBy("a-z")}>სათაური (ა-ჰ)</DropdownMenuItem>
                          <DropdownMenuItem className={sortBy === "z-a" ? "bg-purple-500/10 text-purple-400" : ""} onClick={() => setSortBy("z-a")}>სათაური (ჰ-ა)</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="outline" size="sm" onClick={() => setFilterOpen(!filterOpen)} className={cn("w-full sm:w-auto bg-black/30 border-white/10 rounded-full h-9", filterOpen && "bg-purple-900/20 border-purple-500/30 text-purple-400")}>
                        <Filter className="h-4 w-4 mr-2" />
                        <span>ფილტრი</span>
                      </Button>
                      <div className="flex md:visible hidden rounded-full overflow-hidden border border-white/10 bg-black/30 w-full sm:w-auto justify-center">
                        <Button variant="ghost" size="sm" onClick={() => setViewMode("grid")} className={cn("h-9 px-3 rounded-none", viewMode === "grid" ? "bg-white/10 text-white" : "text-gray-400")}>
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setViewMode("list")} className={cn("h-9 px-3 rounded-none", viewMode === "list" ? "bg-white/10 text-white" : "text-gray-400")}>
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {filterOpen && (
                      <m.div
                        variants={filterVariants}
                        initial="initial"
                        animate="animate"
                        exit="initial"
                        className="mb-6 p-4 bg-gradient-to-br from-gray-900/40 to-gray-800/20 backdrop-blur-md rounded-xl border border-white/5 shadow-lg"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium flex items-center">
                            <Filter className="h-4 w-4 mr-2 text-purple-400" />
                            ფილტრი ჟანრის მიხედვით
                          </h3>
                          {selectedGenres.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedGenres([])} className="h-8 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                              ყველას გასუფთავება
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableGenres.map((genre: string) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className={cn(
                                "cursor-pointer hover:bg-white/10 transition-all duration-300",
                                selectedGenres.includes(genre) 
                                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-glow-sm-purple" 
                                  : "bg-black/30 hover:border-white/30"
                              )}
                              onClick={() => {
                                if (selectedGenres.includes(genre)) {
                                  setSelectedGenres(selectedGenres.filter(g => g !== genre))
                                } else {
                                  setSelectedGenres([...selectedGenres, genre])
                                }
                              }}
                            >
                              {genre}
                              {selectedGenres.includes(genre) && (
                                <X className="ml-1 h-3 w-3" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      ნაპოვნია <span className="text-white font-medium">{filteredContent.length}</span> {activeTab === 'manga' ? 'მანგა' : 'კომიქსი'}
                      {selectedGenres.length > 0 && (
                        <> | გაფილტრული <span className="text-purple-400">{selectedGenres.length}</span> {selectedGenres.length !== 1 ? 'ჟანრებით' : 'ჟანრით'}</>
                      )}
                      {searchQuery && (
                        <> | ძიებით "<span className="text-purple-400">{searchQuery}</span>"</>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      დალაგებულია: <span className="text-purple-400">
                        {sortBy === "popular" ? "პოპულარობით" : 
                         sortBy === "newest" ? "უახლესით" :
                         sortBy === "a-z" ? "სათაური (ა-ჰ)" : "სათაური (ჰ-ა)"}
                      </span>
                    </div>
                  </div>
                  {activeTab === "manga" && (
                    <MangaView
                      hoveredCard={hoveredCard}
                      setHoveredCard={setHoveredCard}
                      contentData={filteredContent}
                      contentType='manga'
                    />
                  )}
                  {activeTab === "comics" && (
                    <MangaView
                      hoveredCard={hoveredCard}
                      setHoveredCard={setHoveredCard}
                      contentData={filteredContent}
                      contentType='comics'
                    />
                  )}
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {recentlyRead.length > 0 && (
  <section className="pt-8 px-4 md:px-8 md:pl-[100px]"
  >
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center text-white">
          კითხვის გაგრძელება
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white group"
          onClick={() => router.push("/history")}
        >
          ყველას ნახვა <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-3 md:gap-4">
        {recentlyRead.map((item, index) => {
          const mappedItem = {
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail,
            genres: [],
            status: item.status,
            chapters: `${item.chapterNumber} / ?`,
            totalChapters: item.totalPages,
            view_count: 0,
            release_year: undefined,
            description: item.chapterTitle,
            englishTitle: undefined,
            rating: 0,
            type: activeTab,
            currentPage: item.currentPage,
            totalPages: item.totalPages,
            chapterNumber: item.chapterNumber,
            readDate: item.readDate
          }
          return (
            <div key={`recent-${item.id}-${index}`} className="rounded-xl">
              <MangaCard 
                content={mappedItem}
                index={index}
                isContinueReading={true}
              />
            </div>
          )
        })}
      </div>
    </m.div>
  </section>
)}
      </main>

      {/* Card hover overlay */} 
      {hoveredCard !== null && ( 
        <ContentCardHover 
          id={hoveredCard} 
          onClose={() => setHoveredCard(null)} 
          contentType={hoveredContentType} 
        />
      )}

      {/* Floating mascot assistant */}
      <img
        src="/images/mascot/mascot-assistant.png"
        alt="Mascot helper"
        onClick={() => setChatOpen((p) => !p)}
        className="hidden md:block fixed bottom-6 right-6 w-20 cursor-pointer hover:scale-105 transition-transform animate-bounce-slow opacity-90"
      />

      {/* Assistant chat popup */}
      <AssistantChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
