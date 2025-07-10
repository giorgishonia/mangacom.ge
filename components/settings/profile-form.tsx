"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Controller } from 'react-hook-form';
import { updateUserProfile } from '@/lib/users'; // Import the actual update function
import { AvatarUploader } from './avatar-uploader'; // Import the new component

// Define Zod schema for validation
const profileSchema = z.object({
  first_name: z.string().max(50, "სახელი უნდა იყოს მაქსიმუმ 50 სიმბოლო").optional().nullable(),
  last_name: z.string().max(50, "გვარი უნდა იყოს მაქსიმუმ 50 სიმბოლო").optional().nullable(),
  username: z.string().min(3, "მომხმარებლის სახელი უნდა იყოს მინიმუმ 3 სიმბოლო").max(50, "მომხმარებლის სახელი უნდა იყოს მაქსიმუმ 50 სიმბოლო"),
  bio: z.string().max(300, "ბიო უნდა იყოს მაქსიმუმ 300 სიმბოლო").optional().nullable(),
  is_public: z.boolean().default(true),
  birth_date: z.date().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    is_public: boolean;
    birth_date?: Date | string | null;
  };
  userId: string; // Ensure we always have the userId for the update call
  onSuccess?: (updatedData: Partial<ProfileFormData>) => void; // Callback on successful update
}

export function ProfileForm({ initialData, userId, onSuccess }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(initialData.avatar_url);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty } // Use isDirty to enable/disable save button
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      username: initialData.username || '',
      bio: initialData.bio || '',
      is_public: initialData.is_public ?? true,
      birth_date: initialData.birth_date ? new Date(initialData.birth_date as any) : undefined,
    },
  });

  // Reset form if initialData changes (e.g., after a successful save)
  useEffect(() => {
    setCurrentAvatarUrl(initialData.avatar_url);
    reset({
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      username: initialData.username || '',
      bio: initialData.bio || '',
      is_public: initialData.is_public ?? true,
      birth_date: initialData.birth_date ? new Date(initialData.birth_date as any) : undefined,
    });
  }, [initialData, reset]);

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setCurrentAvatarUrl(newAvatarUrl);
    // Optionally, trigger a save of just the avatar, or let the main form save it.
    // For now, we just update the display and the main form will save everything if other fields are dirty.
    // If we want to save avatar immediately, we'd call updateUserProfile here.
    // We also need to make the form dirty if only avatar changed and user wants to save that.
    // A simple way: call reset with the new avatar url if we consider it part of the form data for dirtiness.
    // Or, handle avatar saving entirely within the AvatarUploaderComponent.
    toast.info("Avatar preview updated. Save changes to apply.");
  };

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // The avatar_url is now updated directly by AvatarUploader calling updateUserProfile.
      // So, we don't strictly need to send currentAvatarUrl from here unless we change that logic.
      // However, sending all fields from the form is fine.
      const dataToSend = { 
        ...data, 
        is_public: !!data.is_public,
        birth_date: data.birth_date ? data.birth_date.toISOString().split('T')[0] : null,
        // If AvatarUploader only updates its preview and expects this form to save:
        // avatar_url: currentAvatarUrl 
      };
      
      // If AvatarUploader already saved the avatar, this call will just update other fields.
      // If only avatar changed and was saved by uploader, isDirty might be false here.
      // We need to ensure this save button becomes active if avatar changed.
      // For now, assume if other fields are dirty, they get saved.
      // If only avatar changed, AvatarUploader already saved it.

      const { success, error } = await updateUserProfile(userId, dataToSend);

      if (success) {
        toast.success("პროფილი წარმატებით განახლდა!");
        if (onSuccess) {
          onSuccess(dataToSend);
        }
        reset(dataToSend);
      } else {
        toast.error(error?.message || "პროფილის განახლება ვერ შესრულდა.");
      }
    } catch (err) {
      console.error("პროფილის ფორმის გაგზავნის დროს შეცდომა:", err);
      toast.error("შეცდომა მოხდა.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl md:max-h-[80vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label>პროფილის სურათი</Label>
        <AvatarUploader 
            userId={userId} 
            currentAvatarUrl={currentAvatarUrl} 
            onAvatarUpdate={handleAvatarUpdate} 
            usernameInitial={initialData.username?.[0]?.toUpperCase() || '?'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="first_name">სახელი</Label>
          <Input 
            id="first_name"
            {...register("first_name")}
            className="bg-black/30 border-white/10" 
            placeholder="მაგ: გიორგი"
          />
          {errors.first_name && <p className="text-sm text-red-500">{errors.first_name.message}</p>}
        </div>

        {/* Last Name */} 
        <div className="space-y-2">
          <Label htmlFor="last_name">გვარი</Label>
          <Input 
            id="last_name"
            {...register("last_name")}
            className="bg-black/30 border-white/10" 
            placeholder="მაგ: ბერიძე"
          />
          {errors.last_name && <p className="text-sm text-red-500">{errors.last_name.message}</p>}
        </div>
      </div>

      {/* Username */} 
      <div className="space-y-2">
        <Label htmlFor="username">მომხმარებლის სახელი</Label>
        <Input 
          id="username"
          {...register("username")}
          className="bg-black/30 border-white/10" 
        />
        {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
      </div>

      {/* Bio */} 
      <div className="space-y-2">
        <Label htmlFor="bio">ბიო</Label>
        <Textarea 
          id="bio"
          {...register("bio")}
          placeholder="მოგვიყევით ცოტა თქვენს შესახებ..."
          rows={4}
          className="bg-black/30 border-white/10 resize-none" 
        />
        {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
      </div>

      {/* Birth Date */}
      <div className="space-y-2">
        <Label htmlFor="birth_date">დაბადების თარიღი</Label>
        <Controller
          name="birth_date"
          control={control}
          render={({ field }) => (
            <Input
              type="date"
              id="birth_date"
              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
              className="bg-black/30 border-white/10"
              max={new Date().toISOString().split('T')[0]}
            />
          )}
        />
        {errors.birth_date && <p className="text-sm text-red-500">{errors.birth_date.message}</p>}
      </div>

      {/* Public Profile Toggle */}
      <div className="space-y-2 border-t border-white/10 pt-6">
        <Label htmlFor="is_public" className="text-base font-medium">პროფილის კონფიდენციალურობა</Label>
        <div className="flex items-center space-x-3 rounded-md border border-input bg-black/30 p-4">
          <Controller
            name="is_public"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_public"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-readonly
              />
            )}
          />
          <div className="flex flex-col">
            <Label htmlFor="is_public" className="cursor-pointer">საჯარო პროფილი</Label>
            <p className="text-xs text-gray-400">
              სხვა მომხმარებლებს შეეძლებათ თქვენი პროფილის გვერდის, ბიბლიოთეკის და აქტივობის ნახვა.
            </p>
          </div>
        </div>
        {errors.is_public && <p className="text-sm text-red-500">{errors.is_public.message}</p>}
      </div>

      {/* Submit Button */} 
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !isDirty} // Disable if submitting or form hasn't changed
          className="bg-purple-600 hover:bg-purple-700 min-w-[100px]"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "ცვლილებების შენახვა"
          )}
        </Button>
      </div>
    </form>
  );
} 