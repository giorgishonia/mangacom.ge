"use client"

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define banner types
export type BannerType = 'anime' | 'color';
export type BannerOption = { 
  id: string;
  name: string; 
} & (
  | { type: 'anime'; src: string }
  | { type: 'color'; class: string }
);

// Define predefined banner options
export const ANIME_BANNERS: BannerOption[] = [
  { type: 'anime', id: 'anime1', name: 'Anime Banner 1', src: '/banners/anime-banner1.jpg' },
  { type: 'anime', id: 'anime2', name: 'Anime Banner 2', src: '/banners/anime-banner2.jpg' },
  { type: 'anime', id: 'anime3', name: 'Anime Banner 3', src: '/banners/anime-banner3.jpg' },
  { type: 'anime', id: 'anime4', name: 'Anime Banner 4', src: '/banners/anime-banner4.jpg' },
  { type: 'anime', id: 'anime5', name: 'Anime Banner 5', src: '/banners/anime-banner5.jpg' },
  { type: 'anime', id: 'anime6', name: 'Anime Banner 6', src: '/banners/anime-banner6.jpg' },
];

export const COLOR_BANNERS: BannerOption[] = [
  { type: 'color', id: 'gradient1', name: 'Purple to Blue', class: 'bg-gradient-to-r from-purple-500 to-blue-500' },
  { type: 'color', id: 'gradient2', name: 'Blue to Cyan', class: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
  { type: 'color', id: 'gradient3', name: 'Violet to Indigo', class: 'bg-gradient-to-r from-violet-500 to-indigo-500' },
  { type: 'color', id: 'gradient4', name: 'Rose to Pink', class: 'bg-gradient-to-r from-rose-500 to-pink-500' },
  { type: 'color', id: 'gradient5', name: 'Emerald to Teal', class: 'bg-gradient-to-r from-emerald-500 to-teal-500' },
  { type: 'color', id: 'gradient6', name: 'Amber to Orange', class: 'bg-gradient-to-r from-amber-500 to-orange-500' },
  { type: 'color', id: 'solid1', name: 'Purple', class: 'bg-purple-900' },
  { type: 'color', id: 'solid2', name: 'Blue', class: 'bg-blue-900' },
  { type: 'color', id: 'solid3', name: 'Indigo', class: 'bg-indigo-900' },
];

interface BannerSelectorProps {
  selectedBanner: string | null | undefined;
  onSelectBanner: (banner: { type: BannerType; id: string }) => void;
}

export function BannerSelector({ selectedBanner, onSelectBanner }: BannerSelectorProps) {
  const [activeTab, setActiveTab] = useState<BannerType>("anime");

  const isSelected = (type: BannerType, id: string) => {
    if (!selectedBanner) return false;
    return selectedBanner === `${type}:${id}`;
  };

  return (
    <Tabs defaultValue="anime" className="w-full" onValueChange={(value) => setActiveTab(value as BannerType)}>
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="anime">Anime Banners</TabsTrigger>
        <TabsTrigger value="color">Color Banners</TabsTrigger>
      </TabsList>
      
      <TabsContent value="anime" className="mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ANIME_BANNERS.map((banner) => {
            const animeBanner = banner as Extract<BannerOption, { type: 'anime' }>; // Type assertion
            return (
            <div 
              key={animeBanner.id}
              onClick={() => onSelectBanner({ type: 'anime', id: animeBanner.id })}
              className={cn(
                "relative h-16 rounded-md overflow-hidden cursor-pointer border-2",
                isSelected('anime', animeBanner.id) ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
              )}
            >
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${animeBanner.src})` }}
              />
              {isSelected('anime', animeBanner.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <CheckIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          )})}
        </div>
      </TabsContent>

      <TabsContent value="color" className="mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_BANNERS.map((banner) => {
            const colorBanner = banner as Extract<BannerOption, { type: 'color' }>; // Type assertion
            return (
            <div 
              key={colorBanner.id}
              onClick={() => onSelectBanner({ type: 'color', id: colorBanner.id })}
              className={cn(
                "relative h-16 rounded-md overflow-hidden cursor-pointer border-2",
                isSelected('color', colorBanner.id) ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
              )}
            >
              <div className={cn("w-full h-full", colorBanner.class)} />
              {isSelected('color', colorBanner.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <CheckIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          )})}
        </div>
      </TabsContent>
    </Tabs>
  );
} 