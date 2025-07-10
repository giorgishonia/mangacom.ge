"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Settings, 
  X, 
  Menu,
  Info,
  Pause,
  Play,
  FastForward,
  Rewind,
  ChevronUp,
  BookOpen,
  Eye,
  EyeOff,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { updateReadingProgress } from "@/lib/reading-history"
import { Switch } from "@/components/ui/switch"
import { CommentSection } from './comment-section'
import { Button } from "@/components/ui/button"

interface Chapter {
  number: number
  title: string
  thumbnail: string
  pages: string[]
  id?: string
}

interface MangaReaderProps {
  chapter: Chapter
  chapterList: Chapter[]
  onClose: () => void
  onChapterSelect: (index: number) => void
  mangaId: string
  mangaTitle: string
  initialPage?: number
  sharedPage?: number
  onPageChange?: (page: number) => void
}

type ReadingMode = "Long Strip" | "Single Page" | "Double Page"
type ReadingDirection = "Left to Right" | "Right to Left"
type PageFit = "Contain" | "Overflow" | "Cover" | "True size"
type PageStretch = "None" | "Stretch"

export function MangaReader({ chapter, chapterList, onClose, onChapterSelect, mangaId, mangaTitle, initialPage = 0, sharedPage, onPageChange }: MangaReaderProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [visibleStartPage, setVisibleStartPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showChapterDropdown, setShowChapterDropdown] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>("Single Page")
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>("Left to Right")
  const [pageFit, setPageFit] = useState<PageFit>("Contain")
  const [pageStretch, setPageStretch] = useState<PageStretch>("None")
  const [showPageGap, setShowPageGap] = useState(true)
  const [showLongStripGap, setShowLongStripGap] = useState(true)
  const [showProgressBar, setShowProgressBar] = useState(true)
  const [showBottomBar, setShowBottomBar] = useState(true)
  const [showChapterList, setShowChapterList] = useState(false)
  const [showPageNumbers, setShowPageNumbers] = useState(true)
  const [autoHideControls, setAutoHideControls] = useState(true)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1)
  const [showComments, setShowComments] = useState(false)
  const [showInfoTutorial, setShowInfoTutorial] = useState(false)
  
  const [loadedPages, setLoadedPages] = useState<Record<number, boolean>>({})
  
  const [preloadedImages, setPreloadedImages] = useState<Record<string, boolean>>({})

  const readerRef = useRef<HTMLDivElement>(null)
  const longStripRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoScrollRafRef = useRef<number | null>(null)
  const lastScrollTimeRef = useRef<number>(0)
  const scrollListenerRef = useRef<any>(null)
  const [currentVisiblePage, setCurrentVisiblePage] = useState(0)
  const [isLongStripStabilized, setIsLongStripStabilized] = useState(false)
  
  const pageProgressRef = useRef<number>(0)
  const longStripScrollYRef = useRef(0);
  
  const progressBarRef = useRef<HTMLDivElement>(null)
  
  const totalPages = chapter.pages.length

  useEffect(() => {
    // Clear any existing timer first
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    // If controls are shown, autoHide is enabled, AND settings are NOT shown, set a new timer
    if (showControls && autoHideControls && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    // Cleanup function to clear timer on unmount or when dependencies change
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, autoHideControls, showSettings]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Attempt to enter fullscreen on mount if the browser allows it via user activation.
  useEffect(() => {
    const elem = readerRef.current;
    // Skip if already in fullscreen or API not supported
    if (!elem || document.fullscreenElement || !document.fullscreenEnabled) return;

    // Some browsers expose navigator.userActivation to check for a recent user gesture
    // If no user activation, silently skip to avoid permission errors
    const hasUserGesture = (navigator as any).userActivation?.isActive ?? false;
    if (!hasUserGesture) return;

    elem.requestFullscreen().catch(() => {
      /* silently ignore permission errors */
    });

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const preloadImages = (startIndex: number, count: number) => {
      const endIndex = Math.min(startIndex + count, totalPages)
      
      for (let i = startIndex; i < endIndex; i++) {
        const imageUrl = chapter.pages[i]
        if (!imageUrl) continue;
        const cacheKey = `${chapter.number}-${i}-${imageUrl}`
        
        if (preloadedImages[cacheKey]) continue
        
        const img = new Image()
        img.src = imageUrl
        img.onload = () => {
          setPreloadedImages(prev => ({...prev, [cacheKey]: true}))
          setLoadedPages(prev => ({...prev, [i]: true}))
        }
        img.onerror = () => {
          console.warn(`Failed to preload image: ${imageUrl}`);
        }
      }
    }

    if (readingMode === "Long Strip") {
      preloadImages(currentVisiblePage, 5)
    } else {
      preloadImages(currentPage, 3)
      
      if (readingMode === "Double Page" && currentPage > 0) {
        preloadImages(currentPage - 1, 1)
      }
    }
  }, [currentPage, currentVisiblePage, chapter.number, chapter.pages, readingMode, totalPages, preloadedImages]);

  const calculateLongStripProgress = (): number => {
    if (!longStripRef.current || totalPages === 0) return 0;
    
    const percentage = (currentVisiblePage / (totalPages - 1)) * 100;
    return Math.min(100, Math.max(0, percentage));
  };

  useEffect(() => {
    if (readingMode !== "Long Strip" || !longStripRef.current) return;
    
    const observerOptions = {
      root: longStripRef.current,
      rootMargin: '0px',
      threshold: 0.5,
    };
    
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      let mostVisibleEntry: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
            mostVisibleEntry = entry;
          }
        }
      }

      if (mostVisibleEntry) {
        const pageIndex = Number(mostVisibleEntry.target.getAttribute('data-page-index'));
        if (!isNaN(pageIndex)) {
          setCurrentVisiblePage(pageIndex);
          pageProgressRef.current = pageIndex;
          
          if (progressBarRef.current && readingMode === "Long Strip") {
            const percentage = (pageIndex / (totalPages - 1)) * 100;
            const progress = Math.min(100, Math.max(0, percentage));
            progressBarRef.current.style.transform = `translateX(-${100 - progress}%)`;
          }
        }
      }
    };
    
    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    
    const elements = longStripRef.current.querySelectorAll('[data-page-element="true"]');
    elements.forEach(element => {
      observer.observe(element);
    });
    
    return () => {
      observer.disconnect();
    };
  }, [readingMode, totalPages, isLongStripStabilized]);

  useEffect(() => {
    if (readingMode === "Long Strip" && !isLongStripStabilized) {
      const timer = setTimeout(() => {
        setIsLongStripStabilized(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (readingMode !== "Long Strip") {
        setIsLongStripStabilized(false);
      }
    };
  }, [readingMode, isLongStripStabilized]);

  useEffect(() => {
    if (readingMode !== "Long Strip" || !longStripRef.current) return;
    
    const handleScroll = () => {
      if (!longStripRef.current) return;
      
      const container = longStripRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      
    };
    
    const scrollContainer = longStripRef.current;
    scrollContainer.addEventListener('scroll', handleScroll);
    scrollListenerRef.current = handleScroll;
    
    return () => {
      if (scrollContainer && scrollListenerRef.current) {
        scrollContainer.removeEventListener('scroll', scrollListenerRef.current);
      }
    };
  }, [readingMode, visibleStartPage, currentPage, totalPages]);

  useEffect(() => {
    if (!mangaId || !chapter.id) return;

    let pageToSave = 0;
    if (readingMode === "Long Strip") {
      pageToSave = currentVisiblePage;
    } else {
      pageToSave = currentPage;
    }

    if (pageToSave >= 0 && pageToSave < totalPages) {
      updateReadingProgress({
        mangaId,
        chapterId: chapter.id || `chapter-${chapter.number}`,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        currentPage: pageToSave,
        totalPages: chapter.pages.length,
        lastRead: Date.now(),
        mangaTitle,
        mangaThumbnail: chapter.thumbnail
      });
    }
  }, [currentPage, currentVisiblePage, readingMode, chapter, mangaId, mangaTitle, totalPages]);

  useEffect(() => {
    if (initialPage > 0 && readingMode === "Long Strip" && longStripRef.current && isLongStripStabilized) {
      const timer = setTimeout(() => {
        const pageElements = longStripRef.current?.querySelectorAll('[data-page-element="true"]');
        const targetPageIndex = Math.min(initialPage, totalPages - 1);
        if (pageElements && pageElements.length > targetPageIndex) {
          const targetElement = pageElements[targetPageIndex] as HTMLElement;
          if (targetElement && longStripRef.current) {
            targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            setCurrentVisiblePage(targetPageIndex);

            if (progressBarRef.current) {
              const percentage = (targetPageIndex / (totalPages - 1)) * 100;
              const progress = Math.min(100, Math.max(0, percentage));
              progressBarRef.current.style.width = `${progress}%`;
            }
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [initialPage, readingMode, isLongStripStabilized]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && readerRef.current) {
      readerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    } else {
      navigateToNextChapter();
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    } else {
      navigateToPrevChapter();
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === "ArrowRight" || e.key === " ") {
      if (readingMode === "Long Strip") {
        if (longStripRef.current) {
          longStripRef.current.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }
      } else {
        const direction = readingDirection === "Left to Right" ? goToNextPage : goToPrevPage
        direction()
      }
    } else if (e.key === "ArrowLeft") {
      if (readingMode === "Long Strip") {
        if (longStripRef.current) {
          longStripRef.current.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
        }
      } else {
        const direction = readingDirection === "Left to Right" ? goToPrevPage : goToNextPage
        direction()
      }
    } else if (e.key === "ArrowUp") {
      if (readingMode === "Long Strip" && longStripRef.current) {
        longStripRef.current.scrollBy({ top: -window.innerHeight * 0.2, behavior: 'smooth' });
      }
    } else if (e.key === "ArrowDown") {
      if (readingMode === "Long Strip" && longStripRef.current) {
        longStripRef.current.scrollBy({ top: window.innerHeight * 0.2, behavior: 'smooth' });
      }
    } else if (e.key === "Escape") {
      if (showSettings) {
        setShowSettings(false)
      } else if (isFullscreen) {
        document.exitFullscreen()
      } else {
        onClose()
      }
    } else if (e.key === "f") {
      toggleFullscreen()
    } else if (e.key === "s") {
      setShowSettings(!showSettings)
    } else if (e.key === "b") {
      setShowBottomBar(!showBottomBar)
    } else if (e.key === "c") {
      setShowChapterList(!showChapterList);
    } else if (e.key === "[" || e.key === "PageUp") {
      navigateToPrevChapter()
    } else if (e.key === "]" || e.key === "PageDown") {
      navigateToNextChapter()
    }
  }

  const getPageFitClass = () => {
    switch (pageFit) {
      case "Contain": return "object-contain"; 
      case "Cover": return "object-cover";
      case "Overflow": return "object-none max-w-none max-h-none";
      case "True size": return "object-none h-auto w-auto max-w-none max-h-none";
      default: return "object-contain";
    }
  }

  const PageSkeleton = ({ className, mode }: { className?: string, mode: ReadingMode }) => {
    const isLongStrip = mode === "Long Strip";
    return (
      <div className={cn(
        "relative flex items-center justify-center bg-gray-800/40 rounded animate-pulse",
        "w-full h-full min-h-[300px]",
        className
      )}>
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-700/60 flex items-center justify-center text-gray-500 font-bold text-2xl mb-2">
            M
          </div>
          <div className="text-xs text-gray-500">იტვირთება...</div>
        </div>
      </div>
    );
  };

  const PageImage = React.memo(({
    src,
    alt,
    index,
    className,
    mode
  }: {
    src: string;
    alt: string;
    index: number;
    className?: string;
    mode?: ReadingMode;
  }) => {
    const cacheKey = `${chapter.number}-${index}-${src}`;
    const [isLoaded, setIsLoaded] = useState(preloadedImages[cacheKey] || false);
    const currentMode = mode || readingMode;

    useEffect(() => {
      if (preloadedImages[cacheKey] && !isLoaded) {
        setIsLoaded(true);
      }
    }, [cacheKey, preloadedImages, isLoaded]);

    return (
      <div
        className={cn(
          "relative PageImage_wrapper",
          currentMode === "Long Strip" ? "w-full" : "h-full w-full flex items-center justify-center"
        )}
        data-page-element="true"
        data-page-index={index}
      >
        {!isLoaded && <PageSkeleton className={className} mode={currentMode} />}
        <img
          src={src}
          alt={alt}
          className={cn(
            "pointer-events-auto",
            currentMode === "Long Strip" ? "w-full h-auto max-w-full block" : "max-h-full max-w-full",
            currentMode !== "Long Strip" ? getPageFitClass() : "",
            className,
            !isLoaded && "opacity-0 absolute"
          )}
          onLoad={() => {
            setIsLoaded(true);
            setPreloadedImages(prev => ({...prev, [cacheKey]: true}));
            setLoadedPages(prev => ({...prev, [index]: true}));
          }}
          onError={(e) => {
            console.error(`Failed to load image: ${src}`);
            setIsLoaded(true);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isLoaded ? 1 : 0,
          }}
        />
      </div>
    );
  });
  
  PageImage.displayName = 'PageImage';

  const navigateToNextChapter = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const currentIndex = chapterList.findIndex(c => c.number === chapter.number);
    if (currentIndex < chapterList.length - 1) {
      updateReadingProgress({
        mangaId,
        chapterId: chapter.id || `chapter-${chapter.number}`,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        currentPage: chapter.pages.length,
        totalPages: chapter.pages.length,
        lastRead: Date.now(),
        mangaTitle,
        mangaThumbnail: chapter.thumbnail
      });
      
      onChapterSelect(currentIndex + 1);
    }
  };

  const navigateToPrevChapter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const prevChapterIndex = chapterList.findIndex(c => c.number === chapter.number) - 1;
    if (prevChapterIndex >= 0) {
      onChapterSelect(prevChapterIndex);
    }
  };

  const toggleAutoScroll = () => {
    setIsAutoScrolling(!isAutoScrolling);
  };

  const increaseScrollSpeed = () => {
    setAutoScrollSpeed(prev => Math.min(prev + 0.5, 5));
  };

  const decreaseScrollSpeed = () => {
    setAutoScrollSpeed(prev => Math.max(prev - 0.5, 0.5));
  };

  useEffect(() => {
    if (isAutoScrolling && readingMode === "Long Strip" && longStripRef.current) {
      const container = longStripRef.current;
      let lastTimestamp = 0;

      const scrollStep = (timestamp: number) => {
        if (!isAutoScrolling || !longStripRef.current) {
          autoScrollRafRef.current = null;
          return;
        }

        if (lastTimestamp === 0) {
          lastTimestamp = timestamp;
          autoScrollRafRef.current = requestAnimationFrame(scrollStep);
          return;
        }

        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        const speedFactor = autoScrollSpeed * 100;
        
        const currentScrollTop = container.scrollTop;
        const targetScrollTop = currentScrollTop + speedFactor * (deltaTime / 16.67);

        const smoothingFactor = 0.1;
        const newScrollTop = currentScrollTop + (targetScrollTop - currentScrollTop) * smoothingFactor;

        container.scrollTo({ top: newScrollTop, behavior: 'auto' });

        if (container.scrollHeight - newScrollTop <= container.clientHeight + 10) {
          setIsAutoScrolling(false);
          autoScrollRafRef.current = null;
          console.log("Auto-scroll reached end");
        } else {
          autoScrollRafRef.current = requestAnimationFrame(scrollStep);
        }
      };

      lastTimestamp = 0;
      autoScrollRafRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    }

    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };
  }, [isAutoScrolling, autoScrollSpeed, readingMode]);

  const readingModes: ReadingMode[] = ["Single Page", "Double Page", "Long Strip"]
  const readingDirections: ReadingDirection[] = ["Left to Right", "Right to Left"]
  const fitOptions: PageFit[] = ["Contain", "Cover", "Overflow", "True size"]

  useEffect(() => {
    document.body.classList.add('manga-reader-open');
    
    return () => {
      document.body.classList.remove('manga-reader-open');
    };
  }, []);

  const toggleComments = () => {
    setShowComments(!showComments);
    if (showSettings) setShowSettings(false);
  }

  // New useEffect for scroll-based controls in Long Strip mode
  useEffect(() => {
    if (readingMode !== "Long Strip" || !longStripRef.current) {
      return;
    }
    
    const container = longStripRef.current;
    // Initialize scrollYRef when effect runs for Long Strip or container becomes available
    longStripScrollYRef.current = container.scrollTop;

    const handleLongStripScroll = () => {
      if (!container) return;
      const currentScrollY = container.scrollTop;
      const scrollThreshold = 10; // Min pixels to scroll to detect direction reliably

      // Check if scroll position has changed meaningfully
      if (Math.abs(currentScrollY - longStripScrollYRef.current) < scrollThreshold) {
        return;
      }

      if (currentScrollY < longStripScrollYRef.current) { // Scrolled UP
        if (!showControls) { 
          setShowControls(true);
        }
      } else if (currentScrollY > longStripScrollYRef.current) { // Scrolled DOWN
        if (showControls) { 
           setShowControls(false);
        }
      }
      longStripScrollYRef.current = currentScrollY; // Update ref after comparison and action
    };

    container.addEventListener('scroll', handleLongStripScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleLongStripScroll);
    };
  }, [readingMode, longStripRef.current, showControls, autoHideControls]); // Added dependencies

  // Sync incoming shared page (from remote)
  useEffect(() => {
    if (typeof sharedPage === 'number' && sharedPage !== currentPage) {
      setCurrentPage(sharedPage)
    }
  }, [sharedPage])

  // Notify parent when page changes (local)
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage)
    }
  }, [currentPage])

  return (
    <AnimatePresence>
      <motion.div
        ref={readerRef}
        className="fixed inset-0 z-50 h-full w-full flex flex-col bg-black text-white outline-none"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <AnimatePresence>
          {(showControls || !autoHideControls) && (
            <motion.div 
              className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChapterList(!showChapterList);
                }}
                className="p-1.5 rounded-full hover:bg-gray-800/70 transition-colors text-gray-300 hover:text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="თავების სია (C)"
              >
                <Menu className="h-5 w-5" />
              </motion.button>
              
              <div className="text-center text-sm text-gray-300 truncate hidden md:block">
                 {mangaTitle} - {chapter.title}
              </div>
              
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-red-600/90 transition-colors text-gray-300 hover:text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="დახურვა (Esc)"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="flex-1 relative overflow-hidden"
          onContextMenu={(e) => {
            e.preventDefault(); // Prevent default context menu
            // If a click reaches here, it means it wasn't stopped by a more specific child control.
            // Now, determine if the click was on a general background or page content area.
            if (
                // Case 1: Clicked directly on the background of this flex-1 div itself.
                e.target === e.currentTarget ||

                // Case 2: In Long Strip mode, clicked on the direct background of long strip or a page.
                (readingMode === "Long Strip" &&
                    longStripRef.current && longStripRef.current.contains(e.target as Node) &&
                    (e.target === longStripRef.current || (e.target as HTMLElement).closest('[data-page-element="true"]'))
                ) ||

                // Case 3: In Single/Double Page mode, clicked on a page/image wrapper.
                // Explicit L/R navigation areas should have their own e.stopPropagation().
                (readingMode !== "Long Strip" && (e.target as HTMLElement).closest('.PageImage_wrapper'))
            ) {
                setShowControls(prev => !prev);
            }
          }}
        > 
          {readingMode === "Long Strip" ? (
            <div 
              ref={longStripRef}
              className="absolute inset-0 overflow-y-auto scroll-smooth"
            >
              <div 
                className="flex flex-col items-center pt-12 pb-24"
                style={{ minHeight: '100vh' }}
              >
                {chapter.pages.map((pageUrl, pageIndex) => {
                  return (
                    <div 
                      key={pageIndex} 
                      className={cn(
                        "w-full max-w-3xl",
                        showLongStripGap && pageIndex < totalPages - 1 ? "mb-2" : "mb-0"
                      )}
                      style={{ contain: 'paint' }}
                    >
                      <PageImage 
                        src={pageUrl} 
                        alt={`Page ${pageIndex + 1}`}
                        index={pageIndex}
                        className="w-full block"
                        mode="Long Strip"
                      />
                      {showPageNumbers && (
                        <div className="text-center text-xs text-gray-500 mt-1 select-none">
                          {pageIndex + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div
                className="absolute left-0 top-0 h-full w-1/4 cursor-w-resize z-10 group"
                onClick={(e) => {
                  e.stopPropagation()
                  readingDirection === "Left to Right" ? goToPrevPage() : goToNextPage()
                }}
              >
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronLeft size={24} />
                </div>
              </div>

              <div
                className="absolute right-0 top-0 h-full w-1/4 cursor-e-resize z-10 group"
                onClick={(e) => {
                  e.stopPropagation()
                  readingDirection === "Left to Right" ? goToNextPage() : goToPrevPage()
                }}
              >
                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={24} />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{
                    opacity: 0,
                    x: readingDirection === "Left to Right" ? 50 : -50
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: readingDirection === "Left to Right" ? -50 : 50
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center p-4"
                >
                  {readingMode === "Double Page" ? (
                    <div className={cn(
                      "flex items-center justify-center w-full h-full PageImage_wrapper",
                      showPageGap ? "gap-4" : "gap-0"
                      )}>
                      <div className="w-1/2 h-full flex-shrink-0 PageImage_wrapper_child">
                        <PageImage 
                          src={readingDirection === 'Left to Right' && currentPage > 0 ? chapter.pages[currentPage - 1] : chapter.pages[currentPage]}
                          alt={`Page ${readingDirection === 'Left to Right' && currentPage > 0 ? currentPage : currentPage + 1}`}
                          index={readingDirection === 'Left to Right' && currentPage > 0 ? currentPage - 1 : currentPage}
                          className="h-full w-full"
                          mode="Double Page"
                        />
                      </div>
                      { (readingDirection === 'Left to Right' ? currentPage : currentPage + 1) < totalPages && (
                        <div className="w-1/2 h-full flex-shrink-0 PageImage_wrapper_child">
                          <PageImage 
                            src={readingDirection === 'Left to Right' ? chapter.pages[currentPage] : chapter.pages[currentPage + 1]}
                            alt={`Page ${readingDirection === 'Left to Right' ? currentPage + 1 : currentPage + 2}`}
                            index={readingDirection === 'Left to Right' ? currentPage : currentPage + 1}
                            className="h-full w-full"
                            mode="Double Page"
                          />
                        </div>
                      )}
                      
                      {showPageNumbers && (
                        <div className="absolute bottom-2 left-0 right-0 text-center text-sm text-gray-400 select-none">
                          {currentPage > 0 && readingDirection === 'Left to Right' ? `${currentPage} - ` : ''}
                          {currentPage + 1}
                          {currentPage + 1 < totalPages && readingDirection === 'Right to Left' ? ` - ${currentPage + 2}` : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full relative PageImage_wrapper">
                      <PageImage 
                        src={chapter.pages[currentPage]} 
                        alt={`Page ${currentPage + 1}`}
                        index={currentPage}
                        className="h-full w-full"
                        mode="Single Page"
                      />
                      
                      {showPageNumbers && (
                        <div className="absolute bottom-2 left-0 right-0 text-center text-sm text-gray-400 select-none">
                          {currentPage + 1}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
          
          {readingMode === "Long Strip" && (showControls || !autoHideControls) && (
            <motion.div 
              className="absolute bottom-24 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center space-y-1 z-20 border border-gray-700/50 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <button 
                onClick={toggleAutoScroll}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                title={isAutoScrolling ? "პაუზა" : "ავტო სქროლი"}
              >
                {isAutoScrolling ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <div className="text-xs font-mono text-center select-none">
                {autoScrollSpeed.toFixed(1)}x
              </div>
              
              <button 
                onClick={increaseScrollSpeed}
                className="p-1.5 hover:bg-gray-800 rounded-full transition-colors"
                title="აჩქარება"
              >
                <FastForward size={16} />
              </button>
              
              <button 
                onClick={decreaseScrollSpeed}
                className="p-1.5 hover:bg-gray-800 rounded-full transition-colors"
                title="შენელება"
              >
                <Rewind size={16} />
              </button>
            </motion.div>
          )}
          
          <AnimatePresence>
            {showChapterList && (
              <motion.div
                initial={{ opacity: 0, x: -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-gray-950/95 to-black/95 backdrop-blur-md z-40 border-r border-gray-800 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                 <div className="sticky top-0 z-10 p-3 bg-black/60 backdrop-blur-sm border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-gray-200">Chapters</h3>
                  <button
                    onClick={() => setShowChapterList(false)}
                    className="p-1 rounded-full hover:bg-gray-700/50 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-50px)]">
                  <div className="space-y-1 p-2">
                    {chapterList.map((item, index) => (
                      <motion.button
                        key={item.id || item.number}
                        onClick={() => {
                          onChapterSelect(index)
                          setCurrentPage(0)
                          setShowChapterList(false)
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded transition-colors duration-150 flex items-center justify-between",
                          chapter.number === item.number
                            ? "bg-purple-900/30 text-purple-300 font-medium"
                            : "hover:bg-gray-800/60 text-gray-300"
                        )}
                        whileHover={{ backgroundColor: chapter.number !== item.number ? 'rgba(55, 65, 81, 0.6)' : undefined }}
                        whileTap={{ scale: 0.98 }}
                        layout
                      >
                        <span className="truncate text-sm">{item.title}</span>
                        {chapter.number === item.number && (
                          <motion.div 
                            layoutId="currentChapterIndicator"
                            className="p-1 bg-purple-600/50 rounded-full"
                          >
                            <BookOpen className="w-3 h-3 text-purple-300" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(showSettings && (showControls || !autoHideControls)) && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 250 }}
                className="absolute bottom-20 right-4 z-40 p-4 rounded-lg bg-black/90 backdrop-blur-md shadow-xl border border-gray-800 w-72"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
                  <h3 className="font-medium text-gray-200">პარამეტრები</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      კითხვის რეჟიმი
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {readingModes.map((mode) => (
                        <button
                          key={mode}
                          className={cn(
                            "py-1.5 px-3 rounded-md text-sm transition-colors",
                            readingMode === mode
                              ? "bg-purple-900/40 text-purple-300 ring-1 ring-purple-700"
                              : "bg-gray-800/50 hover:bg-gray-800 text-gray-300"
                          )}
                          onClick={() => setReadingMode(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      კითხვის მიმართულება
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {readingDirections.map((direction) => (
                        <button
                          key={direction}
                          className={cn(
                            "py-1.5 px-3 rounded-md text-sm transition-colors",
                            readingDirection === direction
                              ? "bg-purple-900/40 text-purple-300 ring-1 ring-purple-700"
                              : "bg-gray-800/50 hover:bg-gray-800 text-gray-300"
                          )}
                          onClick={() => setReadingDirection(direction)}
                          disabled={readingMode === 'Long Strip'}
                        >
                          {direction}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      გვერდის მორგება
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {fitOptions.map((option) => (
                        <button
                          key={option}
                          className={cn(
                            "py-1.5 px-3 rounded-md text-sm transition-colors",
                            pageFit === option
                              ? "bg-purple-900/40 text-purple-300 ring-1 ring-purple-700"
                              : "bg-gray-800/50 hover:bg-gray-800 text-gray-300"
                          )}
                          onClick={() => setPageFit(option)}
                          disabled={readingMode === 'Long Strip'}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800 space-y-2">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm font-medium text-gray-400 select-none">პროგრესის ჩვენება</span>
                      <Switch
                        checked={showProgressBar}
                        onCheckedChange={setShowProgressBar}
                      />
                    </div>
                     <div className="flex items-center justify-between py-1">
                       <span className="text-sm font-medium text-gray-400 select-none">კონტროლების ავტომატური დამალვა</span>
                       <Switch
                         checked={autoHideControls}
                         onCheckedChange={setAutoHideControls}
                       />
                     </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm font-medium text-gray-400 select-none">გვერდის ნომრები</span>
                      <Switch
                        checked={showPageNumbers}
                        onCheckedChange={setShowPageNumbers}
                      >
                      </Switch>
                    </div>
                    <div className={`flex items-center justify-between py-1 ${readingMode !== 'Long Strip' ? 'opacity-50' : ''}`}>
                      <span className="text-sm font-medium text-gray-400 select-none">შუალედი (გრძელი ზოლი)</span>
                      <Switch
                        checked={showLongStripGap}
                        onCheckedChange={setShowLongStripGap}
                        disabled={readingMode !== 'Long Strip'}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {(showControls || !autoHideControls) && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {showProgressBar && (
                <div className="h-2 bg-black/50 backdrop-blur-sm flex flex-col">
                  {readingMode === "Long Strip" ? (
                    <div className="h-full w-full relative">
                      <div 
                        className="absolute inset-0 overflow-hidden rounded-none"
                        style={{ background: "rgba(255, 255, 255, 0.1)" }}
                      >
                        <motion.div
                          ref={progressBarRef}
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_8px_rgba(138,43,226,0.6)]"
                          style={{ width: `${calculateLongStripProgress()}%` }}
                          transition={{ duration: 0.1, ease: "linear" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPage(idx)
                          }}
                          className={cn(
                            "h-full flex-1 border-r border-black/30 hover:bg-gray-700/50 transition-colors relative group",
                            currentPage === idx ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-inner" : "bg-gray-800/40"
                          )}
                        >
                          <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black px-1.5 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Page {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="py-2 px-3 bg-gradient-to-b from-black/70 to-black/95 backdrop-blur-md flex items-center justify-between border-t border-gray-800/50 shadow-lg">
                 <div className="flex items-center gap-1">
                  <motion.button
                    onClick={navigateToPrevChapter}
                    className="p-1.5 rounded-full hover:bg-gray-800/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={chapterList.findIndex(c => c.number === chapter.number) === 0}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="წინა თავი ([)"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </motion.button>
                  <div className="relative">
                    <motion.button 
                      className="flex items-center gap-1 group px-2 py-1 rounded-lg hover:bg-gray-800/40 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChapterDropdown(!showChapterDropdown);
                      }}
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0 }}
                      title="თავების სია"
                    >
                       <span className="text-sm font-medium group-hover:text-purple-400 transition-colors">
                          თავი {chapter.number}
                        </span>
                        <motion.div
                          animate={{ rotate: showChapterDropdown ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronUp className="h-3 w-3 text-gray-400 group-hover:text-purple-400" />
                        </motion.div>
                    </motion.button>
                    
                    <AnimatePresence>
                      {showChapterDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="absolute bottom-full mb-2 left-0 z-40 w-64 bg-black/90 backdrop-blur-md border border-gray-800 rounded-lg max-h-[30vh] overflow-y-auto py-2 shadow-xl shadow-purple-900/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="sticky top-0 px-3 py-1 text-xs font-medium text-gray-400 border-b border-gray-800 mb-1 bg-black/95 backdrop-blur-sm flex justify-between items-center">
                            <span>თავების სია</span>
                            <span className="text-xs bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full">
                              {chapterList.length} თავი
                            </span>
                          </div>
                          <div className="divide-y divide-gray-800/50">
                            {chapterList.map((item, index) => (
                              <motion.button
                                key={item.id || item.number}
                                onClick={() => {
                                  onChapterSelect(index);
                                  setCurrentPage(0);
                                  setShowChapterDropdown(false);
                                }}
                                className={cn(
                                  "flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-800/50 transition-colors",
                                  chapter.number === item.number && "bg-purple-900/20 text-purple-400"
                                )}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 font-mono",
                                  chapter.number === item.number 
                                    ? "bg-purple-700 text-white ring-1 ring-purple-500/50" 
                                    : "bg-gray-800"
                                )}>
                                  {item.number}
                                </span>
                                <span className="truncate text-xs flex-1">{item.title}</span>
                                {chapter.number === item.number && (
                                  <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", damping: 10, stiffness: 200 }}
                                    className="ml-2"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                                  </motion.div>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <motion.button
                    onClick={navigateToNextChapter}
                    className="p-1.5 rounded-full hover:bg-gray-800/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={chapterList.findIndex(c => c.number === chapter.number) === chapterList.length - 1}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="შემდეგი თავი (])"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
                
                <div className="flex items-center space-x-2 text-sm bg-gray-900/60 px-3 py-1 rounded-full">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfoTutorial(prev => !prev);
                      if (showSettings) setShowSettings(false);
                      if (showComments) setShowComments(false);
                    }}
                    className={`p-1.5 rounded-full hover:bg-gray-800/70 transition-colors ${showInfoTutorial ? "text-purple-400 bg-gray-700/50" : "text-gray-300 hover:text-white"}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="ინფორმაცია"
                  >
                    <Info className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(!showSettings);
                      if (showComments) setShowComments(false);
                      if (showInfoTutorial) setShowInfoTutorial(false);
                    }}
                    className={`p-1.5 rounded-full hover:bg-gray-800/70 transition-colors ${showSettings ? "text-purple-400 bg-gray-700/50" : "text-gray-300 hover:text-white"}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="პარამეტრები (S)"
                  >
                    <Settings className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComments();
                      if (showInfoTutorial) setShowInfoTutorial(false);
                    }}
                    className={`p-1.5 rounded-full hover:bg-gray-800/70 transition-colors ${showComments ? "text-purple-400 bg-gray-700/50" : "text-gray-300 hover:text-white"}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="კომენტარები (C)"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-800/70 transition-colors text-gray-300 hover:text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={isFullscreen ? "ნორმალური ზომა (F)" : "მთლიანი ეკრანი (F)"}
                  >
                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComments && (
            <motion.div 
              className="fixed right-0 top-0 bottom-0 w-[350px] bg-black border-l border-white/20 overflow-y-auto z-50 text-white"
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 350, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-black border-b border-white/20">
                <h2 className="text-lg font-medium text-white">Comments</h2>
                <Button variant="ghost" size="icon" onClick={toggleComments} className="text-white hover:text-white/80">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4">
                <CommentSection 
                  contentId={`${mangaId}-chapter-${chapter.id || chapter.number}`}
                  contentType="manga"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Tutorial Modal */}
        <AnimatePresence>
          {showInfoTutorial && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowInfoTutorial(false)} // Click outside to close
            >
              <div 
                className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full text-center relative"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
              >
                <button 
                  onClick={() => setShowInfoTutorial(false)}
                  className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors"
                  title="დახურვა"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex justify-center mb-4">
                  {/* Placeholder for animated mouse icon */}
                  <div className="w-16 h-24 border-2 border-gray-600 rounded-lg flex flex-col items-center justify-between p-2 relative bg-gray-800">
                    <div className="w-1 h-4 bg-gray-500 rounded-full"></div> {/* Scroll wheel */}
                    <div className="flex w-full justify-between absolute top-1 left-0 right-0 px-1">
                        <div className="w-[45%] h-6 bg-gray-700 rounded-l-md border border-gray-600"></div> {/* Left button */}
                        <div className="w-[45%] h-6 bg-purple-500 rounded-r-md border border-purple-400 animate-pulse_subtle"></div> {/* Right button - highlighted */}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">კონტროლი</h3>
                <p className="text-sm text-gray-300">
                  კონტროლის პანელის საჩვენებლად ან დასამალად, დააჭირეთ მაუსის მარჯვენა ღილაკს.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ghost Info Icon - Appears when controls are hidden and tutorial is not open */}
        <AnimatePresence>
          {!showControls && !showInfoTutorial && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-4 right-4 z-40 p-2.5 bg-black/60 backdrop-blur-sm rounded-full shadow-lg border border-gray-700/50 text-white hover:bg-purple-600/50 hover:border-purple-500/70 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setShowControls(true);
                setShowInfoTutorial(true);
              }}
              title="ინფორმაცია"
            >
              <Info className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

      </motion.div>
    </AnimatePresence>
  )
}

// Add a simple pulse animation for the mouse button
const keyframes_pulse_subtle = `
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.96); }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    .animate-pulse_subtle {
      animation: pulse_subtle 2s infinite;
    }
    @keyframes pulse_subtle {
      ${keyframes_pulse_subtle}
    }
  `;
  document.head.appendChild(styleSheet);
}
