"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { FileUpload } from '@/components/ui/file-upload'
import { uploadFile, deleteFile, getAvatarUrl } from '@/lib/upload'
import { useAuth } from '@/components/supabase-auth-provider'
import { updateUserProfile } from '@/lib/users'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarChange?: (url: string | null) => void
  className?: string
}

export function AvatarUpload({ 
  currentAvatarUrl,
  onAvatarChange,
  className 
}: AvatarUploadProps) {
  const { user, profile, refreshUserProfile: refreshUser } = useAuth()
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload an avatar')
      return
    }

    setIsUploading(true)
    try {
      // If there's an existing avatar, delete it first
      if (currentAvatarUrl && currentAvatarUrl.includes('supabase.co')) {
        const filename = currentAvatarUrl.split('/').pop()
        if (filename) {
          await deleteFile('avatars', filename)
        }
      }

      // Upload the new avatar
      const { success, fileUrl, error } = await uploadFile(file, 'avatars')
      
      if (!success || !fileUrl) {
        throw new Error(error || 'Failed to upload avatar')
      }

      // Update the user profile with the new avatar URL
      await updateUserProfile(user.id, { avatar_url: fileUrl })
      
      // Call the callback if provided
      if (onAvatarChange) {
        onAvatarChange(fileUrl)
      }

      // Refresh the user data
      await refreshUser()
      
      toast.success('Avatar updated successfully')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <FileUpload
      previewUrl={currentAvatarUrl || undefined}
      previewAlt={profile?.username || user?.email || 'User avatar'}
      onFileUpload={handleFileSelect}
      allowedTypes={["image/png", "image/jpeg", "image/webp"]}
      maxSizeMB={1}
      buttonText={isUploading ? 'Uploading...' : 'Change Photo'}
      className={className}
      isLoading={isUploading}
      showPreview={true}
    />
  )
} 