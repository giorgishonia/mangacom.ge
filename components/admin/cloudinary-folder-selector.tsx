'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, FolderOpen, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

export interface CloudinaryFolder {
  name: string;
  path: string;
}

interface CloudinaryFolderSelectorProps {
  onFoldersSelected: (folders: CloudinaryFolder[]) => void;
  buttonText?: string;
}

export function CloudinaryFolderSelector({
  onFoldersSelected,
  buttonText = 'List Chapter Folders',
}: CloudinaryFolderSelectorProps): JSX.Element {
  const [parentFolderName, setParentFolderName] = useState('');
  const [subfolders, setSubfolders] = useState<CloudinaryFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<CloudinaryFolder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubfolders = async () => {
    if (!parentFolderName.trim()) {
      toast.error('Please enter a parent folder name (e.g., content-title).');
      return;
    }
    setLoading(true);
    setSelectedFolders([]); 
    onFoldersSelected([]); 
    setSubfolders([]); // Clear previous results
    try {
      const response = await fetch(`/api/cloudinary/folders?parent=${encodeURIComponent(parentFolderName)}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch subfolders');
      }
      const data = await response.json(); 
      const fetchedFolders = data.folders || [];
      setSubfolders(fetchedFolders);
      if (fetchedFolders.length === 0) {
        toast.info('No subfolders found in this parent folder. Check the folder name and structure.');
      } else {
        toast.success(`Found ${fetchedFolders.length} subfolder(s).`);
      }
    } catch (error) {
      console.error('Error fetching Cloudinary subfolders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch subfolders');
      setSubfolders([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolderSelection = (folder: CloudinaryFolder) => {
    setSelectedFolders(prev => {
      const isSelected = prev.some(sf => sf.path === folder.path);
      const newSelection = isSelected
        ? prev.filter(sf => sf.path !== folder.path)
        : [...prev, folder];
      return newSelection;
    });
  };

  // Notify parent whenever selection changes
  useEffect(() => {
    onFoldersSelected(selectedFolders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolders]);

  return (
    <div className="space-y-4 rounded-md border p-4 bg-muted/30">
      <div>
        <Label htmlFor="parentFolderNameInput" className="mb-1 block text-sm font-medium">Cloudinary Parent Folder</Label>
        <div className="flex items-center gap-2">
          <Input
            id="parentFolderNameInput"
            placeholder="e.g., berserk, onepiece"            
            value={parentFolderName}
            onChange={(e) => setParentFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSubfolders()}
          />
          <Button 
            onClick={fetchSubfolders} 
            disabled={loading}
            type="button"
            variant="secondary"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderOpen className="h-4 w-4 mr-2" />}
            {buttonText}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">This is the main folder in Cloudinary containing your chapter subfolders (e.g., 'manga-title').</p>
      </div>

      {subfolders.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Chapter Folders to Import:</Label>
          <ScrollArea className="h-48 border rounded-md p-2 bg-background">
            {subfolders.map((folder) => {
              const isSelected = selectedFolders.some(sf => sf.path === folder.path);
              return (
                <div
                  key={folder.path}
                  onClick={() => toggleFolderSelection(folder)}
                  className={`flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors 
                              ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                >
                  {isSelected ? <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <div className="truncate">
                    <span className="font-medium text-sm">{folder.name}</span>
                    <p className="text-xs text-muted-foreground truncate">Path: {folder.path}</p>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
          <p className="text-sm text-muted-foreground">{selectedFolders.length} of {subfolders.length} folder(s) selected.</p>
        </div>
      )}
      {loading && subfolders.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-4">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2"/> Searching for subfolders...
        </div> 
      )}
    </div>
  );
} 