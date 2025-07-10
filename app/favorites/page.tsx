"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion as m, AnimatePresence } from 'framer-motion'
import { Heart, X, Bookmark, BookOpen, Clock, ChevronRight, Filter, TrendingUp, LayoutGrid, Layers, Sparkles, BookMarked, Users } from 'lucide-react'
import { ImageSkeleton } from '@/components/image-skeleton'
import { cn } from '@/lib/utils'
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/app-sidebar'
import Link from 'next/link'

// Animation variants with improved easing
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.06,
      ease: [0.22, 1, 0.36, 1]
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

// Filter animations
const filterVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

interface FavoriteItem {
  id: string;
  type: 'manga' | 'anime' | 'comics' | 'character';
  title: string;
  image: string;
  addedAt: string;
}

export default function FavoritesPage() {
  const router = useRouter()
  const { userId, isAuthenticated, isLoading: authLoading } = useUnifiedAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Load favorites function defined outside useEffect
  function loadFavorites() {
    try {
      const storedFavorites = localStorage.getItem('favorites')
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites)
        const favoritesArray = (Object.values(parsedFavorites) as any[]).map(item => {
          if (item.type === 'character' && item.name) {
            // Ensure character items have a `title` property for consistency
            return { ...item, title: item.name };
          }
          return item;
        }) as FavoriteItem[];
        
        // Sort by most recently added
        favoritesArray.sort((a, b) => {
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        })
        
        setFavorites(favoritesArray)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle authentication and redirection
  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to finish loading
    }

    if (!isAuthenticated && typeof window !== 'undefined') {
      router.push('/login?returnUrl=/favorites');
    } else if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Setup storage event listener
  useEffect(() => {
    if (!isAuthenticated) return;
    
    window.addEventListener('storage', loadFavorites);
    return () => {
      window.removeEventListener('storage', loadFavorites);
    };
  }, [isAuthenticated]);
  
  const handleRemoveFavorite = (itemId: string, type: 'manga' | 'anime' | 'comics' | 'character') => {
    try {
      // Get current favorites
      const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '{}')
      
      // Delete the item
      delete storedFavorites[`${type}-${itemId}`]
      
      // Save back to localStorage
      localStorage.setItem('favorites', JSON.stringify(storedFavorites))
      
      // Update state
      setFavorites(prev => prev.filter(item => !(item.id === itemId && item.type === type)))
      
      // Trigger storage event to update other tabs
      window.dispatchEvent(new Event('storage'))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }
  
  const filteredFavorites = activeTab === 'all' 
    ? favorites 
    : favorites.filter(item => item.type === activeTab)
  
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070707]">
        <div className="flex flex-col items-center gap-4">
          <m.div 
            className="w-12 h-12 relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Heart className="absolute inset-0 w-12 h-12 text-pink-500 opacity-75" />
            <Heart className="absolute inset-0 w-12 h-12 text-purple-500 opacity-75" style={{ transform: 'rotate(45deg)' }} />
          </m.div>
          <m.p 
            className="text-white/50 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            იტვირთება...
          </m.p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#070707] to-[#0a0118] text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden pl-0 pb-20">
        {/* Hero section */}
        <m.div 
          className="relative w-full h-[180px] md:h-[240px] overflow-hidden mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background gradients and effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
          
          {/* Content overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent"></div>
          
          {/* Hero content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 md:pl-[77px]">
            <div className="max-w-7xl justify-center flex mx-auto w-full">
              <m.div 
                className="flex items-center gap-3 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <m.div 
                  className="relative"
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Heart className="w-10 h-10 md:w-12 md:h-12 text-red-500 fill-red-500 drop-shadow-lg" />
                  <m.div 
                    className="absolute inset-0 bg-red-500 rounded-full filter blur-md opacity-30"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </m.div>
                <div>
                  <m.h1 
                    className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    ჩემი რჩეულები
                  </m.h1>
                  <m.p 
                    className="text-white/60 text-sm md:text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    თქვენი შენახული რჩეული კონტენტი
                  </m.p>
                </div>
              </m.div>
            </div>
          </div>
        </m.div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 md:pl-[77px]">
          {/* Filter and view controls */}
          <m.div 
            className="flex flex-col md:flex-row justify-center items-start md:items-start mt-8 mb-8 gap-4"
            variants={filterVariants}
            initial="hidden"
            animate="visible"
          >
            <Tabs 
              defaultValue="all" 
              onValueChange={setActiveTab} 
              className="w-full md:w-auto"
            >
              <TabsList className="bg-black/40 border border-white/10 p-1 w-fit flex flex-wrap backdrop-blur-sm rounded-xl overflow-hidden">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <m.div className="flex items-start justify-start gap-1" whileHover={{ x: 2 }}>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" />
                    <span>ყველა ({favorites.length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="manga" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <m.div className="flex items-center justify-center gap-1" whileHover={{ x: 2 }}>
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" />
                    <span>მანგა ({favorites.filter(f => f.type === 'manga').length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="comics" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <m.div className="flex items-center justify-center gap-1" whileHover={{ x: 2 }}>
                    <BookMarked className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" />
                    <span>კომიქსი ({favorites.filter(f => f.type === 'comics').length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="anime" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <m.div className="flex items-center justify-center gap-1" whileHover={{ x: 2 }}>
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" />
                    <span>ანიმე ({favorites.filter(f => f.type === 'anime').length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="character" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <m.div className="flex items-center justify-center gap-1" whileHover={{ x: 2 }}>
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" />
                    <span>პერსონაჟი ({favorites.filter(f => f.type === 'character').length})</span>
                  </m.div>
                </TabsTrigger>
              </TabsList>
              <AnimatePresence mode="wait">
                <TabsContent value={activeTab} key={activeTab} className="mt-12">
                  {filteredFavorites.length > 0 ? (
                    <m.div 
                      className={cn(
                        "grid gap-4",
                        viewMode === 'grid' 
                          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                          : 'grid-cols-1'
                      )}
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {filteredFavorites.map((item) => (
                        <m.div 
                          key={`${item.type}-${item.id}`}
                          variants={itemVariants}
                          className={cn(
                            "group relative bg-black/40 border border-white/5 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 flex flex-col",
                            viewMode === 'list' ? "flex-row items-center" : ""
                          )}
                        >
                          {/* Remove button */}
                          <m.button
                            className="absolute top-2 right-2 z-10 bg-black/70 border border-white/10 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={() => handleRemoveFavorite(item.id, item.type)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="w-3 h-3 text-white/80" />
                          </m.button>
                          
                          {/* Type indicator */}
                          <div className="absolute top-2 left-2 z-10 bg-black/70 border border-white/10 rounded-full px-2 py-1 text-xs flex items-center gap-1">
                            {item.type === 'manga' && <BookOpen className="w-3 h-3" />}
                            {item.type === 'comics' && <BookMarked className="w-3 h-3" />}
                            {item.type === 'anime' && <TrendingUp className="w-3 h-3" />}
                            {item.type === 'character' && <Users className="w-3 h-3" />}
                            <span>{item.type === 'manga' ? 'მანგა' : item.type === 'comics' ? 'კომიქსი' : item.type === 'anime' ? 'ანიმე' : 'პერსონაჟი'}</span>
                          </div>
                          
                          {/* Image */}
                          <Link 
                            href={item.type === 'character' ? '#' : `/${item.type}/${item.id}`} 
                            className={cn(
                              "block overflow-hidden w-full",
                              viewMode === 'list' ? "w-24 h-24 rounded-lg m-3 flex-shrink-0" : "aspect-[2/3]"
                            )}
                          >
                            <m.img 
                              src={item.image} 
                              alt={item.title}
                              className="w-full h-full object-cover object-center transition-transform duration-700"
                              loading="lazy"
                              initial={{ scale: 1.1 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.05 }}
                              whileInView={{ opacity: 1 }}
                              style={{ viewTransitionName: `image-${item.id}` }} 
                            />
                          </Link>
                          
                          {/* Content */}
                          <div className={cn(
                            "p-3 pt-2 flex flex-col flex-grow",
                            viewMode === 'list' ? "flex-1 py-3 pl-0" : ""
                          )}>
                            <Link href={item.type === 'character' ? '#' : `/${item.type}/${item.id}`} className="hover:underline">
                              <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
                            </Link>
                            <div className="flex items-center gap-2 text-white/60 text-xs mt-auto pt-1">
                              <Clock className="w-3 h-3" />
                              <span>დამატებულია {new Date(item.addedAt).toLocaleDateString('ka-GE')}</span>
                            </div>
                          </div>
                        </m.div>
                      ))}
                    </m.div>
                  ) : (
                    <m.div 
                      className="flex flex-col items-center justify-center py-16 px-4 text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="mb-6 opacity-90">
                        <img 
                          src="/images/mascot/favorite-mascot.png" 
                          alt="No favorites" 
                          className="w-48 h-48 object-contain"
                          style={{
                            filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))"
                          }}
                        />
                      </div>
                      
                      <h3 className="text-xl font-semibold mb-2">
                        {activeTab === 'all' && "თქვენ არ გაქვთ რჩეული კონტენტი"}
                        {activeTab === 'manga' && "თქვენ არ გაქვთ რჩეული მანგა"}
                        {activeTab === 'comics' && "თქვენ არ გაქვთ რჩეული კომიქსი"}
                        {activeTab === 'anime' && "თქვენ არ გაქვთ რჩეული ანიმე"}
                        {activeTab === 'character' && "თქვენ არ გაქვთ რჩეული პერსონაჟი"}
                      </h3>
                      
                      <p className="text-white/70 mb-6 max-w-md">
                        დააკლიკეთ გულის ღილაკს თქვენი საყვარელი კონტენტის გვერდზე მის რჩეულებში დასამატებლად
                      </p>
                      
                      <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button 
                          variant="outline" 
                          className="bg-white/5 hover:bg-white/10 border border-white/10"
                          asChild
                        >
                          <Link href={activeTab === 'all' ? '/' : `/${activeTab}`} className="flex items-center gap-2">
                            <span>დაათვალიერეთ {
                              activeTab === 'all' ? 'კონტენტი' : 
                              activeTab === 'manga' ? 'მანგები' :
                              activeTab === 'comics' ? 'კომიქსები' :
                              activeTab === 'anime' ? 'ანიმეები' : 'პერსონაჟები'
                            }</span>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </m.div>
                    </m.div>
                  )}
                </TabsContent>
              </AnimatePresence>
            </Tabs>
            
            <div className="flex items-center gap-3 self-end md:self-start">
              <div className="text-xs text-white/60">ხედი:</div>
              <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-lg">
                <m.button
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                  onClick={() => setViewMode('grid')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </m.button>
                <m.button
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                  onClick={() => setViewMode('list')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Layers className="w-4 h-4" />
                </m.button>
              </div>
            </div>
          </m.div>
        </div>
      </main>
    </div>
  )
} 