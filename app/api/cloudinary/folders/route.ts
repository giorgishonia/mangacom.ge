import { NextResponse } from 'next/server';
import { getSubfolders as getCloudinarySubfolders } from '@/lib/cloudinary';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentFolder = searchParams.get('parent');

  if (!parentFolder) {
    return NextResponse.json({ error: 'Parent folder query parameter is required' }, { status: 400 });
  }

  try {
    const folders = await getCloudinarySubfolders(parentFolder);
    // The Cloudinary API returns folders with 'name' and 'path'
    // e.g., { folders: [ { name: '01', path: 'series-title/01' }, ... ] }
    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error('API Error fetching Cloudinary subfolders:', error);
    // Send a more generic error message to the client for security
    const errorMessage = error.message || 'Failed to fetch subfolders from Cloudinary';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 