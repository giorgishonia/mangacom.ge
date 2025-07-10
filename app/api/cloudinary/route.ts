import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function GET(req: NextRequest) {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Allow unauthenticated access in development mode
  if (!session?.user && !isDevelopment) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the folder from the URL query parameters
    const url = new URL(req.url);
    const folder = url.searchParams.get('folder');

    if (!folder) {
      return NextResponse.json({ error: 'Folder parameter is required' }, { status: 400 });
    }

    console.log('Cloudinary config:', {
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      folder: folder
    });

    // Try with different folder formats
    const folderFormats = [
      folder,
      folder.replace(/ /g, '_'),      // Replace spaces with underscores
      folder.replace(/ /g, '-'),      // Replace spaces with hyphens
      folder.replace(/ /g, '/'),      // Replace spaces with slashes
      folder.replace(/ chapter /i, '/chapter_'),  // Format: series/chapter_1
      `manga/${folder}`,              // Try with manga/ prefix
      folder.toLowerCase(),           // Try lowercase
    ];

    console.log('Trying folder formats:', folderFormats);

    let result;
    let foundImages = false;

    // Try listing all resources instead of searching by folder
    try {
      console.log('Listing all resources to find matching folders...');
      const resourceList = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        prefix: '',  // Empty prefix to get everything
      });
      
      console.log(`Found ${resourceList.resources.length} total resources in Cloudinary`);
      
      // Check if any resources have paths matching our folder
      const matchingResources = resourceList.resources.filter((res: any) => {
        const publicId = res.public_id.toLowerCase();
        return folderFormats.some(format => 
          publicId.includes(format.toLowerCase()));
      });
      
      if (matchingResources.length > 0) {
        console.log(`Found ${matchingResources.length} resources matching folder name`);
        result = { resources: matchingResources };
        foundImages = true;
      } else {
        console.log('No resources matched folder name in direct listing');
      }
    } catch (listError) {
      console.error('Error listing all resources:', listError);
    }

    // If listing didn't work, try each folder format with search
    if (!foundImages) {
      for (const formatToTry of folderFormats) {
        if (foundImages) break;
        
        // Try different search expressions
        const searchExpressions = [
          `folder=${formatToTry}`,
          `public_id:*${formatToTry}*`,
          `public_id:*${formatToTry.replace(/ /g, '_')}*`,
          `public_id:*${formatToTry.replace(/ /g, '/')}*`,
        ];
        
        for (const expression of searchExpressions) {
          try {
            console.log(`Trying search with expression: ${expression}`);
            const searchResult = await cloudinary.search
              .expression(expression)
              .sort_by('filename', 'asc')
              .max_results(100)
              .execute();
            
            if (searchResult.resources.length > 0) {
              console.log(`Found ${searchResult.resources.length} images with expression: ${expression}`);
              result = searchResult;
              foundImages = true;
              break;
            }
          } catch (searchError) {
            console.error(`Error searching with ${expression}:`, searchError);
          }
        }
      }
    }

    // If we still don't have images, try direct resource access by folder
    if (!foundImages) {
      try {
        console.log('Attempting direct folder listing...');
        const folderResources = await cloudinary.api.resources_by_tag(folder);
        if (folderResources.resources && folderResources.resources.length > 0) {
          console.log(`Found ${folderResources.resources.length} resources by tag: ${folder}`);
          result = folderResources;
          foundImages = true;
        }
      } catch (tagError) {
        console.error('Error getting resources by tag:', tagError);
      }
    }

    // List all root folders and subfolders to help debugging
    console.log('Listing all available folders for debugging:');
    try {
      const rootFolders = await cloudinary.api.root_folders();
      console.log('Root folders:', rootFolders.folders.map((f: any) => f.name));
      
      // Try to list all subfolders
      for (const rootFolder of rootFolders.folders) {
        try {
          const subFolders = await cloudinary.api.sub_folders(rootFolder.path);
          console.log(`Subfolders in ${rootFolder.name}:`, 
            subFolders.folders ? subFolders.folders.map((f: any) => f.name) : 'None');
        } catch (e) {
          console.error(`Could not list subfolders for ${rootFolder.name}:`, e);
        }
      }
    } catch (e) {
      console.error('Could not list folders:', e);
    }

    // If we haven't found any images, create an empty result
    if (!result) {
      result = { resources: [] };
    }

    // Transform the results to a more usable format
    const images = result.resources.map((resource: any) => ({
      id: resource.public_id,
      url: resource.secure_url || `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${resource.public_id}`,
      filename: resource.filename || resource.public_id.split('/').pop()
    }));

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Cloudinary API error:', error);
    
    // Provide more detailed error information
    const errorMessage = error?.message || 'Unknown error';
    const errorDetails = error?.error?.message || '';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch images from Cloudinary', 
        message: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
} 