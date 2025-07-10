import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, FolderOpen } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface CloudinaryImage {
  id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  filename: string;
}

interface CloudinaryImageSelectorProps {
  onImagesSelected: (images: string[]) => void;
  buttonText?: string;
  multiple?: boolean;
}

export function CloudinaryImageSelector({
  onImagesSelected,
  buttonText = 'Select Images from Cloudinary',
  multiple = true
}: CloudinaryImageSelectorProps) {
  const [folderName, setFolderName] = useState('');
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch images from Cloudinary when folder name is provided
  const fetchImages = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/cloudinary?folder=${encodeURIComponent(folderName)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch images');
      }
      
      const data = await response.json();
      setImages(data.images || []);
      
      if (data.images.length === 0) {
        toast.info('No images found in this folder');
      }
    } catch (error) {
      console.error('Error fetching Cloudinary images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch images');
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const toggleImageSelection = (imageUrl: string) => {
    if (!multiple) {
      setSelectedImages([imageUrl]);
      onImagesSelected([imageUrl]);
      return;
    }

    setSelectedImages(prev => {
      const isSelected = prev.includes(imageUrl);
      const newSelection = isSelected
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl];
      
      onImagesSelected(newSelection);
      return newSelection;
    });
  };

  // Filter images based on search query
  const filteredImages = searchQuery
    ? images.filter(img => 
        img.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : images;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter Cloudinary folder name"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchImages()}
        />
        <Button 
          onClick={fetchImages} 
          disabled={loading}
          type="button"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FolderOpen className="h-4 w-4 mr-2" />
          )}
          {buttonText}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search images by filename"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div 
                key={image.id}
                className={`relative aspect-[3/4] overflow-hidden rounded-md border cursor-pointer transition-all ${
                  selectedImages.includes(image.url) 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleImageSelection(image.url)}
              >
                <Image
                  src={image.url}
                  alt={image.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs px-2 py-1 bg-black/50 rounded-md truncate max-w-[90%]">
                    {image.filename}
                  </span>
                </div>
                {selectedImages.includes(image.url) && (
                  <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full"></div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {selectedImages.length} of {filteredImages.length} images selected
          </div>
        </div>
      )}
    </div>
  );
} 