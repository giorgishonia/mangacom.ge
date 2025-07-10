"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowDownAZ, ArrowUpAZ, Sparkles, MessageSquare, BugIcon, Lightbulb, BadgeInfo, PenTool, ChevronRight, BookOpen, Search, Filter, Plus, RefreshCcw, SortAsc } from "lucide-react";
import { useAuth } from "@/components/supabase-auth-provider";
import {
  getAllSuggestions,
  toggleVote,
  Suggestion,
} from "@/lib/feedback";
import NewSuggestionDialog from "./components/new-suggestion-dialog";
import SuggestionCard from "./components/suggestion-card";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { motion as m, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { getSupabaseAvatarUrl } from "@/lib/comments";

import "./feedback.css";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"popular" | "newest">("popular");
  
  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const data = await getAllSuggestions(userId);
      setSuggestions(data);
      setIsLoadingSuggestions(false);
    } catch (error) {
      console.error("Error loading suggestions:", error);
      toast.error("Could not load suggestions. Please try again later.");
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  useEffect(() => {
    const type = searchParams?.get("type");
    if (type && ["manga", "sticker", "gif", "feature", "bug", "improvement"].includes(type)) {
      setSelectedType(type);
    }
  }, [searchParams]);

  const handleVote = async (suggestionId: string, hasVoted: boolean) => {
    if (!userId) {
      toast.error("You must be signed in to vote");
      return;
    }
    
    try {
      const result = await toggleVote(suggestionId, userId);
      
      // Update local state
      setSuggestions((prev) =>
        prev.map((s) => {
          if (s.id === suggestionId) {
            return {
              ...s,
              vote_count: hasVoted ? s.vote_count - 1 : s.vote_count + 1,
              has_voted: !hasVoted,
            };
          }
          return s;
        })
      );
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Could not register your vote. Please try again.");
    }
  };

  const handleNewSuggestion = (suggestion: Suggestion) => {
    // Ensure the suggestion has a valid created_at date
    const newSuggestion = {
      ...suggestion,
      created_at: suggestion.created_at || new Date().toISOString()
    };
    
    setSuggestions((prev) => [newSuggestion, ...prev]);
    toast.success("თქვენი მოთხოვნა დაემატა!");
  };

  const changeType = (value: string) => {
    setSelectedType(value);
    
    // Update URL to reflect the selected type
    if (value !== "all") {
      router.push(`/suggestions?type=${value}`, { scroll: false });
    } else {
      router.push("/suggestions", { scroll: false });
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "anime": return <PenTool className="h-4 w-4" />;
      case "manga": return <BookOpen className="h-4 w-4" />;
      case "sticker": return <MessageSquare className="h-4 w-4" />;
      case "bug": return <BugIcon className="h-4 w-4" />;
      case "feature": return <Lightbulb className="h-4 w-4" />;
      default: return <BadgeInfo className="h-4 w-4" />;
    }
  };

  // Get filtered and sorted suggestions based on current UI state
  const getFilteredSuggestions = () => {
    return suggestions
      .filter((suggestion) => {
        // Filter by selected type tab (if not 'all')
        if (selectedType !== "all" && suggestion.type !== selectedType) return false;
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          if (
            !suggestion.title.toLowerCase().includes(query) &&
            !suggestion.description.toLowerCase().includes(query)
          ) {
            return false;
          }
        }

        // Add other potential filters here if needed in the future (e.g., voted, mine)

        return true;
      })
      .sort((a, b) => {
        // Sort suggestions
        if (sortOrder === "popular") {
          return (b.vote_count || 0) - (a.vote_count || 0);
        } else { // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <m.div 
        className="flex-1 px-4 sm:px-6 py-6 container md:pl-[120px]"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <m.div 
          className="container space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <m.div className="flex flex-col gap-2" variants={fadeIn}>
            <h1 className="pl-8 text-2xl font-bold tracking-tight flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-400" />
              უკუკავშირი
            </h1>
            <p className="text-muted-foreground">
              წარმოადგინეთ თქვენი იდეები, შეგვატყობინეთ შეცდომების შესახებ ან შემოგვთავაზეთ გაუმჯობესების იდეები. 
              ასევე შეგიძლიათ მისცეთ ხმა მოთხოვნებს ან იდეებს, რომელთა დანერგვაც გსურთ.
            </p>
          </m.div>

          <m.div 
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            variants={fadeIn}
          >
            <div className="flex-1 w-full sm:max-w-sm relative">
              <Input
                placeholder="მოთხოვნების ძიება..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 focus:border-purple-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-600/20 transition-all"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                ახალი მოთხოვნა
              </Button>

              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "popular" | "newest")}>
                <SelectTrigger className="w-full sm:w-[140px] border-white/10 bg-black/30">
                  <SelectValue placeholder="დალაგება" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900/95 backdrop-blur-md">
                  <SelectItem value="popular">
                    <div className="flex items-center">
                      <ArrowUpAZ className="h-4 w-4 mr-2" />
                      პოპულარული
                    </div>
                  </SelectItem>
                  <SelectItem value="newest">
                    <div className="flex items-center">
                      <ArrowDownAZ className="h-4 w-4 mr-2" />
                      ახალი
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </m.div>

          <m.div variants={fadeIn}>
            <Tabs value={selectedType} onValueChange={changeType} className="w-full">
              <TabsList className="w-fit flex flex-wrap h-auto justify-start bg-black/20 border border-white/5 p-1 gap-1">
                <TabsTrigger 
                  value="all" 
                  className="text-[13px] data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  ყველა
                </TabsTrigger>
                <TabsTrigger 
                  value="anime" 
                  className="text-[13px] data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  ანიმე
                </TabsTrigger>
                <TabsTrigger 
                  value="manga" 
                  className="text-[13px] data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  მანგა
                </TabsTrigger>
                <TabsTrigger 
                  value="sticker" 
                  className="text-[13px] data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  სტიკერები
                </TabsTrigger>
                <TabsTrigger 
                  value="bug" 
                  className="text-[13px] data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  შეცდომები
                </TabsTrigger>
                <TabsTrigger 
                  value="feature" 
                  className="text-[13px] data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  ფუნქციები
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </m.div>

          <AnimatePresence mode="wait">
            {isLoadingSuggestions ? (
              <m.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center py-12"
              >
                <div className="loader">
                </div>
              </m.div>
            ) : getFilteredSuggestions().length === 0 ? (
              <m.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12 border rounded-lg bg-gradient-to-b from-black/30 to-purple-900/5 backdrop-blur-sm border-white/5"
              >
                <m.div
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="mb-4"
                >
                  <img src="/images/mascot/suggestion.png" alt="Suggestion mascot" className="mx-auto w-32 h-32" />
                </m.div>
                <h3 className="text-lg font-medium">მოთხოვნები ვერ მოიძებნა</h3>
                <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                  {searchQuery.trim()
                    ? "სცადეთ სხვა საძიებო ტერმინი"
                    : "იყავით პირველი, ვინც დაამატებს მოთხოვნას!"}
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  ახალი მოთხოვნა
                </Button>
              </m.div>
            ) : (
              <m.div 
                className="space-y-4"
                key="suggestions-list"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {getFilteredSuggestions().map((suggestion) => (
                  <m.div 
                    key={suggestion.id}
                    variants={fadeIn}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <SuggestionCard
                      suggestion={{
                        id: suggestion.id,
                        title: suggestion.title,
                        description: suggestion.description,
                        type: suggestion.type,
                        userId: suggestion.user?.id || "",
                        createdAt: suggestion.created_at,
                        votes: suggestion.vote_count,
                        userHasVoted: suggestion.has_voted,
                        profile: {
                          displayName: suggestion.user?.name || suggestion.user?.username || "Anonymous",
                          avatarUrl: getSupabaseAvatarUrl(suggestion.user?.id || "", suggestion.user?.image || null) || ""
                        }
                      }}
                      onVote={() =>
                        handleVote(suggestion.id, suggestion.has_voted)
                      }
                    />
                  </m.div>
                ))}
              </m.div>
            )}
          </AnimatePresence>

          <NewSuggestionDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSuggestionAdded={handleNewSuggestion}
          />
        </m.div>
      </m.div>
    </div>
  );
} 