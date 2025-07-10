'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/users'; // Assuming UserProfile is exported from here
import { supabase } from '@/lib/supabase'; // For direct Supabase updates

interface AppearanceSettingsProps {
  currentProfile: UserProfile;
  userId: string;
}

const availableBackgrounds = [
  { name: 'Default', value: null, preview: '/images/comment-banners/default-preview.png' }, // Or a color block
  { name: 'Fire', value: '/images/comment-banners/fire-comment.png', preview: '/images/comment-banners/fire-comment.png' },
  { name: 'Ocean', value: '/images/comment-banners/ocean.png', preview: '/images/comment-backgrounds/ocean-preview.png' },
  // Add more predefined backgrounds here
];

export function AppearanceSettings({ currentProfile, userId }: AppearanceSettingsProps) {
  const [selectedBackground, setSelectedBackground] = useState<string | null>(currentProfile.comment_background_url || null);
  const [isSaving, setIsSaving] = useState(false);

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
      toast.success('Comment background updated!');
      // Optionally, trigger a profile refresh in the auth context if not automatic
    } catch (error: any) {
      toast.error(`Failed to update background: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Comment Background</h3>
        <p className="text-sm text-muted-foreground">
          Choose a background for your comment sections across the site.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {availableBackgrounds.map((bg) => (
          <button
            key={bg.name}
            onClick={() => handleSelectBackground(bg.value)}
            className={`rounded-lg border-2 p-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 
                        ${
                          selectedBackground === bg.value
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-transparent hover:border-muted-foreground/50'
                        }`}
          >
            {/* You'll need to create these preview images or use colored divs */}
            <div 
              className="h-24 w-full rounded bg-muted bg-cover bg-center mb-2"
              style={{ backgroundImage: `url(${bg.preview || bg.value || '/images/comment-backgrounds/transparent.png'})` }}
            ></div>
            <span className="text-sm font-medium">{bg.name}</span>
          </button>
        ))}
      </div>

      <Button onClick={handleSaveChanges} disabled={isSaving || selectedBackground === (currentProfile.comment_background_url || null)}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
} 