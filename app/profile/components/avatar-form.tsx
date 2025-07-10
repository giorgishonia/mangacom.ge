'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/ui/file-upload'
import { uploadFile, deleteFile } from '@/lib/upload'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function AvatarForm({ currentAvatarUrl }: { currentAvatarUrl?: string }) {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const userId = session?.user?.id

  const handleSubmit = async (file: File | null) => {
    if (!file || !userId) return
    
    setIsLoading(true)
    
    try {
      // 1. If there's an existing avatar, delete it first
      if (currentAvatarUrl) {
        const avatarPath = currentAvatarUrl.split('/').pop()
        if (avatarPath) {
          await deleteFile(`profiles/${avatarPath}`, 'avatars')
        }
      }

      // 2. Upload the new avatar
      const { success, url, error } = await uploadFile(file, 'avatars', 'profiles')
      
      if (!success || !url) {
        throw new Error(error || 'Failed to upload avatar')
      }

      // 3. Update the user profile in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', userId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // 4. Update the session
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          image: url
        }
      })

      toast.success('Avatar updated successfully')
      router.refresh()
    } catch (error) {
      console.error('Error updating avatar:', error)
      toast.error('Failed to update avatar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">პროფილის ავატარი</h3>
          <p className="text-sm text-muted-foreground">
            ატვირთეთ პროფილის სურათი თქვენი ანგარიშის პერსონალიზაციისთვის.
          </p>
          
          <FileUpload
            previewUrl={currentAvatarUrl}
            onFileUpload={handleSubmit}
            maxSizeMB={2}
            allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
            buttonText={isLoading ? 'იტვირთება...' : 'ავატარის განახლება'}
            className="mt-4"
            showPreview={true}
            isLoading={isLoading}
          />
          
          {isLoading && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 