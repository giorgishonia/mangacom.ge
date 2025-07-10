"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { toast } from "sonner"
import { ImageSkeleton } from "@/components/image-skeleton"
import { deleteFile, uploadFile } from "@/lib/upload"
import { createClient } from "@supabase/supabase-js"

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

interface AvatarUploaderProps {
  currentAvatarUrl: string | null
  userId: string
  onAvatarUpdate: (newUrl: string) => void
}

export function AvatarUploader({ currentAvatarUrl, userId, onAvatarUpdate }: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Generate a cache-busting URL to avoid browser caching
  const getCacheBustedUrl = (url: string | null) => {
    if (!url) return null;
    // Add a timestamp parameter to prevent caching
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPEG, PNG, GIF, or WebP files.")
      return
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
      return
    }
    
    // Create a temporary preview URL for immediate feedback
    const tempPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(tempPreviewUrl);
    
    setIsUploading(true)
    try {
      // Try to delete the old avatar if it exists in our storage
      if (currentAvatarUrl && currentAvatarUrl.includes('storage/v1/object')) {
        try {
          // Extract just the filename from the URL
          const urlParts = currentAvatarUrl.split('/')
          const filename = urlParts[urlParts.length - 1]
          
          if (filename) {
            // Delete from the avatars bucket with proper path matching the policy
            // Format: private/user_{userId}/{filename}
            const filePath = `private/user_${userId}/${filename}`
            await deleteFile('avatars', filePath)
            console.log('Deleted old avatar:', filePath)
          }
        } catch (error) {
          console.log("Error deleting old avatar (continuing anyway):", error)
          // Continue with upload even if delete fails
        }
      }
      
      // Create a path that matches the policy structure:
      // First level must be 'private' according to your policy definition
      // Second level is user-specific folder for organization
      const folderPath = `private/user_${userId}`
      
      // Upload the new avatar - using the avatars bucket and the policy-compliant folder structure
      console.log('Uploading new avatar to path:', folderPath)
      const result = await uploadFile(file, 'avatars', folderPath)
      
      if (result.success && result.url) {
        console.log('Upload successful, URL:', result.url)
        
        // Add a cache-busting parameter to the URL
        const cacheBustedUrl = getCacheBustedUrl(result.url);
        setPreviewUrl(cacheBustedUrl);
        
        try {
          // Try to update the user metadata directly to ensure it's consistent
          // This helps override OAuth provider avatars like Discord
          console.log('Also updating user metadata with new avatar URL');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          // First get current user data to preserve other metadata
          const { data: userData } = await supabase.auth.getUser();
          
          const { error: metadataError } = await supabase.auth.updateUser({
            data: { 
              avatar_url: result.url,
              // Store OAuth provided avatar as a backup
              oauth_avatar_url: userData?.user?.user_metadata?.avatar_url
            }
          });
          
          if (metadataError) {
            console.warn('Could not update user metadata with new avatar:', metadataError);
            // Continue anyway as we'll still update the profile table
          } else {
            console.log('Successfully updated user metadata with new avatar');
          }
        } catch (metadataError) {
          console.warn('Error updating user metadata:', metadataError);
          // Continue with profile update
        }
        
        // Pass the original URL (without cache busting) to the parent component
        onAvatarUpdate(result.url)
        toast.success("Avatar updated successfully!")
      } else {
        console.error('Upload failed:', result.error)
        // Revert to previous avatar on failure
        setPreviewUrl(currentAvatarUrl);
        throw new Error(result.error || "Failed to upload avatar")
      }
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      // Revert to previous avatar on error
      setPreviewUrl(currentAvatarUrl);
      toast.error("Failed to update avatar: " + (error.message || "Unknown error"))
    } finally {
      setIsUploading(false)
      // Clean up the temporary object URL
      if (tempPreviewUrl && tempPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(tempPreviewUrl);
      }
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  return (
    <div className="relative">
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700">
        <ImageSkeleton
          src={previewUrl || "/placeholder.svg"}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={ALLOWED_FILE_TYPES.join(',')}
        className="hidden"
      />
      
      <Button 
        size="sm"
        variant="outline"
        className="absolute bottom-0 right-0 h-8 w-8 p-0 rounded-full bg-gray-800 border-gray-700"
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="h-3.5 w-3.5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
        ) : (
          <Edit className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
} 