import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client with correct session persistence for browser upload
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})

// The bucket name - must match exactly what's in your Supabase project
const BUCKET_NAME = 'avatars'

interface UploadResult {
  success: boolean
  url?: string
  fileUrl?: string
  error?: string
}

/**
 * Upload a file to Supabase storage
 * @param file The file to upload
 * @param bucket Optional bucket name (defaults to avatars)
 * @param folder Optional folder name within the bucket
 * @returns Object with success status, file URL (if successful), and error message (if failed)
 */
export async function uploadFile(file: File, bucket = BUCKET_NAME, folder?: string): Promise<UploadResult> {
  try {
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Create a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${uuidv4()}.${fileExt}`
    
    // Create path - simple structure for easier management
    const filePath = folder 
      ? `${folder}/${fileName}`
      : fileName
    
    console.log(`Uploading to bucket: ${bucket}, path: ${filePath}`)
    
    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true 
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      fileUrl: urlData.publicUrl // For backward compatibility
    }
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload file'
    }
  }
}

/**
 * Delete a file from Supabase storage
 * @param bucket The bucket name (defaults to avatars)
 * @param filePath The file path or name to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(bucket = BUCKET_NAME, filePath: string): Promise<boolean> {
  try {
    if (!filePath) return false
    
    console.log(`Deleting from bucket: ${bucket}, path: ${filePath}`)
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Storage delete error:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

/**
 * Get the full URL for an avatar image
 * @param path The file path or URL
 * @param bustCache Whether to add a cache-busting parameter
 * @returns The complete URL to the avatar
 */
export function getAvatarUrl(path: string | null, bustCache = true): string {
  if (!path) {
    return '/placeholder.svg' // Default avatar placeholder
  }

  // If it's already a complete URL, return it (possibly with cache busting)
  if (path.startsWith('http')) {
    return bustCache ? addCacheBuster(path) : path
  }

  // If it's a path in the public folder, add the base URL
  if (path.startsWith('/')) {
    return path // No need for cache busting for static assets
  }

  // Otherwise, it's a path in the storage
  const url = supabase.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl
  return bustCache ? addCacheBuster(url) : url
}

/**
 * Add a cache-busting parameter to a URL
 * @param url The URL to add cache busting to
 * @returns URL with cache busting parameter
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_t=${Date.now()}`
} 