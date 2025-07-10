import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { X, Upload as UploadIcon, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface BannerUploaderProps {
  userId: string;
  currentBannerUrl?: string | null;
  onBannerUpdate: (url: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BannerUploader({
  userId,
  currentBannerUrl,
  onBannerUpdate,
  isOpen,
  onClose,
}: BannerUploaderProps) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(currentBannerUrl ?? null);
  const [tempBannerUrl, setTempBannerUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle successful upload
  const handleUploadSuccess = (result: any) => {
    const url = result.info.secure_url;
    setTempBannerUrl(url);
  };

  // Save the banner to the user's profile
  const saveBanner = async () => {
    if (!tempBannerUrl) return;
    
    setIsSubmitting(true);
    
    try {
      // Check if user has a banner already
      const { data: existingBanner } = await supabase
        .from('user_banners')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
      
      let result;
      
      if (existingBanner) {
        // Update existing banner
        result = await supabase
          .from('user_banners')
          .update({ 
            banner_url: tempBannerUrl, 
            uploaded_at: new Date().toISOString() 
          })
          .eq('user_id', userId);
      } else {
        // Insert new banner
        result = await supabase
          .from('user_banners')
          .insert({ 
            user_id: userId, 
            banner_url: tempBannerUrl, 
            banner_type: 'static' 
          });
      }
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      // Update the state and call the parent callback
      setBannerUrl(tempBannerUrl);
      onBannerUpdate(tempBannerUrl);
      toast.success("Profile banner updated successfully");
      onClose();
      
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Failed to update profile banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Profile Banner</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview area */}
          <div className="relative w-full h-[150px] bg-gray-900 rounded-md overflow-hidden">
            {(tempBannerUrl || bannerUrl) ? (
              <div className="relative w-full h-full">
                <Image
                  src={tempBannerUrl || bannerUrl || ''}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setTempBannerUrl(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Upload a banner image</p>
              </div>
            )}
          </div>
          
          {/* Upload widget */}
          <CldUploadWidget
            uploadPreset="banner_uploads"
            options={{
              maxFiles: 1,
              resourceType: "image",
              folder: "profile_banners",
            }}
            onSuccess={handleUploadSuccess}
          >
            {({ open }) => (
              <Button
                type="button"
                variant="outline"
                onClick={() => open()}
                disabled={isSubmitting}
                className="w-full"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {tempBannerUrl ? "Change Image" : "Upload Image"}
              </Button>
            )}
          </CldUploadWidget>
          
          <div className="text-xs text-gray-400">
            <p>Recommended size: 1200 x 400 pixels</p>
            <p>Max file size: 5MB</p>
            <p>Supported formats: JPEG, PNG, WebP</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={saveBanner}
            disabled={!tempBannerUrl || isSubmitting}
            className="ml-2"
          >
            <Check className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Banner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 