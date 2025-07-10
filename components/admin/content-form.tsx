import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Upload } from 'lucide-react';

interface ContentFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    thumbnail: string;
    logo?: string;
    type: ContentType;
    status: string;
    releaseYear: number;
    genres: string[];
    bannerImage: string;
    publisher?: string;
    chapters_count: number;
  };
}

const ContentForm: React.FC<ContentFormProps> = ({ initialData }) => {
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    thumbnail: initialData?.thumbnail || "",
    logo: initialData?.logo || "",
    type: initialData?.type || ContentType.Movie,
    status: initialData?.status || "",
    releaseYear: initialData?.releaseYear || 2024,
    genres: initialData?.genres || [],
    bannerImage: initialData?.bannerImage || "",
    publisher: initialData?.publisher || "",
    chapters_count: initialData?.chapters_count || 0,
  });

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo || null);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (thumbnailFile) {
      const uploadResult = await uploadFile(thumbnailFile, 'thumbnails');
      if (uploadResult.success && uploadResult.url) {
        formData.thumbnail = uploadResult.url;
      } else {
        setError(uploadResult.error || "Failed to upload thumbnail.");
        setLoading(false);
        return;
      }
    }

    if (logoFile) {
      const uploadResult = await uploadFile(logoFile, 'logos');
      if (uploadResult.success && uploadResult.url) {
        formData.logo = uploadResult.url;
      } else {
        setError(uploadResult.error || 'Failed to upload logo.');
        setLoading(false);
        return;
      }
    }

    // ... rest of the form submission logic ...
  };

  return (
    <div>
      {/* ... existing form elements ... */}

      {/* ... new logo upload section ... */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-300">
          ლოგო (PNG/SVG)
        </label>
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700 cursor-pointer">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-full h-32 object-contain rounded-lg bg-black"
              />
              <button
                type="button"
                onClick={() => {
                  setLogoPreview(null);
                  setLogoFile(null);
                }}
                className="absolute top-2 right-2 p-1 bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4 text-gray-300" />
              </button>
            </div>
          ) : (
            <label htmlFor="logoUpload" className="flex flex-col items-center cursor-pointer">
              <Upload className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400 mb-1">ლოგოს ატვირთვა</p>
              <p className="text-xs text-gray-500">PNG, SVG (მაქს. 1MB)</p>
              <input
                id="logoUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
          )}
        </div>
      </div>

      {/* ... rest of the existing form elements ... */}
    </div>
  );
};

export default ContentForm; 