"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Calendar, Clock, BookOpen, Bug, Lightbulb, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ka } from "date-fns/locale";
import { useAuth } from "@/components/supabase-auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toggleVote } from "@/lib/feedback";
import { motion } from "framer-motion";

interface SuggestionCardProps {
  suggestion: {
    id: string;
    title: string;
    description: string;
    type: string;
    userId: string;
    createdAt: string;
    votes: number;
    userHasVoted: boolean;
    profile: {
      displayName: string;
      avatarUrl: string;
    };
  };
  onVote: () => void;
}

export default function SuggestionCard({
  suggestion,
  onVote,
}: SuggestionCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-4 w-4 text-red-400" />;
      case "feature":
        return <Lightbulb className="h-4 w-4 text-yellow-400" />;
      case "anime":
      case "manga":
        return <BookOpen className="h-4 w-4 text-purple-400" />;
      case "sticker":
      case "gif":
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "bug":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "feature":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "anime":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "manga":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "sticker":
      case "gif":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <motion.div 
      className="glass-card rounded-lg border border-white/5 hover:border-white/10 p-4 transition-all duration-300"
      whileHover={{ y: -2, boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex gap-4">
        {/* Vote button */}
        <div className="flex flex-col items-center">
          <motion.button
            className={`vote-button p-1.5 rounded-lg flex flex-col items-center gap-1 ${
              suggestion.userHasVoted
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-black/20 hover:bg-black/30 text-white/60 hover:text-white border border-white/5"
            }`}
            onClick={onVote}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUp
              className={`h-4 w-4 ${
                suggestion.userHasVoted ? "text-purple-400" : "text-white/60"
              }`}
            />
            <span className="text-sm font-medium">{suggestion.votes}</span>
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={`${getTypeBadgeColor(
                suggestion.type
              )} flex items-center gap-1 px-2 py-0.5`}
            >
              {getTypeIcon(suggestion.type)}
              {suggestion.type === "anime" ? "ანიმე" :
               suggestion.type === "manga" ? "მანგა" :
               suggestion.type === "sticker" ? "სტიკერი" :
               suggestion.type === "bug" ? "შეცდომა" :
               suggestion.type === "feature" ? "ფუნქცია" :
               suggestion.type}
            </Badge>
            <span className="text-xs text-gray-400">
              {suggestion.createdAt ? (() => {
                try {
                  const date = new Date(suggestion.createdAt);
                  // Check if the date is valid
                  if (!isNaN(date.getTime())) {
                    return formatDistanceToNow(date, { addSuffix: true });
                  }
                  return "ახლახანს"; // Fallback for invalid date
                } catch (error) {
                  console.error("Error formatting date:", error, suggestion.createdAt);
                  return "ახლახანს"; // Fallback for any date parsing errors
                }
              })() : "ახლახანს"}
            </span>
          </div>

          <h3 className="font-semibold mb-1 text-white">{suggestion.title}</h3>
          <p className="text-sm text-gray-300 mb-4">{suggestion.description}</p>

          <div className="flex items-center text-sm text-gray-400">
            <Avatar className="h-5 w-5 mr-1.5">
              <AvatarImage src={suggestion.profile.avatarUrl} />
              <AvatarFallback>
                {suggestion.profile.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span>{suggestion.profile.displayName}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 