import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/supabase-auth-provider';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdBannerProps {
  placement: string;
  className?: string;
  width?: number;
  height?: number;
}

interface Ad {
  id: number;
  name: string;
  image_url: string;
  target_url: string;
  placement: string;
}

export function AdBanner({
  placement,
  className,
  width = 728,
  height = 90,
}: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const { profile } = useAuth();
  
  // Don't show ads for VIP users
  const isVipUser = !!profile?.vip_status;
  
  // Fetch a random ad for the specified placement
  useEffect(() => {
    if (isVipUser) return;
    
    const fetchRandomAd = async () => {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .eq('placement', placement)
          .eq('active', true)
          .limit(10);
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          // Get a random ad from the returned set
          const randomAd = data[Math.floor(Math.random() * data.length)];
          setAd(randomAd);
          
          // Track impression
          await supabase.rpc('increment_ad_impression', { ad_id: randomAd.id });
        }
      } catch (error) {
        console.error('Error fetching ad:', error);
      }
    };
    
    fetchRandomAd();
  }, [placement, isVipUser]);
  
  // Track click
  const handleAdClick = async () => {
    if (!ad) return;
    
    try {
      await supabase.rpc('increment_ad_click', { ad_id: ad.id });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };
  
  // If user is VIP or no ad available or ad closed, return null
  if (isVipUser || !ad || !isVisible) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded border border-white/10 bg-black/30',
        className
      )}
      style={{ width, height }}
      data-ad-placement={placement}
    >
      <Link 
        href={ad.target_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleAdClick}
        className="block w-full h-full"
      >
        <Image
          src={ad.image_url}
          alt={ad.name}
          fill
          className="object-cover"
        />
      </Link>
      
      {/* Ad indicator and close button */}
      <div className="absolute top-1 right-1 flex items-center space-x-1">
        <span className="text-xs bg-black/70 px-1 rounded text-white/70">
          Ad
        </span>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="bg-black/70 rounded-full p-0.5 text-white/70 hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
} 