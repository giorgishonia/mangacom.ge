'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase'; // Corrected import path
import { updateUserProfile } from '@/lib/users';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AvatarUploaderProps {
  userId: string;
  currentAvatarUrl: string | null;
  onAvatarUpdate: (newUrl: string) => void;
  usernameInitial: string;
}

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 2;

export function AvatarUploader({ userId, currentAvatarUrl, onAvatarUpdate, usernameInitial }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl); // Sync preview if prop changes
  }, [currentAvatarUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`Invalid file type. Please use PNG, JPG, WEBP or GIF.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    const tempPreview = URL.createObjectURL(file);
    setPreviewUrl(tempPreview);

    setUploading(true);
    try {
      // Create a unique file name to prevent caching issues and overwrites if desired
      // Alternatively, use a fixed name like 'avatar.png' and rely on cache-busting query params
      const fileName = `avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Your bucket name
        .upload(filePath, file, { 
            cacheControl: '3600', // Optional: cache control
            upsert: true // Set to true to overwrite if file with same path exists
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not get public URL for avatar.');
      }
      const newAvatarUrl = urlData.publicUrl;

      // Update profile in the database
      const { success, error: dbError } = await updateUserProfile(userId, { avatar_url: newAvatarUrl });

      if (!success || dbError) {
        // If DB update fails, try to delete the just uploaded file to avoid orphaned files
        await supabase.storage.from('avatars').remove([filePath]);
        throw dbError || new Error('Failed to update profile with new avatar.');
      }

      toast.success('Avatar updated successfully!');
      onAvatarUpdate(newAvatarUrl); // Notify parent component

    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      toast.error(error.message || 'Failed to upload avatar.');
      setPreviewUrl(currentAvatarUrl); // Revert preview on error
    } finally {
      if (tempPreview && tempPreview.startsWith('blob:')) {
        URL.revokeObjectURL(tempPreview);
      }
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <Avatar className="h-24 w-24 ring-2 ring-purple-500/30 text-4xl shadow-md">
        <AvatarImage src={previewUrl || undefined} alt="Avatar preview" />
        <AvatarFallback className="bg-gray-800">
          {usernameInitial}
        </AvatarFallback>
      </Avatar>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={ALLOWED_FILE_TYPES.join(',')}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="bg-black/30 border-white/20 hover:bg-black/50 min-w-[120px]"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4 mr-2" />
        )}
        {uploading ? 'Uploading...' : 'Choose Image'}
      </Button>
       <p className="text-xs text-gray-500">Max {MAX_FILE_SIZE_MB}MB. PNG, JPG, WEBP, GIF.</p>
    </div>
  );
} 