"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, ChevronRight, ChevronDown, PlusCircle, Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { ImageSkeleton } from "@/components/image-skeleton"
import { useAuth } from "@/components/supabase-auth-provider"

export interface Character {
  id: string
  name: string
  image: string
  role: string
  from?: string
  voiceActor?: {
    id: string
    name: string
    image: string
  } | null
}

interface CharacterSectionProps {
  characters: Character[]
  showEmpty?: boolean
  maxCharacters?: number
  sectionVariants?: any
  itemVariants?: any
  contentId?: string  // For admin edit link
  contentTitle?: string // Series title for saving favourites
}

const defaultSectionVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const defaultItemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 }
}

export function CharacterSection({ 
  characters, 
  showEmpty = true,
  maxCharacters = 10,
  sectionVariants = defaultSectionVariants,
  itemVariants = defaultItemVariants,
  contentId,
  contentTitle = ''
}: CharacterSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  
  // Add safety checks for character data
  const safeCharacters = Array.isArray(characters) ? characters : [];
  
  // Determine which characters to display
  const displayCharacters = expanded ? safeCharacters : safeCharacters.slice(0, maxCharacters);
  const hasMoreToShow = safeCharacters.length > maxCharacters;
  
  console.log("CharacterSection received:", {
    charactersProvided: !!characters,
    count: safeCharacters.length,
    invalid: !Array.isArray(characters),
    expanded,
    displayCount: displayCharacters.length,
    hasMoreToShow,
    isAdmin,
    contentId
  });

  // -------------------- Favourites --------------------
  const [favoriteMap, setFavoriteMap] = useState<{ [id: string]: boolean }>({});

  // Load favourite characters from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("favorites");
      if (!raw) return;
      const obj = JSON.parse(raw);
      const map: { [id: string]: boolean } = {};
      Object.keys(obj).forEach((k) => {
        if (k.startsWith("character-")) {
          map[k.slice(10)] = true; // remove "character-" prefix
        }
      });
      setFavoriteMap(map);
    } catch (err) {
      console.error("Failed to parse favourites", err);
    }
  }, []);

  const toggleFavorite = (ch: Character) => {
    try {
      const raw = localStorage.getItem("favorites");
      const obj = raw ? JSON.parse(raw) : {};
      const key = `character-${ch.id}`;
      const currentlyFav = !!obj[key];

      if (currentlyFav) {
        delete obj[key];
      } else {
        obj[key] = {
          id: ch.id,
          type: "character",
          name: ch.name,
          title: ch.name,
          image: ch.image,
          from: ch.from ?? contentTitle,
          addedAt: new Date().toISOString(),
        };
      }

      localStorage.setItem("favorites", JSON.stringify(obj));
      setFavoriteMap((prev) => ({ ...prev, [ch.id]: !currentlyFav }));

      // Broadcast change so other tabs/components update
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.error("Failed to toggle favourite", err);
    }
  };

  if (safeCharacters.length === 0 && showEmpty) {
    console.log("No characters to display, showing fallback message");
    return (
      <motion.section 
        className="mb-8"
        variants={sectionVariants}
      >
        <motion.h2 
          className="text-2xl font-bold mb-4 flex items-center justify-between"
          variants={itemVariants}
        >
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-purple-400" />
            Characters
          </div>
          {isAdmin && contentId && (
            <Link 
              href={`/admin/content/edit/${contentId}?focus=characters`}
              className="text-sm flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Characters</span>
            </Link>
          )}
        </motion.h2>
        <motion.div 
          className="p-4 bg-black/30 backdrop-blur-sm border border-white/5 rounded-lg"
          variants={itemVariants}
        >
          <p className="text-gray-400">No character information available.</p>
          {isAdmin && contentId && (
            <Link 
              href={`/admin/content/edit/${contentId}?focus=characters`}
              className="mt-3 inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Characters</span>
            </Link>
          )}
        </motion.div>
      </motion.section>
    );
  }

  if (safeCharacters.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <motion.section 
      className="mb-8"
      variants={sectionVariants}
    >
      <motion.h2 
        className="text-2xl font-bold mb-4 flex items-center justify-between"
        variants={itemVariants}
      >
        <div className="flex items-center">
          <Users className="mr-2 h-5 w-5 text-purple-400" />
          Characters {safeCharacters.length > 0 && <span className="ml-2 text-sm text-gray-400">({safeCharacters.length})</span>}
        </div>
        {isAdmin && contentId && (
          <Link 
            href={`/admin/content/edit/${contentId}?focus=characters`}
            className="text-sm flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Edit Characters</span>
          </Link>
        )}
      </motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayCharacters.map((character, index) => (
          <motion.div 
            key={`character-${character.id || index}`}
            className="bg-black/30 backdrop-blur-sm border border-white/5 rounded-lg overflow-hidden transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.03, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
          >
            <div className="aspect-square relative overflow-hidden">
              <ImageSkeleton
                src={character.image || "/placeholder-character.png"}
                alt={character.name || "Unknown character"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              {/* Heart overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleFavorite(character);
                }}
                className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 rounded-full p-1"
              >
                <Heart
                  className="h-4 w-4"
                  fill={favoriteMap[character.id] ? "#e11d48" : "none"}
                  stroke={favoriteMap[character.id] ? "#e11d48" : "#ffffff"}
                />
              </button>
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm line-clamp-1">{character.name || "Unknown"}</h3>
              <p className="text-xs text-gray-400">{character.role || "Unknown role"}</p>
              
              {character.voiceActor && (
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <ImageSkeleton
                      src={character.voiceActor.image || "/placeholder-character.png"}
                      alt={character.voiceActor.name || "Unknown voice actor"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs line-clamp-1">{character.voiceActor.name || "Unknown VA"}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Show view more/less button if needed */}
      {hasMoreToShow && (
        <motion.button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          variants={itemVariants}
          whileHover={{ x: expanded ? -2 : 2 }}
        >
          {expanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Show fewer characters</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>Show all {safeCharacters.length} characters</span>
            </>
          )}
        </motion.button>
      )}
    </motion.section>
  );
} 