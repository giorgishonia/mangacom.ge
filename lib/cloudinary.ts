import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryResource {
  public_id: string;
  format: string;
  version: number;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  url: string;
  secure_url: string;
  folder: string;
  filename: string;
}

/**
 * Fetches all images from a specified Cloudinary folder
 */
export async function getImagesFromFolder(folderName: string): Promise<CloudinaryResource[]> {
  try {
    // Fetch resources from the specified folder (max 500 resources)
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderName,
      max_results: 500,
      resource_type: 'image',
    });

    // Add filename to each resource
    const resources = result.resources.map((resource: any) => {
      const publicId = resource.public_id;
      // Extract the filename without the folder part
      const filename = publicId.includes('/') 
        ? publicId.split('/').pop() 
        : publicId;
      
      return {
        ...resource,
        filename
      };
    });

    return resources;
  } catch (error) {
    console.error('Error fetching Cloudinary resources:', error);
    throw error;
  }
}

/**
 * Sorts images by filename in natural order (1, 2, 10 instead of 1, 10, 2)
 */
export function sortImagesByFilename(images: CloudinaryResource[]): CloudinaryResource[] {
  return [...images].sort((a, b) => {
    // Natural sorting for filenames with numbers
    return a.filename.localeCompare(b.filename, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });
}

/**
 * Uploads an image to Cloudinary
 */
export async function uploadImageToCloudinary(
  file: File,
  folder?: string
): Promise<CloudinaryResource | null> {
  // This function is for client-side uploads
  // For security reasons, direct uploads from client to Cloudinary should use unsigned uploads
  // or generate a signature on the server
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
}

/**
 * Fetches all subfolders from a specified Cloudinary folder path.
 */
export async function getSubfolders(parentFolderPath: string): Promise<{name: string; path: string}[]> {
  try {
    // Ensure empty string or root isn't passed if your logic expects a specific folder
    if (!parentFolderPath) {
      // Decide handling: throw error, return empty, or default to root subfolders
      // For now, let's assume a specific parent folder is intended.
      // If you want to list root folders, parentFolderPath would be an empty string or null
      // depending on how Cloudinary API handles it for `cloudinary.api.subfolders()`
      // For this use case, a parent folder is expected.
      // console.warn("getSubfolders called with empty parentFolderPath. This might not be intended.");
      // return []; // Or handle as an error
    }

    const result = await cloudinary.api.sub_folders(parentFolderPath, { max_results: 500 });
    // The Cloudinary API returns folders with 'name' and 'path' properties.
    return result.folders.map((folder: { name: string; path: string }) => ({
      name: folder.name,
      path: folder.path,
    }));
  } catch (error) {
    console.error(`Error fetching Cloudinary subfolders for '${parentFolderPath}':`, error);
    // It's good practice to throw the error or a custom error to be handled by the caller
    throw new Error(`Failed to fetch subfolders from Cloudinary for folder: ${parentFolderPath}`);
  }
}

export default cloudinary; 