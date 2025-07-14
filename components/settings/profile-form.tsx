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
import { Loader2, User, Calendar, Lock, Edit3 } from 'lucide-react';
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
    toast.info("Avatar preview updated. Save changes to apply.");
  };

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const dataToSend = { 
        ...data, 
        is_public: !!data.is_public,
        birth_date: data.birth_date ? data.birth_date.toISOString().split('T')[0] : null,
      };

      const { success, error } = await updateUserProfile(userId, dataToSend);

      if (success) {
        toast.success("პროფილი წარმატებით განახლდა!");
        if (onSuccess) {
          onSuccess(data);
        }
        reset(data);
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
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Edit3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">პროფილის რედაქტირება</h3>
            <p className="text-sm text-gray-400">განაახლეთ თქვენი პირადი ინფორმაცია</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {/* Avatar Section */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <Label className="text-base font-medium text-white">პროფილის სურათი</Label>
              <p className="text-sm text-gray-400 mt-1">ატვირთეთ თქვენი პროფილის სურათი</p>
            </div>
          </div>
          <div className="mt-4">
            <AvatarUploader 
              userId={userId} 
              currentAvatarUrl={currentAvatarUrl} 
              onAvatarUpdate={handleAvatarUpdate} 
              usernameInitial={initialData.username?.[0]?.toUpperCase() || '?'}
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <User className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <h4 className="text-base font-medium text-white">პირადი ინფორმაცია</h4>
              <p className="text-sm text-gray-400">თქვენი ძირითადი მონაცემები</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium text-gray-300">
                სახელი
              </Label>
              <Input 
                id="first_name"
                {...register("first_name")}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all" 
                placeholder="მაგ: გიორგი"
              />
              {errors.first_name && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                  {errors.first_name.message}
                </p>
              )}
            </div>

            {/* Last Name */} 
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium text-gray-300">
                გვარი
              </Label>
              <Input 
                id="last_name"
                {...register("last_name")}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all" 
                placeholder="მაგ: ბერიძე"
              />
              {errors.last_name && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          {/* Username */} 
          <div className="space-y-2 mt-6">
            <Label htmlFor="username" className="text-sm font-medium text-gray-300">
              მომხმარებლის სახელი
            </Label>
            <Input 
              id="username"
              {...register("username")}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all" 
            />
            {errors.username && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Bio */} 
          <div className="space-y-2 mt-6">
            <Label htmlFor="bio" className="text-sm font-medium text-gray-300">
              ბიოგრაფია
            </Label>
            <Textarea 
              id="bio"
              {...register("bio")}
              placeholder="მოგვიყევით ცოტა თქვენს შესახებ..."
              rows={4}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all resize-none" 
            />
            {errors.bio && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                {errors.bio.message}
              </p>
            )}
          </div>

          {/* Birth Date */}
          <div className="space-y-2 mt-6">
            <Label htmlFor="birth_date" className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              დაბადების თარიღი
            </Label>
            <Controller
              name="birth_date"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  id="birth_date"
                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                  className="bg-gray-800/50 border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                  max={new Date().toISOString().split('T')[0]}
                />
              )}
            />
            {errors.birth_date && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                {errors.birth_date.message}
              </p>
            )}
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Lock className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h4 className="text-base font-medium text-white">კონფიდენციალურობა</h4>
              <p className="text-sm text-gray-400">თქვენი პროფილის ხილვადობის პარამეტრები</p>
            </div>
          </div>

          <Controller
            name="is_public"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_public"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <div>
                      <Label htmlFor="is_public" className="text-sm font-medium text-white cursor-pointer">
                        საჯარო პროფილი
                      </Label>
                      <p className="text-xs text-gray-400 mt-1">
                        სხვა მომხმარებლებს შეეძლებათ თქვენი პროფილის გვერდის, ბიბლიოთეკის და აქტივობის ნახვა.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
          {errors.is_public && (
            <p className="text-sm text-red-400 flex items-center gap-2 mt-2">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              {errors.is_public.message}
            </p>
          )}
        </div>

        {/* Submit Button */} 
        <div className="flex justify-end pt-4 border-t border-gray-800">
          <Button 
            type="submit" 
            disabled={isSubmitting || !isDirty}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-8 py-2.5 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>შენახვა...</span>
              </div>
            ) : (
              "ცვლილებების შენახვა"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 