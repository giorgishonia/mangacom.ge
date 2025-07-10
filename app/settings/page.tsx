"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Palette, Bell } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/components/supabase-auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from '@/components/settings/profile-form';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { toast } from 'sonner';
import { NotificationSettings } from '@/components/settings/notification-settings';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading, session } = useAuth();

  useEffect(() => {
    // Redirect if not logged in after auth check is complete
    if (!isAuthLoading && !user) {
      toast.error("Please log in to access settings.");
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Show loading spinner if auth/profile data is still loading
  if (isAuthLoading) {
    return (
      <>
        <AppSidebar />
        <div className="flex justify-center items-center min-h-screen md:pl-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        </div>
      </>
    );
  }
  
  // If user is null after loading (and not redirected yet, though useEffect should handle it)
  if (!user) {
     return null; // Or a redirect component / explicit redirect
  }

  // Handle case where user is loaded, but profile is still null (e.g., error during sync in AuthProvider)
  if (!profile) {
     return (
       <>
         <AppSidebar />
         <div className="container mx-auto px-4 py-8 md:pl-24">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>
            <p className='text-red-500'>Error: Could not load your profile data. Please try refreshing the page or re-logging in.</p>
         </div>
       </>
     );
  }

  const handleProfileUpdate = (updatedProfileData: Partial<typeof profile>) => {
    // The profile in useAuth context should update automatically if ProfileForm calls updateUserProfile
    // which then triggers a re-sync or state update in SupabaseAuthProvider.
    // For now, just a toast message here is fine.
    toast.success("Profile updated successfully!");
    // Potentially, could force a refresh of the profile from useAuth if needed:
    // refreshAuthProfile(); // Assuming useAuth exposes such a function
  };

  return (
    <>
      <AppSidebar />
      <div className="container mx-auto px-4 py-8 md:pl-24">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex flex-wrap gap-2 mb-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" /> Profile
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" /> Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" /> Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileForm 
              initialData={{
                id: profile.id,
                username: profile.username || '', // Fallback for null username
                first_name: profile.first_name || null,
                last_name: profile.last_name || null,
                avatar_url: profile.avatar_url || null,
                bio: profile.bio || null,
                is_public: profile.is_public ?? true, // Fallback for undefined is_public
                birth_date: profile.birth_date || null,
              }} 
              userId={user.id} 
              onSuccess={handleProfileUpdate}
            />
          </TabsContent>
          
          <TabsContent value="appearance">
            {profile && user && (
              <AppearanceSettings currentProfile={profile} userId={user.id} />
            )}
          </TabsContent>
          <TabsContent value="notifications">
            {profile && (
              <NotificationSettings 
                initialSettings={{
                  email_notifications: profile.email_notifications ?? true,
                  push_notifications: profile.push_notifications ?? true,
                }}
                userId={user.id}
              />
            )}
          </TabsContent>
          
        </Tabs>
      </div>
    </>
  );
} 