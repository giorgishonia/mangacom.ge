"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CloudinaryFolderSelector, CloudinaryFolder } from './cloudinary-folder-selector';

interface GeneratedChapter {
  number: number;
  title: string;
  pages: string[]; // Array of image URLs
  contentId: string;
  releaseDate: string;
}

interface CloudinaryResource {
  public_id: string;
  format: string;
  secure_url: string; // Primarily interested in this
  url: string;
  folder?: string;
  filename?: string;
}

type MultipleChapterFormProps = {
  contentId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function MultipleChapterForm({
  contentId,
  onSuccess,
  onCancel,
}: MultipleChapterFormProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const [selectedCloudinaryFolders, setSelectedCloudinaryFolders] = useState<CloudinaryFolder[]>([]);
  const [startChapterNumber, setStartChapterNumber] = useState<number>(1);
  const [baseChapterTitle, setBaseChapterTitle] = useState<string>("თავი: %N");

  const [generatedChapters, setGeneratedChapters] = useState<GeneratedChapter[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleGeneratePreview = async () => {
    if (selectedCloudinaryFolders.length === 0) {
      toast.error("Please select one or more chapter folders first.");
      return;
    }
    setIsPreviewLoading(true);
    setShowPreview(false); 
    setGeneratedChapters([]);

    const chapters: GeneratedChapter[] = [];
    let lastChapterNumberSuccessfullyFetched = startChapterNumber -1;

    try {
      for (const [index, folder] of selectedCloudinaryFolders.entries()) {
        toast.info(`Fetching images for folder: ${folder.name}...`);
        const imageResponse = await fetch(`/api/cloudinary?folder=${encodeURIComponent(folder.path)}`);
        
        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          toast.error(`Failed to fetch images for folder '${folder.name}'. ${errorData.error || 'Skipping.'}`);
          continue; 
        }
        
        const imageData: { images: CloudinaryResource[] } = await imageResponse.json();
        const imageUrls: string[] = (imageData.images || []).map(img => img.secure_url || img.url).filter(Boolean);

        if (imageUrls.length === 0) {
          toast.warn(`No images found in folder '${folder.name}'. Skipping this chapter.`);
          continue;
        }
        
        lastChapterNumberSuccessfullyFetched++;
        const currentChapterNumber = lastChapterNumberSuccessfullyFetched;

        let title = baseChapterTitle;
        title = title.replace(/%F/g, folder.name); 
        title = title.replace(/%N/g, String(currentChapterNumber)); 

        chapters.push({
          number: currentChapterNumber,
          title: title,
          pages: imageUrls,
          contentId: contentId,
          releaseDate: new Date().toISOString(),
        } as any);
        toast.success(`Preview generated for ${folder.name} as Chapter ${currentChapterNumber}.`);
      }

      setGeneratedChapters(chapters);
      setShowPreview(true);
      if (chapters.length === 0) {
        toast.info("No chapters could be generated. Check selected folders and their contents.");
      } else {
        toast.success(`${chapters.length} chapter(s) ready for preview.`);
      }
    } catch (error) {
      console.error("Error generating chapter previews:", error);
      toast.error("An error occurred while generating chapter previews. Check console for details.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  async function onSubmit() {
    if (generatedChapters.length === 0) {
      toast.error("No chapters to submit. Please generate a preview first.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/chapters/bulk", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatedChapters),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create chapters in bulk");
      }

      toast.success(`Successfully created ${generatedChapters.length} chapter(s)!`);
      onSuccess();
    } catch (error) {
      console.error("Error creating chapters in bulk:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create chapters");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-1">
      <div>
        <h3 className="text-lg font-medium mb-2">1. Select Chapter Folders from Cloudinary</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Specify the parent Cloudinary folder for your series (e.g., 'manga-title'). Then, select the subfolders that represent individual chapters.
        </p>
        <CloudinaryFolderSelector
            onFoldersSelected={setSelectedCloudinaryFolders}
            buttonText="List Chapter Subfolders"
        />
        {selectedCloudinaryFolders.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2 font-medium">{selectedCloudinaryFolders.length} folder(s) selected for import.</p>
        )}
      </div>

      {selectedCloudinaryFolders.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-lg font-medium mb-2">2. Configure Chapter Details</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set the starting chapter number and a title template for the selected folders.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startChapterNumber">Starting Chapter Number</Label>
                <Input
                  id="startChapterNumber"
                  type="number"
                  value={startChapterNumber}
                  onChange={(e) => setStartChapterNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  disabled={isPreviewLoading}
                />
                 <p className="text-xs text-muted-foreground mt-1">Number for the first selected folder. Others follow sequentially.</p>
              </div>
              <div>
                <Label htmlFor="baseChapterTitle">Chapter Title Template</Label>
                <Input
                  id="baseChapterTitle"
                  value={baseChapterTitle}
                  onChange={(e) => setBaseChapterTitle(e.target.value)}
                  placeholder="e.g., Chapter %N: %F"
                  disabled={isPreviewLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">Use %N for chapter number, %F for folder name.</p>
              </div>
            </div>
            <Button onClick={handleGeneratePreview} className="mt-4" variant="outline" disabled={isPreviewLoading || isLoading}>
              {isPreviewLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Preview...</>
              ) : (
                "Generate Chapter Preview"
              )}
            </Button>
          </div>
        </>
      )}

      {showPreview && generatedChapters.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-lg font-medium mb-2">3. Preview Chapters ({generatedChapters.length} Total)</h3>
             <p className="text-sm text-muted-foreground mb-4">
              Review the chapters that will be created. Ensure titles, numbers, and page counts are correct.
            </p>
            <ScrollArea className="h-64 border rounded-md p-4 bg-muted/20">
              <div className="space-y-3">
                {generatedChapters.map((chapter, index) => (
                  <div key={index} className="p-3 border rounded-md bg-background shadow-sm">
                    <p className="font-semibold text-primary">{chapter.title} (Ch. {chapter.number})</p>
                    <p className="text-sm text-muted-foreground">{chapter.pages.length} pages</p>
                    {chapter.pages.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate" title={chapter.pages[0]}>
                            First page: ...{chapter.pages[0].substring(chapter.pages[0].lastIndexOf('/') + 1)}
                        </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
      {showPreview && generatedChapters.length === 0 && !isPreviewLoading && (
        <>
            <Separator />
            <p className="text-center text-muted-foreground py-4">No chapters were generated based on current selections and folder contents.</p>
        </>
      )}

      {(showPreview || selectedCloudinaryFolders.length > 0) && <Separator className="my-6"/>}

      <div className="flex justify-end space-x-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isLoading || isPreviewLoading) return;
            onCancel();
          }}
          disabled={isLoading || isPreviewLoading}
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={onSubmit} 
          disabled={isLoading || isPreviewLoading || generatedChapters.length === 0 || !showPreview}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Chapters...
            </>
          ) : (
            `Create ${generatedChapters.length} Chapter${generatedChapters.length === 1 ? "" : "s"}`
          )}
        </Button>
      </div>
    </div>
  );
} 