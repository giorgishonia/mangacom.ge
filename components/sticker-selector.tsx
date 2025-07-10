"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

// Define sticker categories and their items
const STICKER_CATEGORIES = [
  {
    name: 'Anime',
    stickers: [
      { id: 'anime1', url: '/stickers/anime/dance.gif', alt: 'Dance anime' },
      { id: 'anime2', url: '/stickers/anime/sad.gif', alt: 'Sad anime' },
      { id: 'anime3', url: '/stickers/anime/love.gif', alt: 'Love anime' },
      { id: 'anime4', url: '/stickers/anime/angry.gif', alt: 'Angry anime' },
      { id: 'anime5', url: '/stickers/anime/surprised.gif', alt: 'Surprised anime' },
      { id: 'anime6', url: '/stickers/anime/laugh.gif', alt: 'Laugh anime' },
    ]
  },
  {
    name: 'Manga',
    stickers: [
      { id: 'manga1', url: '/stickers/manga/baka.gif', alt: 'Baka' },
      { id: 'manga2', url: '/stickers/manga/statue-smile.gif', alt: 'Smile manga' },
      { id: 'manga3', url: '/stickers/manga/guts.gif', alt: 'Berserk manga' },
      { id: 'manga4', url: '/stickers/manga/musashi.gif', alt: 'Vagabond manga' },
      { id: 'manga5', url: '/stickers/manga/climber.gif', alt: 'The climber manga' },
      { id: 'manga6', url: '/stickers/manga/punpun.gif', alt: 'Punpun manga' },
    ]
  },
  {
    name: 'VIP', // New VIP Category
    stickers: [
      { id: 'vip1', url: '/stickers/vip/vip-placeholder-1.gif', alt: 'VIP Sparkle', isVip: true },
      { id: 'vip2', url: '/stickers/vip/vip-placeholder-2.gif', alt: 'VIP Exclusive', isVip: true },
      { id: 'vip3', url: '/stickers/anime/love.gif', alt: 'VIP Love (example)', isVip: true }, // Example existing as VIP
    ]
  }
]

export interface Sticker {
  id: string
  url: string
  alt: string
  isVip?: boolean
}

interface StickerSelectorProps {
  onSelectSticker: (sticker: Sticker) => void
  onClose: () => void
  profile?: { vip_status?: boolean; [key: string]: any } | null
}

export function StickerSelector({ onSelectSticker, onClose, profile }: StickerSelectorProps) {
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[0].name) // Default to Anime category
  const userVipStatus = profile?.vip_status || false; // Determine VIP status from passed profile
  
  const handleStickerClick = (sticker: Sticker) => {
    if (sticker.isVip && !userVipStatus) {
      console.log("This is a VIP sticker.");
      alert("This sticker is for VIP members only."); // Alert for non-VIPs trying to use VIP sticker
      return; // Don't select if VIP sticker and user is not VIP
    }
    onSelectSticker(sticker)
    onClose()
  }
  
  return (
    <motion.div 
      className="absolute bottom-full left-0 mb-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 w-80 z-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Select a Sticker</h3>
        <div 
          className="h-6 w-6 p-0 text-gray-400 hover:text-white flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </div>
      </div>
      
      {/* Category tabs */}
      <div className="flex space-x-1 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {STICKER_CATEGORIES.map((category) => (
          <button
            key={category.name}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
              activeCategory === category.name
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCategory(category.name);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Stickers grid */}
      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
        {STICKER_CATEGORIES.find(c => c.name === activeCategory)?.stickers.map((sticker) => {
          const isVipOnly = 'isVip' in sticker && sticker.isVip;
          const isDisabled = isVipOnly && !userVipStatus;

          return (
            <button
              key={sticker.id}
              className={`relative bg-black/50 border border-white/5 rounded-md transition-all h-20 overflow-hidden flex items-center justify-center group ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled) {
                  handleStickerClick(sticker);
                } else {
                  alert("This sticker is for VIP members only.");
                }
              }}
              disabled={isDisabled}
            >
              <Image
                src={sticker.url}
                alt={sticker.alt}
                width={64}
                height={64}
                className="object-contain max-h-full max-w-full"
              />
              {isVipOnly && (
                <div className={`absolute top-1 right-1 p-0.5 bg-purple-600 rounded-full text-white ${isDisabled ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {isVipOnly && !userVipStatus && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-yellow-400">
                    <path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.55a.75.75 0 011.06 0l1.062 1.06A.75.75 0 016.11 5.672l-1.06-1.06a.75.75 0 010-1.062zM14.95 3.55a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 11-1.062-1.061l1.06-1.06a.75.75 0 011.062 0zM3 9.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 9.25zM14.5 9.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM5.05 14.95a.75.75 0 010-1.06l1.06-1.062a.75.75 0 111.061 1.061l-1.06 1.06a.75.75 0 01-1.062 0zM13.89 13.89a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 01-1.06 1.062l-1.061-1.06zM10 13a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
} 