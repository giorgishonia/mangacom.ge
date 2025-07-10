"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion as m, AnimatePresence } from "framer-motion"
import { Search, X, BookOpen, Book, ArrowRight, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchIcon, Loader2 } from "lucide-react"
import { ImageSkeleton } from "./image-skeleton"
import { searchContent } from "@/lib/content"
import { supabase } from "@/lib/supabase"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: string
  title: string
  image: string
  type: "manga" | "comics" | "user"
  year: string
}

// Function to fetch search results from our database
async function fetchSearchResults(query: string, type: "manga" | "comics" | "user"): Promise<SearchResult[]> {
  if (query.length < 2) return [];
  try {
    if (type === "user") {
      // Search user profiles by username or display name
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error("Error searching users:", error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.username || u.id,
        title: u.username,
        image: u.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.id}`,
        type: "user",
        year: ""
      }));
    } else {
      const response = await searchContent(query, type as "manga" | "comics" | undefined);
      if (response.success && response.content) {
        return response.content.map((item: any) => ({
          id: item.id,
          title: item.title,
          image: item.thumbnail,
          type: item.type,
          year: item.releaseYear ? item.releaseYear.toString() : 'Unknown'
        }));
      }
      return [];
    }
  } catch (error) {
    console.error("Error searching content:", error);
    return [];
  }
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<"manga" | "comics" | "user">("manga")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])
  
  // Handle search input changes
  useEffect(() => {
    const handleSearch = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }
      
      setIsLoading(true)
      try {
        const searchResults = await fetchSearchResults(query, searchType)
        setResults(searchResults)
      } catch (error) {
        console.error("Error searching:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [query, searchType])
  
  // Navigate to detail page when result clicked
  const handleResultClick = (result: SearchResult) => {
    onClose()
    if (result.type === "user") {
      router.push(`/profile/${result.id}`)
    } else {
      router.push(`/${result.type}/${result.id}`)
    }
  }
  
  // Navigate to search page for full results
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onClose()
      router.push(`/search?q=${encodeURIComponent(query)}&type=${searchType}`)
    }
  }
  
  // Handle key press to close modal on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Wrapper flex to perfectly center */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <m.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-hidden px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full rounded-2xl bg-[#121212] border border-white/10 shadow-2xl overflow-hidden">
                {/* Search header with form */}
                <form onSubmit={handleSearch} className="relative">
                  <div className="flex items-center p-4">
                    <Search className="h-5 w-5 text-gray-400 mr-3" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="მოძებნეთ ანიმე ან მანგა..."
                      className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-lg"
                    />
                    {query && (
                      <button 
                        type="button"
                        onClick={() => setQuery("")}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Toggles */}
                  <div className="border-t border-white/5 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ToggleButton
                        active={searchType === "manga"}
                        onClick={() => setSearchType("manga")}
                        icon={<BookOpen className="h-4 w-4" />}
                        label="მანგა"
                      />
                      <ToggleButton
                        active={searchType === "comics"}
                        onClick={() => setSearchType("comics")}
                        icon={<Book className="h-4 w-4" />}
                        label="კომიქსები"
                      />
                      <ToggleButton
                        active={searchType === "user"}
                        onClick={() => setSearchType("user")}
                        icon={<User className="h-4 w-4" />}
                        label="მომხმარებლები"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="py-1.5 px-3 bg-[hsl(var(--primary))] text-white rounded-lg flex items-center gap-1 text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={query.length < 2}
                    >
                      ძიება
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </button>
                  </div>
                </form>
                
                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <m.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <div className="w-8 h-8 rounded-full border-2 border-t-[hsl(var(--primary))] border-r-[hsl(var(--primary))] border-b-gray-700 border-l-gray-700 animate-spin mx-auto mb-3"></div>
                        <p>მიმდინარეობს ძიება...</p>
                      </m.div>
                    ) : results.length > 0 ? (
                      <m.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-1"
                      >
                        <m.div 
                          className="space-y-1"
                          variants={{
                            hidden: { opacity: 1 },
                            show: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.05
                              }
                            }
                          }}
                          initial="hidden"
                          animate="show"
                        >
                          {results.map((result) => (
                            <m.div
                              key={result.id}
                              variants={{
                                hidden: { opacity: 0, y: 10 },
                                show: { opacity: 1, y: 0 }
                              }}
                              className="p-3 hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
                              onClick={() => handleResultClick(result)}
                            >
                              <div className="w-10 h-10 rounded-md bg-gray-800 overflow-hidden flex-shrink-0">
                                <img 
                                  src={result.image} 
                                  alt={result.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-white truncate">{result.title}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  {result.type === "user" ? (
                                    <User className="h-3 w-3" />
                                  ) : result.type === "manga" ? (
                                    <BookOpen className="h-3 w-3" />
                                  ) : (
                                    <Book className="h-3 w-3" />
                                  )}
                                  <span>{result.type}</span>
                                  {result.year && <span>• {result.year}</span>}
                                </p>
                              </div>
                            </m.div>
                          ))}
                        </m.div>
                      </m.div>
                    ) : query.length >= 2 ? (
                      <m.div
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center"
                      >
                        <img src="/images/mascot/no-search.png" alt="No search results mascot" className="mx-auto w-32 h-32 mb-4" />
                        <p className="text-white/70 text-lg">შედეგები ვერ მოიძებნა</p>
                        <p className="text-sm text-white/50 mt-1">სცადე სხვა საძიებო სიტყვა</p>
                      </m.div>
                    ) : query.length > 0 ? (
                      <m.div
                        key="keep-typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>გააგრძელეთ ტექსტის შეყვანა ძიებისთვის</p>
                      </m.div>
                    ) : (
                      <m.div
                        key="tips"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>დაიწყეთ ტექსტის შეყვანა {searchType === "manga" ? "მანგის" : searchType === "comics" ? "კომიქსის" : "მომხმარებლის"} მოსაძებნად</p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// Toggle button component for anime/manga selection
function ToggleButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all",
        active 
          ? "bg-white/10 text-white" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  )
} 