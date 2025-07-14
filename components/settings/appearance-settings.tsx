'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/users';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/hooks/use-preferred-language';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Star, Lock, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppearanceSettingsProps {
  currentProfile: UserProfile;
  userId: string;
}

// All available image banners (available to everyone)
const IMAGE_BANNERS = [
  { name: 'Default', id: 'default', url: null, preview: '/images/comment-banners/4035-sad-discord.png' },
  { name: 'Gojo Satoru', id: 'gojo', url: '/images/comment-banners/6477-gojo-satoru.png', preview: '/images/comment-banners/6477-gojo-satoru.png' },
  { name: 'Anime Characters', id: 'anime-chars', url: '/images/comment-banners/7644-anime-characters.png', preview: '/images/comment-banners/7644-anime-characters.png' },
  { name: 'Badass Anime', id: 'badass', url: '/images/comment-banners/5421-badass-anime.png', preview: '/images/comment-banners/5421-badass-anime.png' },
  { name: 'DIO', id: 'dio', url: '/images/comment-banners/2611-dio.png', preview: '/images/comment-banners/2611-dio.png' },
  { name: 'Anime Manga', id: 'anime-manga-1', url: '/images/comment-banners/8852-anime-manga.png', preview: '/images/comment-banners/8852-anime-manga.png' },
  { name: 'Your Name', id: 'your-name', url: '/images/comment-banners/7121-your-name.png', preview: '/images/comment-banners/7121-your-name.png' },
  { name: 'Sad Discord', id: 'sad-discord', url: '/images/comment-banners/4035-sad-discord.png', preview: '/images/comment-banners/4035-sad-discord.png' },
  { name: 'Madara Uchiha', id: 'madara', url: '/images/comment-banners/5840-madara-uchiha.png', preview: '/images/comment-banners/5840-madara-uchiha.png' },
  { name: 'Chill Anime', id: 'chill-anime', url: '/images/comment-banners/8862-chill-anime.png', preview: '/images/comment-banners/8862-chill-anime.png' },
  { name: 'Jinx', id: 'jinx', url: '/images/comment-banners/3018-jinx.png', preview: '/images/comment-banners/3018-jinx.png' },
  { name: 'Sage Green', id: 'sage-green', url: '/images/comment-banners/9927-sage-green.png', preview: '/images/comment-banners/9927-sage-green.png' },
  { name: 'Maki', id: 'maki', url: '/images/comment-banners/1165-maki.png', preview: '/images/comment-banners/1165-maki.png' },
  { name: 'Anime Manga 2', id: 'anime-manga-2', url: '/images/comment-banners/7371-anime-manga.png', preview: '/images/comment-banners/7371-anime-manga.png' },
  { name: 'Creepy Anime', id: 'creepy-anime', url: '/images/comment-banners/8260-creepy-anime.png', preview: '/images/comment-banners/8260-creepy-anime.png' },
  { name: 'Aesthetic Kawaii', id: 'aesthetic-kawaii', url: '/images/comment-banners/7468-aesthetic-kawaii.png', preview: '/images/comment-banners/7468-aesthetic-kawaii.png' },
  { name: 'Haise Sasaki', id: 'haise', url: '/images/comment-banners/9672-haise-sasaki.png', preview: '/images/comment-banners/9672-haise-sasaki.png' },
  { name: 'Sunflower', id: 'sunflower', url: '/images/comment-banners/2009-sunflower.png', preview: '/images/comment-banners/2009-sunflower.png' },
  { name: 'Makima', id: 'makima', url: '/images/comment-banners/9403-makima.png', preview: '/images/comment-banners/9403-makima.png' },
  { name: 'Garou', id: 'garou', url: '/images/comment-banners/7276-garou.png', preview: '/images/comment-banners/7276-garou.png' },
  { name: 'Creepy Anime 2', id: 'creepy-anime-2', url: '/images/comment-banners/1993-creepy-anime.png', preview: '/images/comment-banners/1993-creepy-anime.png' },
  { name: 'Lain', id: 'lain', url: '/images/comment-banners/8542-lain.png', preview: '/images/comment-banners/8542-lain.png' },
  { name: 'Mista', id: 'mista', url: '/images/comment-banners/8433-mista.png', preview: '/images/comment-banners/8433-mista.png' },
  { name: 'Sasuke Uchiha', id: 'sasuke', url: '/images/comment-banners/6227-sasuke-uchiha.png', preview: '/images/comment-banners/6227-sasuke-uchiha.png' },
  { name: 'Emo Aesthetic', id: 'emo', url: '/images/comment-banners/3887-emo-aesthetic.png', preview: '/images/comment-banners/3887-emo-aesthetic.png' },
  { name: 'Star', id: 'star', url: '/images/comment-banners/4476-star.png', preview: '/images/comment-banners/4476-star.png' },
  { name: 'Garou 2', id: 'garou-2', url: '/images/comment-banners/4093-garou.png', preview: '/images/comment-banners/4093-garou.png' },
  { name: 'Sailor Mars', id: 'sailor-mars', url: '/images/comment-banners/4085-sailor-mars.png', preview: '/images/comment-banners/4085-sailor-mars.png' },
  { name: 'Chainsaw Man', id: 'chainsaw-man', url: '/images/comment-banners/4115-chainsaw-man-manga.png', preview: '/images/comment-banners/4115-chainsaw-man-manga.png' },
  { name: 'Sung Jin Woo', id: 'sung-jin-woo', url: '/images/comment-banners/8127-sung-jin-woo.png', preview: '/images/comment-banners/8127-sung-jin-woo.png' },
  { name: 'Light Yagami', id: 'light', url: '/images/comment-banners/7824-light-yagami.png', preview: '/images/comment-banners/7824-light-yagami.png' },
  { name: 'Kill la Kill', id: 'kill-la-kill', url: '/images/comment-banners/3288-kill-la-kill.png', preview: '/images/comment-banners/3288-kill-la-kill.png' },
  { name: 'Makise Kurisu', id: 'kurisu', url: '/images/comment-banners/8856-makise-kurisu.png', preview: '/images/comment-banners/8856-makise-kurisu.png' },
  { name: 'Armin Arlert', id: 'armin', url: '/images/comment-banners/9270-armin-arlert.png', preview: '/images/comment-banners/9270-armin-arlert.png' },
  { name: 'Jinx Arcane', id: 'jinx-arcane', url: '/images/comment-banners/9734-jinx-arcane.png', preview: '/images/comment-banners/9734-jinx-arcane.png' },
  { name: 'Chainsaw Man 2', id: 'chainsaw-man-2', url: '/images/comment-banners/3582-chainsaw-man-manga.png', preview: '/images/comment-banners/3582-chainsaw-man-manga.png' },
  { name: 'Eren Manga', id: 'eren', url: '/images/comment-banners/5498-eren-manga.png', preview: '/images/comment-banners/5498-eren-manga.png' },
  { name: 'Sunflower 2', id: 'sunflower-2', url: '/images/comment-banners/8092-sunflower.png', preview: '/images/comment-banners/8092-sunflower.png' },
  { name: 'Tomoko Kuroki', id: 'tomoko', url: '/images/comment-banners/7997-tomoko-kuroki.png', preview: '/images/comment-banners/7997-tomoko-kuroki.png' },
  { name: 'Chainsaw Man 3', id: 'chainsaw-man-3', url: '/images/comment-banners/2573-chainsaw-man-manga.png', preview: '/images/comment-banners/2573-chainsaw-man-manga.png' },
  { name: 'Funny Animal', id: 'funny-animal', url: '/images/comment-banners/9329-funny-animal.png', preview: '/images/comment-banners/9329-funny-animal.png' },
  { name: 'Chill Anime 2', id: 'chill-anime-2', url: '/images/comment-banners/2090-chill-anime.png', preview: '/images/comment-banners/2090-chill-anime.png' },
  { name: 'Phonk', id: 'phonk', url: '/images/comment-banners/6011-phonk.png', preview: '/images/comment-banners/6011-phonk.png' },
  { name: 'Shinji Ikari', id: 'shinji', url: '/images/comment-banners/8470-shinji-ikari.png', preview: '/images/comment-banners/8470-shinji-ikari.png' },
  { name: 'Misa', id: 'misa', url: '/images/comment-banners/4997-misa.png', preview: '/images/comment-banners/4997-misa.png' },
  { name: 'Aesthetic Dark', id: 'aesthetic-dark', url: '/images/comment-banners/4906-aesthetic-dark.png', preview: '/images/comment-banners/4906-aesthetic-dark.png' },
  { name: 'Satoru Gojo', id: 'satoru-gojo', url: '/images/comment-banners/2697-satoru-gojo.png', preview: '/images/comment-banners/2697-satoru-gojo.png' },
  { name: 'Parasyte', id: 'parasyte', url: '/images/comment-banners/8436-parasyte.png', preview: '/images/comment-banners/8436-parasyte.png' },
  { name: 'Hanako Kun', id: 'hanako', url: '/images/comment-banners/2832-hanako-kun.png', preview: '/images/comment-banners/2832-hanako-kun.png' },
  { name: 'JoJo Meme', id: 'jojo-meme', url: '/images/comment-banners/4585-jojo-meme.png', preview: '/images/comment-banners/4585-jojo-meme.png' },
  { name: 'Dark Aesthetic', id: 'dark-aesthetic', url: '/images/comment-banners/5480-dark-aesthetic-anime.png', preview: '/images/comment-banners/5480-dark-aesthetic-anime.png' },
];

// VIP-only GIF banners
const GIF_BANNERS = [
  { name: 'Tree Animation', id: 'tree-gif', url: '/images/comment-banners/38782-tree.gif', preview: '/images/comment-banners/38782-tree.gif' },
  { name: 'Rajib Animation', id: 'rajib-gif', url: '/images/comment-banners/28745-rajib41.gif', preview: '/images/comment-banners/28745-rajib41.gif' },
  { name: 'Shawn Animation', id: 'shawn-gif', url: '/images/comment-banners/20876-shawn.gif', preview: '/images/comment-banners/20876-shawn.gif' },
  { name: 'Work Animation', id: 'work-gif', url: '/images/comment-banners/58853-fkimgworkkk.gif', preview: '/images/comment-banners/58853-fkimgworkkk.gif' },
  { name: 'Special Animation', id: 'special-gif', url: '/images/comment-banners/24427-.gif', preview: '/images/comment-banners/24427-.gif' },
  { name: 'Isai Animation', id: 'isai-gif', url: '/images/comment-banners/11936-isaicarb.gif', preview: '/images/comment-banners/11936-isaicarb.gif' },
];

export function AppearanceSettings({ currentProfile, userId }: AppearanceSettingsProps) {
  const [selectedBackground, setSelectedBackground] = useState<string | null>(currentProfile.comment_background_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'gifs'>('images');
  const { t } = useLanguage();

  const isVip = currentProfile.vip_status;

  const handleSelectBackground = (value: string | null) => {
    setSelectedBackground(value);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ comment_background_url: selectedBackground })
        .eq('id', userId);

      if (error) {
        throw error;
      }
      toast.success(t('commentBackgroundUpdated'));
    } catch (error: any) {
      toast.error(`${t('backgroundUpdateFailed')}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const BannerGrid = ({ banners, isVipOnly = true }: { banners: typeof IMAGE_BANNERS, isVipOnly?: boolean }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {banners.map((banner) => {
        const isSelected = selectedBackground === banner.url;
        const isLocked = isVipOnly && !isVip;
        
        return (
          <button
            key={banner.id}
            onClick={() => !isLocked && handleSelectBackground(banner.url)}
            disabled={isLocked}
            className={cn(
              "relative rounded-xl border-2 p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 group",
              isSelected
                ? "border-purple-500 ring-2 ring-purple-500 bg-purple-500/10"
                : isLocked
                ? "border-gray-600 opacity-50 cursor-not-allowed"
                : "border-transparent hover:border-gray-500/50 hover:bg-white/5"
            )}
          >
            {/* Banner preview */}
            <div className="relative h-20 w-full rounded-lg overflow-hidden bg-gray-800 mb-2">
              <div 
                className="w-full h-full bg-cover bg-center transition-transform duration-200 group-hover:scale-105"
                style={{ 
                  backgroundImage: `url(${banner.preview || banner.url || '/placeholder.svg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              
              {/* Lock overlay for VIP-only banners */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <Lock className="h-6 w-6 text-yellow-400 mx-auto mb-1" />
                    <Crown className="h-4 w-4 text-yellow-400 mx-auto" />
                  </div>
                </div>
              )}
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-purple-500/20">
                  <div className="bg-purple-500 rounded-full p-1">
                    <Star className="h-4 w-4 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Banner name */}
            <span className={cn(
              "text-xs font-medium truncate block",
              isSelected ? "text-purple-400" : "text-gray-300"
            )}>
              {banner.name}
            </span>
            
            {/* VIP indicator */}
            {isVipOnly && (
              <div className="absolute -top-1 -right-1">
                <Crown className="h-4 w-4 text-yellow-400" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {t('commentBanners')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('chooseBanner')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'images' | 'gifs')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            {t('imageBanners')}
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">VIP</span>
          </TabsTrigger>
          <TabsTrigger value="gifs" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            {t('gifBanners')}
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">VIP</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span>{t('vipExclusiveImages')}</span>
            {!isVip && (
              <span className="text-yellow-400 text-xs">({t('upgradeToVip')})</span>
            )}
          </div>
          <BannerGrid banners={IMAGE_BANNERS} isVipOnly={true} />
        </TabsContent>

        <TabsContent value="gifs" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span>{t('vipExclusiveGifs')}</span>
            {!isVip && (
              <span className="text-yellow-400 text-xs">({t('upgradeToVip')})</span>
            )}
          </div>
          <BannerGrid banners={GIF_BANNERS} isVipOnly={true} />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          {selectedBackground ? (
            <span>{t('bannerSelected')}</span>
          ) : (
            <span>{t('usingDefaultBackground')}</span>
          )}
        </div>
        <Button 
          onClick={handleSaveChanges} 
          disabled={isSaving || selectedBackground === (currentProfile.comment_background_url || null)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? t('saving') : t('saveChanges')}
        </Button>
      </div>
    </div>
  );
} 