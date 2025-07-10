"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { toast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase' // Import Supabase client

// Define the available emojis and their labels
export const EMOJI_REACTIONS = [
  { emoji: '😄', label: 'Love' },
  { emoji: '🔥', label: 'Awesome' },
  { emoji: '🤔', label: 'Interesting' },
  { emoji: '😴', label: 'Boring' },
  { emoji: '💩', label: 'Bad' },
] as const;

type Emoji = typeof EMOJI_REACTIONS[number]['emoji'];

interface EmojiRatingProps {
  contentId: string;
  contentType: 'manga' | 'comics';
  // Removed initialReactions and currentUserReaction props
}

export function EmojiRating({ 
  contentId, 
  contentType
}: EmojiRatingProps) {
  const router = useRouter();
  const { userId, isAuthenticated } = useUnifiedAuth();
  
  const [reactions, setReactions] = useState<Record<Emoji, number>>(() => 
    EMOJI_REACTIONS.reduce((acc, curr) => ({ ...acc, [curr.emoji]: 0 }), {} as Record<Emoji, number>)
  );
  const [selectedReaction, setSelectedReaction] = useState<Emoji | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true, fetch will set to false

  const fetchReactionsAndUserSelection = async () => {
    if (!contentId) {
      setIsLoading(false);
      setReactions(EMOJI_REACTIONS.reduce((acc, curr) => ({ ...acc, [curr.emoji]: 0 }), {} as Record<Emoji, number>));
      setSelectedReaction(null);
      return;
    }
    console.log(`[EmojiRating] Fetching reactions for ${contentType} ${contentId} (User: ${userId})`);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_content_reactions', { 
        p_content_id: contentId, 
        p_user_id: userId 
      });

      if (error) {
        console.error("[EmojiRating] Error fetching reactions:", error);
        setReactions(EMOJI_REACTIONS.reduce((acc, curr) => ({ ...acc, [curr.emoji]: 0 }), {} as Record<Emoji, number>));
        setSelectedReaction(null);
        toast({
          title: "შეცდომა",
          description: "რეაქციების ჩატვირთვა ვერ მოხერხდა.",
          variant: "destructive",
        });
        return; 
      }

      console.log("[EmojiRating] Fetched reaction data from RPC:", data); // CRUCIAL LOG
      const defaultZeroCounts = EMOJI_REACTIONS.reduce((acc, curr) => ({ ...acc, [curr.emoji]: 0 }), {} as Record<Emoji, number>);
      let processedReactionCounts = { ...defaultZeroCounts }; 
      let actualUserReaction: Emoji | null = null;

      // Determine the actual object to process, accommodating RPCs that return an array like [{...}]
      const rpcResultObject = (Array.isArray(data) && data.length > 0) ? data[0] : data;

      if (rpcResultObject && typeof rpcResultObject === 'object') {
        console.log("[EmojiRating] Processing rpcResultObject:", rpcResultObject);

        // Scenario 1: rpcResultObject.reaction_counts is an object like { '👍': 5, '😄': 2 }
        if (rpcResultObject.reaction_counts && typeof rpcResultObject.reaction_counts === 'object' && !Array.isArray(rpcResultObject.reaction_counts)) {
          console.log("[EmojiRating] rpcResultObject.reaction_counts is an OBJECT. Merging.");
          processedReactionCounts = { ...defaultZeroCounts, ...rpcResultObject.reaction_counts };
          // Ensure all EMOJI_REACTIONS keys are present and values are numbers
          for (const key of Object.keys(defaultZeroCounts) as Emoji[]) {
            processedReactionCounts[key] = Number(processedReactionCounts[key] || 0);
          }
        } 
        // Scenario 2: rpcResultObject.reaction_counts is an array of emoji strings or objects to be counted by client
        else if (rpcResultObject.reaction_counts && Array.isArray(rpcResultObject.reaction_counts)) {
          console.log("[EmojiRating] rpcResultObject.reaction_counts is an ARRAY. Counting elements.");
          const countsFromArray = { ...defaultZeroCounts };
          for (const item of rpcResultObject.reaction_counts) {
            const emojiItem = (typeof item === 'object' && item !== null && 'emoji' in item) ? item.emoji : item;
            if (typeof emojiItem === 'string' && countsFromArray.hasOwnProperty(emojiItem)) {
              countsFromArray[emojiItem as Emoji]++;
            }
          }
          processedReactionCounts = countsFromArray;
        }
        // Scenario 3: Fallback, maybe the RPC returns all individual reactions in a field like 'all_reactions'
        else if (rpcResultObject.all_reactions && Array.isArray(rpcResultObject.all_reactions)) {
          console.log("[EmojiRating] rpcResultObject.all_reactions is an ARRAY. Counting elements.");
          const countsFromArray = { ...defaultZeroCounts };
          for (const item of rpcResultObject.all_reactions) {
            const emojiItem = (typeof item === 'object' && item !== null && 'emoji' in item) ? item.emoji : item;
            if (typeof emojiItem === 'string' && countsFromArray.hasOwnProperty(emojiItem)) {
              countsFromArray[emojiItem as Emoji]++;
            }
          }
          processedReactionCounts = countsFromArray;
        } else {
          console.log("[EmojiRating] No recognizable reaction count structure in rpcResultObject.reaction_counts or rpcResultObject.all_reactions. Using default zero counts.");
          // This will leave processedReactionCounts as defaultZeroCounts if no specific structure matched
        }
        actualUserReaction = rpcResultObject.user_reaction || null;
        setReactions(processedReactionCounts);
        setSelectedReaction(actualUserReaction);

      } else {
        // No data returned from RPC or unexpected structure
        console.log("[EmojiRating] No valid data object returned from RPC or data is not in expected array/object format. Using default zero counts.");
        setReactions(defaultZeroCounts);
        setSelectedReaction(null);
      }
    } catch (err) {
      console.error("[EmojiRating] Unexpected error fetching reactions:", err);
      setReactions(EMOJI_REACTIONS.reduce((acc, curr) => ({ ...acc, [curr.emoji]: 0 }), {} as Record<Emoji, number>));
      setSelectedReaction(null);
      toast({
        title: "მოულოდნელი შეცდომა",
        description: "რეაქციების ჩატვირთვისას.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitReaction = async (emoji: Emoji) => {
    if (!isAuthenticated || !userId) {
      toast({
        title: "შესვლა აუცილებელია",
        description: "რეაქციის დასაფიქსირებლად გთხოვთ შეხვიდეთ სისტემაში.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    const oldSelectedReaction = selectedReaction;
    const oldReactions = { ...reactions };

    // Optimistic update
    setSelectedReaction(emoji);
    setReactions(prev => {
      const newCounts = { ...prev };
      newCounts[emoji] = (newCounts[emoji] || 0) + 1;
      if (oldSelectedReaction && oldSelectedReaction !== emoji) {
        newCounts[oldSelectedReaction] = Math.max(0, (newCounts[oldSelectedReaction] || 1) - 1);
      }
      return newCounts;
    });

    try {
      const { data, error: rpcError } = await supabase.rpc('add_or_update_reaction', {
        p_content_id: contentId,
        p_user_id: userId,
        p_emoji: emoji
      });
      
      // Check for both direct RPC error and error object within data (if RPC structure includes it)
      let errorMessage = rpcError?.message;
      if (!errorMessage && data && typeof data === 'object' && 'error' in data && data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }


      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      // Check for success flag if RPC structure includes it
      let success = true; // Assume success if no error and no explicit success=false
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
          success = false;
          if(!errorMessage) errorMessage = "რეაქციის შენახვა ვერ მოხერხდა: სერვერის მიერ დაბრუნებული წარუმატებელი სტატუსი.";
          throw new Error(errorMessage);
      }


      if (success) { // Success case
        toast({
          title: "რეაქცია შენახულია!",
          description: (
            <div className="flex items-center">
              თქვენი რეაქცია: <span className="text-2xl mx-1">{emoji}</span>
            </div>
          ),
          duration: 2000,
        });
        fetchReactionsAndUserSelection(); // Crucial: Re-fetch to get latest counts from DB
      }
      // No explicit else needed for !success if error was thrown

    } catch (err: any) {
      console.error("[EmojiRating] Error submitting reaction:", err);
      toast({
        title: "შეცდომა",
        description: err.message || "რეაქციის შენახვა ვერ მოხერხდა.",
        variant: "destructive",
      });
      setSelectedReaction(oldSelectedReaction);
      setReactions(oldReactions);
    }
  };

  useEffect(() => {
    // Always fetch reactions when contentId or userId changes and contentId is present
    if (contentId) {
      fetchReactionsAndUserSelection();
    } else {
      // If no contentId, reset to initial empty state and stop loading
      setIsLoading(false);
      setReactions(EMOJI_REACTIONS.reduce((acc, curr) => ({ ...acc, [curr.emoji]: 0 }), {} as Record<Emoji, number>));
      setSelectedReaction(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, userId]); // Dependencies for re-fetching


  if (isLoading) { 
    return (
      <div className="flex flex-col justify-center items-center p-4 bg-black/20 rounded-lg min-h-[100px]">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-2" />
        <p className="text-sm text-gray-400">იტვირთება რეაქციები...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-3 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-sm font-medium text-gray-300 mb-3 text-center">როგორ შეაფასებდით?</p>
      <div className="flex justify-around items-center space-x-1 sm:space-x-2">
        {EMOJI_REACTIONS.map(({ emoji, label }) => (
          <motion.button
            key={emoji}
            onClick={() => submitReaction(emoji)}
            className={cn(
              'flex flex-col items-center rounded-lg transition-all duration-200 ease-out',
              selectedReaction === emoji
                ? 'bg-purple-600/50 !w-[60px] transition-all duration-200 ease-out ring-2 ring-purple-400 scale-110'
                : 'hover:bg-white/10 hover:scale-110'
            )}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
            title={label}
            aria-label={`შეფასება: ${label}`}
          >
            <span className="text-2xl sm:text-3xl transition-transform duration-200 ease-out">
              {emoji}
            </span>
            <span className="text-xs text-gray-200 font-medium mt-1">
              {(reactions && reactions[emoji] !== undefined) ? (reactions[emoji] || 0).toLocaleString() : '0'}
            </span>
          </motion.button>
        ))}
      </div>
      {selectedReaction && isAuthenticated && (
        <p className="text-xs text-purple-400 mt-3 text-center">
          თქვენი შეფასება: <span className="text-lg">{selectedReaction}</span>
        </p>
      )}
    </motion.div>
  );
} 