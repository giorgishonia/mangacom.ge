"use client"

import { useEffect, useState, useRef } from "react"
import { useMotionValue, useSpring } from "framer-motion"
import { Star, ChevronRight, BookOpen, Plus, Clock, Info, Calendar, Heart, CalendarDays, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getAllContent, getTrendingContent } from "@/lib/content"
import { CardSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"
import { cn, translateGenre } from "@/lib/utils"
import { hasMangaBeenRead, getMangaProgress, getLatestChapterRead, calculateMangaProgressByChapter } from "@/lib/reading-history"
import { useAuth } from '@/components/supabase-auth-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

// Helper function for drag scrolling
function setupDragScroll(element: HTMLDivElement | null) {
  if (!element) return () => {};
  
  let isDown = false;
  let startX: number;
  let scrollLeft: number;
  
  const mouseDown = (e: MouseEvent) => {
    isDown = true;
    element.classList.add("active", "cursor-grabbing");
    startX = e.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  };
  
  const mouseLeave = () => {
    isDown = false;
    element.classList.remove("active", "cursor-grabbing");
  };
  
  const mouseUp = () => {
    isDown = false;
    element.classList.remove("active", "cursor-grabbing");
  };
  
  const mouseMove = (e: MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const walk = (x - startX) * 1;
    element.scrollLeft = scrollLeft - walk;
  };
  
  element.style.cursor = 'grab';
  
  element.addEventListener("mousedown", mouseDown);
  element.addEventListener("mouseleave", mouseLeave);
  element.addEventListener("mouseup", mouseUp);
  element.addEventListener("mousemove", mouseMove);
  
  return () => {
    element.removeEventListener("mousedown", mouseDown);
    element.removeEventListener("mouseleave", mouseLeave);
    element.removeEventListener("mouseup", mouseUp);
    element.removeEventListener("mousemove", mouseMove);
    element.style.cursor = 'default';
  };
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1]
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
};

const cardHoverVariants = {
  initial: { scale: 1, y: 0, boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)" },
  hover: { 
    scale: 1.03,
    y: -6,
    boxShadow: "0px 15px 25px rgba(99, 102, 241, 0.2), 0px 5px 10px rgba(0,0,0, 0.1)",
    transition: { 
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Update interface to match ContentItem structure from page.tsx
interface ContentItem {
  id: string;
  title: string;
  englishTitle?: string | null;
  description?: string | null;
  thumbnail: string;
  banner_image?: string;
  rating?: number;
  status?: string;
  chapters?: string;
  genres?: string[];
  type: 'manga' | 'comics';
  release_year?: number;
  totalChapters?: number;
  view_count?: number;
}

interface MangaViewProps {
  selectedCategory?: string
  setSelectedCategory: (category: string) => void
  categories: string[]
  hoveredCard: string | null
  setHoveredCard: (id: string | null) => void
  contentData?: ContentItem[]
  contentType?: 'manga' | 'comics'
}

interface FriendStatus {
  user_id: string
  username: string | null
  avatar_url: string | null
  status: string
}

const statusSentence = (name: string, status: string) => {
  const base = name || 'მეგობარი'
  switch (status) {
    case 'reading':
      return `${base} კითხულობს`;
    case 'completed':
      return `${base}-ს აქვს დასრულებული`;
    case 'on_hold':
      return `${base}-ს აქვს შეჩერებული`;
    case 'dropped':
      return `${base}-ს აქვს მიტოვებული`;
    case 'plan_to_read':
      return `${base}-ს აქვს წასაკითხი`;
    case 'watching':
      return `${base} კითხულობს`;
    case 'plan_to_watch':
      return `${base}-ს აქვს წასაკითხი`;
    default:
      return `${base}`;
  }
}

// Helper function to check if content is favorited based on type
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

// Helper function to toggle favorite status based on type
function toggleContentFavorite(content: ContentItem): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const contentKey = `${content.type}-${content.id}`;
    
    if (favorites[contentKey]) {
      // Remove from favorites
      delete favorites[contentKey];
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites
      favorites[contentKey] = {
        id: content.id,
        type: content.type,
        title: content.title,
        image: content.thumbnail,
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

// Manga Card Component 
function MangaCard({ content, index }: { content: ContentItem; index: number }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasBeenRead = hasMangaBeenRead(content.id);
  const latestChapterRead = getLatestChapterRead(content.id);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const disableTiltRef = useRef(false);
  const { user, session } = useAuth();
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus[]>([]);
  
  // Check favorite status on mount
  useEffect(() => {
    setIsFavorite(isContentFavorited(content.id, content.type));
  }, [content.id, content.type]);
  
  // Fetch friend statuses via API route (avoids client-side RLS issues)
  useEffect(() => {
    const fetchStatuses = async () => {
      if (!user?.id) return;
      try {
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/friends/status/${content.id}`, {
          headers,
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.statuses)) {
          console.log(`Friend statuses for content ${content.id}:`, json.statuses);
          setFriendStatuses(json.statuses as FriendStatus[]);
        } else {
          console.log(`No friend statuses for content ${content.id}. Response:`, json);
        }
      } catch (error) {
        console.error('friend status fetch error', error);
      }
    };

    fetchStatuses();
  }, [user?.id, session?.access_token, content.id]);
  
  // Extract total chapters from manga data
  // First check if totalChapters is already available as a numeric property
  // Otherwise parse it from the chapters string
  const totalChapters = content.totalChapters !== undefined ? content.totalChapters : 
    (content.chapters ? parseInt(content.chapters.replace(/[^\d]/g, '')) || 0 : 0);
  
  // Calculate overall manga progress
  const progressPercentage = hasBeenRead ? 
    calculateMangaProgressByChapter(latestChapterRead, totalChapters) : 0;
  
  // Format chapters display text
  const chaptersDisplay = content.chapters || (totalChapters > 0 ? `${totalChapters} თავი` : "0 თავი");
    
  // Handle favorite click
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const newStatus = toggleContentFavorite(content);
    setIsFavorite(newStatus);
  };
  
  return (
    <m.div
      variants={itemVariants}
      layout
      className="relative group cursor-pointer"
      onClick={() => router.push(`/${content.type}/${content.id}`)}
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      ref={cardRef}
      onMouseMove={(e) => {
        if (disableTiltRef.current) return;
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const posX = e.clientX - rect.left - rect.width / 2;
        const posY = e.clientY - rect.top - rect.height / 2;
        const rotateMax = 15; // degrees
        rotateY.set((posX / (rect.width / 2)) * rotateMax);
        rotateX.set((-posY / (rect.height / 2)) * rotateMax);
      }}
      onMouseLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
      style={{ perspective: 800 }}
    >
      <m.div
        className="relative bg-transparent transition-all duration-150 flex flex-col flex-grow overflow-visible"
        initial="initial"
        whileHover="hover"
        style={{ rotateX: rotateX, rotateY: rotateY, transformStyle: "preserve-3d" }}
      >
        <div className="aspect-[2/3] relative rounded-xl overflow-visible">
          <ImageSkeleton
            src={content.thumbnail}
            alt={content.title}
            className="w-full h-full object-cover rounded-xl transition-transform duration-300 ease-in-out"
            style={{borderRadius: '10px'}}
          />
          
          {/* Gradient overlay for text contrast at the bottom of image */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-none"></div>
          
          {/* ADD Description overlay on hover */}
          <AnimatePresence>
            {isHovered && ( 
              <m.div 
                className="absolute inset-0 p-3 bg-black/80 backdrop-blur-sm flex flex-col justify-center items-center text-center overflow-y-auto no-scrollbar" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs text-white/90 line-clamp-6 md:line-clamp-8">
                  {content.description || "No description available."}
                </p>
              </m.div>
            )}
          </AnimatePresence>
          
          {/* Favorite button - Top Right */}
          <button 
            onClick={handleFavoriteClick}
            className={cn(
              "absolute top-2.5 right-2.5 z-20 p-2 rounded-full transition-all duration-300 backdrop-blur-md border",
              isFavorite 
                ? "bg-red-500/30 border-red-500/50 text-red-400" 
                : "bg-black/50 border-white/20 text-white/80 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40",
              "opacity-0 group-hover:opacity-100" // Initially hidden, shows on group hover
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <m.div
              initial={{ scale: 1 }}
              animate={{ scale: isFavorite ? 1.1 : 1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </m.div>
          </button>
          
          {/* Rating badge */}
          {content.rating !== undefined && content.rating > 0 && (
            <div className="badge-rating absolute top-2 left-2">
              <Star className="h-3 w-3 fill-current text-yellow-400" />
              <span>{content.rating.toFixed(1)}</span>
            </div>
          )}
          
          {/* Chapter Count Badge */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-white/90 border border-white/20 shadow-md">
            {chaptersDisplay}
          </div>
          
          {/* Friend Avatars Overlay */}
          {friendStatuses.length > 0 && (
            <TooltipProvider delayDuration={150}>
              <div
                className="absolute top-[35px] left-[5px] flex items-center -space-x-2 z-30 no-tilt"
                onMouseEnter={() => {
                  disableTiltRef.current = true;
                  rotateX.set(0);
                  rotateY.set(0);
                }}
                onMouseLeave={() => {
                  disableTiltRef.current = false;
                }}
              >
                {friendStatuses.slice(0, 3).map((fs, idx) => (
                  idx < 3 ? (
                    <Tooltip key={fs.user_id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-black shadow no-tilt">
                          <AvatarImage src={fs.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fs.user_id}`} alt={fs.username || ''} />
                          <AvatarFallback>{fs.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-sm">
                        {statusSentence(fs.username || 'Unknown', fs.status)}
                      </TooltipContent>
                    </Tooltip>
                  ) : null
                ))}
                {friendStatuses.length > 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-6 w-6 rounded-full bg-gray-700 text-xs flex items-center justify-center border-2 border-black no-tilt">+{friendStatuses.length - 2}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-sm max-w-xs">
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {friendStatuses.slice(2).map(fs => (
                          <div key={fs.user_id}>{statusSentence(fs.username || 'Unknown', fs.status)}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}
          
          {/* View Count badge */}
          {content.view_count !== undefined && (
            <div className="absolute bottom-2.5 right-2.5 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
              <div className="text-xs px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg truncate max-w-full border border-white/20 shadow-md flex items-center gap-1">
                <Eye className="w-3 h-3 text-white/70" />
                <span>{content.view_count.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress bar – below poster */}
        {hasBeenRead && (
          <div className="w-full h-1.5 bg-gray-700/60 mt-[10px] rounded-[20px]">
            <m.div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-[20px]"
              style={{ width: `${progressPercentage}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}
        
        <div className="p-3.5 space-y-1.5 flex-1 rounded-b-xl border-t border-white/5">
          <h3 className="text-base font-semibold text-white line-clamp-1 group-hover:text-purple-400 transition-colors duration-200" title={content.title}>
            {content.title}
          </h3>
          {/* Show English title only if it exists and differs */}
          {content.englishTitle && content.englishTitle !== content.title && (
            <p className="text-xs text-gray-400 line-clamp-1" title={content.englishTitle}>
              {content.englishTitle}
            </p>
          )}
          
          {/* Meta info (status • year) */}
          {(content.status || content.release_year) && (
            <div className="flex items-center pt-1 text-xs text-gray-400 space-x-1 truncate">
              {content.status && (() => {
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
                }
                const key = String(content.status).toLowerCase().replace(" ", "_")
                return (
                  <span className="truncate max-w-full capitalize">{map[key] || content.status}</span>
                )
              })()}
              {content.status && content.release_year && <span className="mx-1">•</span>}
              {content.release_year && (
                <span className="whitespace-nowrap">{content.release_year}</span>
              )}
            </div>
          )}
        </div>
      </m.div>
    </m.div>
  );
}

export function MangaView({
  selectedCategory = "ყველა",
  setSelectedCategory,
  categories,
  hoveredCard,
  setHoveredCard,
  contentData = [],
  contentType = 'manga',
  items = [] // For backward compatibility
}: MangaViewProps & { items?: ContentItem[] }) { // Add items prop for backward compatibility
  const router = useRouter()
  const categoriesRef = useRef<HTMLDivElement>(null)
  // Use contentData first, fallback to items
  const dataToUse = contentData.length > 0 ? contentData : items
  const [localLoading, setLocalLoading] = useState(dataToUse.length === 0)
  const [localContentData, setLocalContentData] = useState<ContentItem[]>(dataToUse)
  
  // Filter content based on selected category
  const filteredContent = selectedCategory === "ყველა" 
    ? localContentData 
    : localContentData.filter(content => content.genres?.includes(selectedCategory))

  // Handle categories scroll
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const container = categoriesRef.current;
      const scrollAmount = 250;
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Set up drag scrolling for categories
  useEffect(() => {
    if (categoriesRef.current) {
      const cleanup = setupDragScroll(categoriesRef.current);
      return cleanup;
    }
  }, []);

  // If neither contentData nor items is provided, fetch it
  useEffect(() => {
    if (dataToUse.length > 0) {
      setLocalContentData(dataToUse);
      setLocalLoading(false);
      return;
    }
    
    async function fetchData() {
      setLocalLoading(true);
      try {
        // Get content from our database
        const response = await getAllContent(contentType, 50);
        
        if (response.success && response.content) {
          const transformedData = response.content.map((content: any): ContentItem => {
            // Determine Georgian title: check explicit column or extract from alternative_titles
            let georgianTitle: string | null = null;
            if (content.georgian_title && typeof content.georgian_title === 'string' && content.georgian_title.trim() !== '') {
              georgianTitle = content.georgian_title;
            } else if (Array.isArray(content.alternative_titles)) {
              const geoEntry = content.alternative_titles.find((t: string) => typeof t === 'string' && t.startsWith('georgian:'));
              if (geoEntry) {
                georgianTitle = geoEntry.substring(9);
              }
            }

            return {
              id: content.id,
              title: georgianTitle || content.title,
              englishTitle: georgianTitle ? content.title : null,
              description: content.description || "აღწერა არ არის ხელმისაწვდომი",
              thumbnail: content.thumbnail,
              banner_image: content.banner_image,
              rating: content.rating || 0,
              status: content.status,
              chapters: content.chapters_count ? `${content.chapters_count} თავი` : "0 თავი",
              genres: content.genres,
              type: contentType,
              release_year: content.release_year,
              totalChapters: typeof content.chapters_count === 'number' ? content.chapters_count : 
                 (typeof content.chapters_count === 'string' ? parseInt(content.chapters_count.replace(/[^\d]/g, ''), 10) : 0),
              view_count: content.view_count ?? 0
            };
          });
          
          setLocalContentData(transformedData);
        } else {
          console.error("Failed to fetch content or no content:", response.error || "No content");
          setLocalContentData([]);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        setLocalContentData([]);
      } finally {
        setLocalLoading(false);
      }
    }
    
    fetchData();
  }, [dataToUse.length, contentType]);

  if (localLoading) {
    return (
      <div className="space-y-6 mt-8 md:mt-16">
        <CategorySkeleton count={8} />
        <CarouselSkeleton count={6} />
      </div>
    );
  }

  return (
    <m.div
      key={selectedCategory}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {/* Categories filter */}
      <div className="relative">
        <div className="relative group">
          <div
            ref={categoriesRef}
            className="flex space-x-2 overflow-x-auto pb-3 scrollbar-hide"
          >
            {["ყველა", ...categories].map((category) => {
              const displayCategory = category === "ყველა" ? "ყველა" : translateGenre(category);
              return (
                <m.button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "relative px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200",
                    selectedCategory !== category && "text-gray-400 hover:text-white hover:bg-white/10",
                    selectedCategory === category && "text-white"
                  )}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                >
                  {selectedCategory === category && (
                    <m.div
                      layoutId={`activeCategoryIndicator-${contentType}`}
                      className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-indigo-600/50 border border-purple-500/40 rounded-lg z-0 shadow-inner shadow-purple-900/20"
                      initial={false}
                      animate={{ opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{displayCategory}</span>
                </m.button>
              );
            })}
          </div>
          
          {/* Navigation buttons */}
          <button
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#070707] z-10"
            onClick={() => scrollCategories('left')}
          >
            <ChevronRight className="w-4 h-4 rotate-180 text-white/80" />
          </button>
          
          <button
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#070707] z-10"
            onClick={() => scrollCategories('right')}
          >
            <ChevronRight className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div>
        {filteredContent.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl">
            <p className="text-white/60">ამ კატეგორიაში კონტენტი ვერ მოიძებნა</p>
            <img src="/images/mascot/confused.png" alt="No content mascot" className="mx-auto mt-4 w-32 h-32" />
          </div>
        ) : (
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-3 md:gap-4"
          >
            {filteredContent.map((content, index) => (
              <MangaCard 
                key={content.id} 
                content={content}
                index={index}
              />
            ))}
          </m.div>
        )}
      </div>
    </m.div>
  );
}
