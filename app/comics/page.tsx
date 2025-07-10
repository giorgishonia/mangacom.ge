"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { 
  ChevronRight, 
  Search, 
  Heart, 
  BookOpen, 
  Star, 
  CalendarDays, 
  Clock, 
  Filter,
  SortDesc,
  ArrowUpDown,
  X,
  TrendingUp,
  BookMarked,
  Grid,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { TypewriterText } from "@/components/typewriter-text"
import { getAllContent } from "@/lib/content"
import { BannerSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import Link from "next/link"
import { hasMangaBeenRead, getMangaProgress, getRecentlyRead, getLatestChapterRead, calculateMangaProgressByChapter } from "@/lib/reading-history"
import { MangaView } from "@/components/manga-view"

// Define interface for comics data
interface ComicsData {
  id: string
  title: string
  englishTitle?: string | null
  description: string
  image: string
  thumbnail: string
  rating: number
  status: string
  chapters: string
  genres: string[]
  release_year?: number
  totalChapters?: number
  view_count?: number
  alternative_titles?: string[]
}

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const heroVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 1.05, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const filterVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

// Helper function to check if content is favorited
function isComicsFavorited(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    return !!favorites[`comics-${id}`];
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

// Helper function to toggle favorite status
function toggleComicsFavorite(comics: ComicsData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const comicsKey = `comics-${comics.id}`;
    
    if (favorites[comicsKey]) {
      // Remove from favorites
      delete favorites[comicsKey];
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites
      favorites[comicsKey] = {
        id: comics.id,
        type: 'comics',
        title: comics.title,
        image: comics.thumbnail,
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

export default function ComicsPage() {
  // State
  const [featuredComics, setFeaturedComics] = useState<ComicsData[]>([])
  const [comics, setComics] = useState<ComicsData[]>([])
  const [currentFeatured, setCurrentFeatured] = useState(0)
  const [isChanging, setIsChanging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<string>("popular")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [isFeaturedFavorite, setIsFeaturedFavorite] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Add state for recently read comics
  const [recentlyRead, setRecentlyRead] = useState<any[]>([])
  
  // Fetch data
  useEffect(() => {
    async function fetchComics() {
      try {
        // Fetch all available comics
        const comicsResponse = await getAllContent('comics', 100);
        
        if (comicsResponse.success && comicsResponse.content) {
          // Transform data for comics
          const transformedComics = comicsResponse.content.map((content: any) => {
            const chapterCount = typeof content.chapters_count === 'number' ? content.chapters_count :
                                 (typeof content.chapters === 'number' ? content.chapters : 
                                 (typeof content.chapters === 'string' ? parseInt(content.chapters.replace(/[^\d]/g, ''), 10) : 0));
            return {
              id: content.id,
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
              chapters: chapterCount > 0 ? `${chapterCount} თავი` : "0 თავი",
              totalChapters: chapterCount,
              genres: content.genres || [],
              release_year: content.release_year,
              view_count: content.view_count ?? 0
            }
          }).filter((content: {image?: string}) => content.image);
          
          setComics(transformedComics);
          
          // Extract all unique genres
          const genres = new Set<string>();
          transformedComics.forEach((comic: ComicsData) => {
            comic.genres?.forEach(genre => genres.add(genre));
          });
          setAvailableGenres(Array.from(genres).sort());
          
          // Use top rated comics for featured
          const topRated = [...transformedComics]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5);
            
          setFeaturedComics(topRated);
        }
        
        setIsFetching(false);
        
        // Small delay before removing loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error("Error fetching comics data:", error);
        setIsFetching(false);
        setIsLoading(false);
      }
    }
    
    fetchComics();
  }, []);

  // Change featured content every 7 seconds
  useEffect(() => {
    if (featuredComics.length === 0) return;
    
    const interval = setInterval(() => {
      setIsChanging(true)
      setTimeout(() => {
        setCurrentFeatured((prev) => (prev + 1) % featuredComics.length)
        setIsChanging(false)
      }, 500)
    }, 7000)

    return () => clearInterval(interval)
  }, [featuredComics]);
  
  // Sort comics based on current sort option
  const sortedComics = [...comics].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return b.rating - a.rating;
      case "newest":
        return (b.release_year || 0) - (a.release_year || 0);
      case "a-z":
        return a.title.localeCompare(b.title);
      case "z-a":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });
  
  // Filter comics based on selected genres and search query
  const filteredComics = sortedComics.filter(comic => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comic.englishTitle && comic.englishTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by selected genres
    const matchesGenres = selectedGenres.length === 0 || 
      selectedGenres.every(genre => comic.genres?.includes(genre));
    
    return matchesSearch && matchesGenres;
  });
  
  // Get featured comic
  const featured = featuredComics[currentFeatured] || {
    id: "",
    title: "იტვირთება...",
    description: "კონტენტი იტვირთება...",
    image: "/placeholder.svg",
    thumbnail: "/placeholder.svg",
    rating: 0,
    status: "იტვირთება",
    chapters: "0 თავი",
    genres: []
  };

  // Fetch recently read comics from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const history = getRecentlyRead(5); // Get 5 most recently read items
      
      // Map the reading progress to match our comics data format
      const readItems = history.map(item => ({
        id: item.mangaId, // Use mangaId from history
        title: item.mangaTitle, // Use mangaTitle from history
        thumbnail: item.mangaThumbnail, // Use mangaThumbnail from history
        chapters: `თავი ${item.chapterNumber}`,
        status: item.currentPage === item.totalPages ? "დასრულებულია" : "მიმდინარე",
        readDate: new Date(item.lastRead).toLocaleDateString(),
        readProgress: Math.round((item.currentPage / item.totalPages) * 100),
        currentPage: item.currentPage,
        totalPages: item.totalPages,
        chapterTitle: item.chapterTitle,
        chapterNumber: item.chapterNumber,
      }));
      
      setRecentlyRead(readItems);
    }
  }, []);

  // Update featured favorite status when it changes
  useEffect(() => {
    if (featured?.id) {
      setIsFeaturedFavorite(isComicsFavorited(featured.id));
    }
  }, [featured?.id]);
  
  // Handle toggling favorite for featured comics
  const handleFeaturedFavoriteToggle = () => {
    if (!featured) return;
    
    const newStatus = toggleComicsFavorite(featured);
    setIsFeaturedFavorite(newStatus);
  };

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Featured Banner */}
        <section className="relative w-full h-[360px] md:h-[420px] lg:h-[460px] overflow-hidden">
          <AnimatePresence mode="wait">
            {isFetching ? (
              <m.div
                key="banner-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <BannerSkeleton />
              </m.div>
            ) : (
              <m.div
                key={featured.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: isChanging ? 0.3 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 w-full h-full"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${featured.image})`,
                    filter: isChanging ? "brightness(0.5)" : "brightness(0.7)",
                  }}
                />
                
                {/* Enhanced gradient overlays for a perfect transition */}
                {/* Main vertical gradient - much stronger at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-transparent opacity-90" />
                {/* Side gradient for text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent to-transparent opacity-50" />
                {/* Stronger bottom gradient for completely seamless transition */}
                <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#070707] to-transparent" />
                {/* Extra intense gradient at the very bottom for perfect blending */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[#070707]" style={{ maskImage: 'linear-gradient(to top, #070707, transparent)', WebkitMaskImage: 'linear-gradient(to top, #070707, transparent)' }} />
                {/* Subtle texture overlay */}
                <div className="absolute inset-0 bg-[#070707]/20" />

                {/* Background particles/accents */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
              </m.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 md:bottom-12 md:left-8 z-10 md:pl-24 lg:pl-32">
            <AnimatePresence mode="wait">
              {isFetching ? (
                <div className="space-y-4 w-full">
                  {/* Empty space for skeleton */}
                </div>
              ) : (
                <m.div
                  key={featured.id}
                  variants={heroVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  <div className="relative w-full md:max-w-5xl rounded-t-xl md:rounded-xl overflow-hidden">
                    {/* Top pill badge for trending */}
                    <div className="absolute top-0 right-0 left-0 flex justify-center">
                      <m.div 
                        className="text-white px-6 py-1.5 rounded-b-xl transform -translate-y-px"
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-300" />
                          <span className="font-medium text-sm tracking-wide">ტრენდულია</span>
                        </div>
                      </m.div>
                    </div>
                    
                    {/* Main content with glass effect */}
                    <div className="flex flex-col md:flex-row items-start gap-8 p-6 md:p-8 pt-10 relative z-10">
                      {/* Left side - Image */}
                      <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="hidden md:block"
                      >
                        <Link href={`/comics/${featured.id}`} className="block relative group/thumbnail">
                          <div 
                            className="w-40 h-56 md:w-48 md:h-72 rounded-xl overflow-hidden border-2 border-white/10 shadow-white/20 shadow-[0_0_25px_rgba(139,92,246,0.3)] group/thumbnail cursor-pointer relative"
                          >
                            {/* Favorite button positioned at top right */}
                            <m.button
                              className={`absolute top-2 right-2 z-30 p-1.5 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300 ${
                                isFeaturedFavorite 
                                  ? "bg-red-500/20 border border-red-500/50 text-red-400" 
                                  : "bg-black/50 border border-white/10 text-white opacity-0 group-hover/thumbnail:opacity-100"
                              }`}
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeaturedFavoriteToggle();
                              }}
                            >
                              <Heart className={`h-4 w-4 ${isFeaturedFavorite ? "fill-red-500 text-red-400" : ""}`} />
                            </m.button>
                            
                            <m.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.3 }}
                              className="w-full h-full relative"
                            >
                              <img
                                src={featured.thumbnail || "/placeholder.svg"}
                                alt={featured.title}
                                className="w-full h-full object-cover transition-all duration-300 group-hover/thumbnail:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/thumbnail:opacity-100 transition-opacity duration-300"></div>
                            </m.div>
                          </div>
                        </Link>
                      </m.div>
                      
                      {/* Right side - Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title animation with gradient text */}
                        <m.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="group/title"
                        >
                          <Link href={`/comics/${featured.id}`} className="block">
                            <h1 className="font-extrabold text-white leading-tight truncate max-w-full group-hover/title:text-purple-400 transition-colors">
                              <TypewriterText text={featured.title} />
                            </h1>
                            
                            {/* Show English title if it exists */}
                            {featured.englishTitle && (
                              <h2 className="text-lg md:text-xl font-medium text-gray-400 mt-1 group-hover/title:text-purple-400 transition-colors">
                                {featured.englishTitle}
                              </h2>
                            )}
                          </Link>
                        </m.div>
                        
                        {/* Content meta info with enhanced style */}
                        <m.div 
                          className="flex flex-wrap items-center gap-2 my-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 }}
                        >

                          {featured.rating > 0 && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-800/30 to-amber-800/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-500/20 shadow-sm">
                              <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                              <span className="text-sm font-medium text-white">{featured.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10">
                            <BookOpen className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-white">{featured.chapters || "0 თავი"}</span>
                          </div>
                          
                          {featured.release_year && (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10">
                              <CalendarDays className="h-4 w-4 text-purple-400" />
                              <span className="text-sm font-medium text-white">{featured.release_year}</span>
                            </div>
                          )}
                          
                          {featured.genres && featured.genres.slice(0, 3).map((genre, i) => (
                            <div key={i} className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
                              <span className="text-sm font-medium text-white/80">{genre}</span>
                            </div>
                          ))}
                        </m.div>
                        
                        {/* Description with text fade mask effect */}
                        <m.div
                          className="relative mt-3 mb-6"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        >
                          <div className="max-h-[120px] md:max-h-[170px] overflow-y-auto no-scrollbar desc-mask">
                            <p className="text-sm md:text-base leading-relaxed text-gray-300">{featured.description}</p>
                          </div>
                        </m.div>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Featured content pagination dots */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
            <m.div 
              className="flex gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {featuredComics.map((_, index) => (
                <m.button
                  key={`dot-${index}`}
                  className={`rounded-full transition-all duration-300 ${
                    currentFeatured === index 
                      ? 'bg-white/70 w-[22px] h-[10px]'
                      : 'bg-white/30 w-2.5 h-2.5 hover:bg-white/50'
                  }`}
                  onClick={() => {
                    setIsChanging(true);
                    setTimeout(() => {
                      setCurrentFeatured(index);
                      setIsChanging(false);
                    }, 500);
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </m.div>
          </div>
        </section>

        {/* Comics Catalog Section */}
        <section className="px-8 py-8 sm:pl-[20px] lg:pl-[100px] md:-mt-16 lg:-mt-20">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            {/* Controls: Search, Sort, Filter - Stack on mobile */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 z-10">
              <h2 className="text-2xl font-bold self-start md:self-center">კომიქსების ბიბლიოთეკა</h2>
              
              {/* Wrap controls for better stacking */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search input - Make full width on mobile */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="კომიქსის ძიება..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm w-full focus:outline-none focus:border-purple-500/50"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                
                {/* Sort dropdown */}
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
                    <DropdownMenuItem 
                      className={sortBy === "popular" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("popular")}
                    >
                      პოპულარობით
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={sortBy === "newest" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("newest")}
                    >
                      უახლესი
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={sortBy === "a-z" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("a-z")}
                    >
                      სათაური (ა-ჰ)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={sortBy === "z-a" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("z-a")}
                    >
                      სათაური (ჰ-ა)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Filter button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={cn(
                    "w-full sm:w-auto bg-black/30 border-white/10 rounded-full h-9",
                    filterOpen && "bg-purple-900/20 border-purple-500/30 text-purple-400"
                  )}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span>ფილტრი</span>
                </Button>
                
                {/* View toggle */}
                <div className="flex rounded-full overflow-hidden border border-white/10 bg-black/30 w-full sm:w-auto justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "h-9 px-3 rounded-none",
                      viewMode === "grid" ? "bg-white/10 text-white" : "text-gray-400"
                    )}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "h-9 px-3 rounded-none",
                      viewMode === "list" ? "bg-white/10 text-white" : "text-gray-400"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Filter panel */}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGenres([])}
                        className="h-8 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        ყველას გასუფთავება
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {availableGenres.map((genre) => (
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
                            setSelectedGenres(selectedGenres.filter(g => g !== genre));
                          } else {
                            setSelectedGenres([...selectedGenres, genre]);
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
            
            {/* Content stats and info */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                ნაჩვენებია <span className="text-white font-medium">{filteredComics.length}</span> კომიქსი
                {selectedGenres.length > 0 && (
                  <> ფილტრი: <span className="text-purple-400">{selectedGenres.length} ჟანრი{selectedGenres.length !== 1 && 'ს'}</span></>
                )}
                {searchQuery && (
                  <> მოიძებნა: "<span className="text-purple-400">{searchQuery}</span>"</>
                )}
              </div>
              
              <div className="text-sm text-gray-400">
                დალაგებულია: <span className="text-purple-400">
                  {sortBy === "popular" ? "პოპულარობით" : 
                   sortBy === "newest" ? "უახლესი" :
                   sortBy === "a-z" ? "სათაური (ა-ჰ)" : "სათაური (ჰ-ა)"}
                </span>
              </div>
            </div>
            
            {/* USE MangaView component here */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <CategorySkeleton count={12} />
              ) : (
                <MangaView 
                  key={`view-${viewMode}-sort-${sortBy}-filter-${selectedGenres.join()}-search-${searchQuery}`} // Key to force re-render
                  contentData={filteredComics.map(c => ({ ...c, type: 'comics' }))} // Pass filtered data with type
                  categories={availableGenres} // Pass available genres
                  selectedCategory={selectedGenres[0] || 'ყველა'} // Pass first selected or 'ყველა'
                  setSelectedCategory={(category) => { // Handle category selection
                    if (category === 'ყველა') {
                      setSelectedGenres([]);
                    } else {
                      setSelectedGenres([category]);
                    }
                  }}
                  contentType='comics' // Specify content type
                  hoveredCard={null} // Assuming MangaView manages hover internally
                  setHoveredCard={() => {}} // Dummy function
                />
              )}
            </AnimatePresence>
          </m.div>
        </section>
      </main>
    </div>
  )
}

// Animation variants for staggered children
const contentVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { opacity: 0 }
}; 