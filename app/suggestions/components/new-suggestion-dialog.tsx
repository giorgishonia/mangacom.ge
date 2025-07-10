"use client";

import { useState } from "react";
import { useAuth } from "@/components/supabase-auth-provider";
import { addSuggestion, SuggestionType } from "@/lib/feedback";
import { getSupabaseAvatarUrl } from "@/lib/comments";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface NewSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuggestionAdded: (suggestion: any) => void;
}

export default function NewSuggestionDialog({
  open,
  onOpenChange,
  onSuggestionAdded,
}: NewSuggestionDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SuggestionType | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("მოთხოვნის გასაგზავნად უნდა იყოთ ავტორიზებული");
      return;
    }

    if (!title.trim() || !description.trim() || !type) {
      toast.error("გთხოვთ, შეავსოთ ყველა სავალდებულო ველი");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const result = await addSuggestion({
        title,
        description,
        type: type as SuggestionType,
        userId: user.id,
      });

      if (result.success && result.id) {
        const newSuggestionObj = {
          id: result.id,
          title,
          description,
          type: type as SuggestionType,
          created_at: new Date().toISOString(),
          image_url: undefined,
          vote_count: 0,
          has_voted: false,
          user: {
            id: user.id,
            name: user.user_metadata?.username || user.email?.split("@")[0] || "User",
            username: user.user_metadata?.username || user.email?.split("@")[0] || "User",
            image: getSupabaseAvatarUrl(user.id, user.user_metadata?.avatar_url || null)
          }
        };

        onSuggestionAdded(newSuggestionObj);
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding suggestion:", error);
      toast.error("მოთხოვნის დამატება ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ახალი მოთხოვნა</DialogTitle>
          <DialogDescription>
            გაგვიზიარეთ იდეები, შეგვატყობინეთ შეცდომების შესახებ, ან შემოგვთავაზეთ გაუმჯობესებები.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">სათაური</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="შეიყვანეთ მკაფიო, ლაკონური სათაური"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">ტიპი</Label>
              <Select value={type} onValueChange={(value) => setType(value as SuggestionType)} required>
                <SelectTrigger>
                  <SelectValue placeholder="აირჩიეთ ტიპი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anime">ანიმეს მოთხოვნა</SelectItem>
                  <SelectItem value="manga">მანგას მოთხოვნა</SelectItem>
                  <SelectItem value="sticker">სტიკერის მოთხოვნა</SelectItem>
                  <SelectItem value="feature">ფუნქციის მოთხოვნა</SelectItem>
                  <SelectItem value="bug">შეცდომის რეპორტი</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">აღწერა</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="მოგვაწოდეთ დეტალები თქვენი მოთხოვნის შესახებ"
                className="min-h-[120px]"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              გაუქმება
            </Button>
            <Button type="submit" disabled={isSubmitting || !user}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  იგზავნება...
                </>
              ) : (
                "გაგზავნა"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 