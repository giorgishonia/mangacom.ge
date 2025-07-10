"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Sparkles, UserCheck, ListChecks, MapPin, Cake, Send, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from '@/components/supabase-auth-provider';
import { toast } from 'sonner';
import Image from 'next/image';
import { 
  checkUsernameAvailability, 
  completeOnboarding, 
  getProfileForUser,
  UserProfile 
} from '@/lib/users';

// --- Zod Schema with Async Refinement --- 

const onboardingSchema = z.object({
  first_name: z.string().max(50, "სახელი ძალიან გრძელია").optional().nullable(),
  last_name: z.string().max(50, "გვარი ძალიან გრძელია").optional().nullable(),
  username: z.string()
    .min(3, "მომხმარებლის სახელი უნდა იყოს 3-20 სიმბოლო")
    .max(20, "მომხმარებლის სახელი უნდა იყოს 3-20 სიმბოლო")
    .regex(/^[a-zA-Z0-9_]+$/, "მომხმარებლის სახელი შეიძლება შეიცავდეს მხოლოდ ლათინურ ასოებს, ციფრებს და ქვედა ტირეს")
    // Add refine for availability check - runs AFTER other checks pass
    .refine(async (username) => {
      // Skip check if username is too short (already handled by min)
      if (username.length < 3) return true; 
      return await checkUsernameAvailability(username);
    }, {
      message: "მომხმარებლის სახელი დაკავებულია.",
      // Optionally specify path: ['username'] if needed, but usually inferred
    }),
  interests: z.array(z.string()).optional().default([]), // e.g., ["anime", "manga"]
  location: z.string().max(100, "მდებარეობა ძალიან გრძელია").optional().nullable(),
  birth_date: z.date().optional().nullable(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Define steps and their required fields for progressive validation
const steps = [
  { id: 1, name: 'მისალმება', fields: [] }, // Welcome step with no required fields
  { id: 2, name: 'ძირითადი ინფორმაცია', fields: ['first_name', 'last_name', 'username'] },
  { id: 3, name: 'ინტერესები', fields: ['interests'] },
  { id: 4, name: 'დამატებითი დეტალები', fields: ['location', 'birth_date'] },
  { id: 5, name: 'მიმოხილვა', fields: [] }, // No fields needed for review step
];

// Anime/manga welcome images
const welcomeImages = [
  '/images/mascot/mascot-welcome.png',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingOnboardingStatus, setCheckingOnboardingStatus] = useState(true);
  const [welcomeImage, setWelcomeImage] = useState('/images/onboarding/onboarding-question.png');

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    control,
    formState: { errors, isValid, isSubmitting },
    getValues,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange', 
    // Note: Async refine might affect instant feedback, consider UX
  });

  const watchedUsername = watch("username");

  // Select a random welcome image on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * welcomeImages.length);
    setWelcomeImage(welcomeImages[randomIndex]);
  }, []);

  // Redirect if user is not logged in or already onboarded
  useEffect(() => {
    let isMounted = true; // Flag to track if component is mounted
    
    if (!authLoading && !user) {
      toast.error("გთხოვთ, ჯერ შეხვიდეთ სისტემაში.");
      router.push('/login');
      setCheckingOnboardingStatus(false);
      return;
    }

    if (user && checkingOnboardingStatus) {
      const checkStatus = async () => {
        try {
          console.log("OnboardingPage: Checking onboarding status...");
          const profile = await getProfileForUser(user.id);
          
          // Only proceed if component is still mounted
          if (!isMounted) return;
          
          if (profile?.has_completed_onboarding === true) {
            toast.info("პროფილი უკვე შევსებულია!");
            console.log("OnboardingPage: User already onboarded, redirecting home.");
            router.push('/');
          } else {
            console.log("OnboardingPage: User needs onboarding or profile check failed.");
            if (isMounted) {
              setCheckingOnboardingStatus(false);
            }
          }
        } catch (error) {
          console.error("OnboardingPage: Failed to check onboarding status:", error);
          
          // Only proceed if component is still mounted
          if (isMounted) {
            toast.error("პროფილის სტატუსის შემოწმება ვერ მოხერხდა. ვაგრძელებთ პროფილის შევსებას.");
            setCheckingOnboardingStatus(false);
          }
        }
      };
      checkStatus();
    } else if (!user && !authLoading) {
      setCheckingOnboardingStatus(false);
      console.log("OnboardingPage: User logged out, redirecting to login.");
      router.push('/login');
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router, checkingOnboardingStatus]);

  const handleNextStep = async () => {
    // For the welcome step, just move to the next step without validation
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }
    
    const fieldsToValidate = steps[currentStep - 1].fields as (keyof OnboardingFormData)[];
    const isValidStep = await trigger(fieldsToValidate);

    if (isValidStep) {
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
       // Optional: Show a general toast if validation fails for the step
       toast.error("გთხოვთ, შეასწოროთ შეცდომები გასაგრძელებლად."); 
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit: SubmitHandler<OnboardingFormData> = async (data) => {
    if (currentStep !== steps.length) return; 
    if (!user) return; 

    try {
       const dataToSend = {
         ...data,
         birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : null,
       };
       // Remove nullish values that Supabase might reject if column isn't nullable
       Object.keys(dataToSend).forEach(key => {
         if (dataToSend[key as keyof typeof dataToSend] === null || dataToSend[key as keyof typeof dataToSend] === undefined) {
           // Keep null for birth_date if intended, otherwise delete
           if (key !== 'birth_date') {
             delete dataToSend[key as keyof typeof dataToSend];
           }
         }
       });

      // Mark that we're in the process of completing onboarding to prevent redirect loops
      sessionStorage.setItem('onboardingInProgress', 'true');
      console.log("Onboarding completion started - marked as in progress");

      const { success, error } = await completeOnboarding(user.id, dataToSend);
      if (success) {
        toast.success("კეთილი იყოს თქვენი მობრძანება! პროფილი წარმატებით შეიქმნა.");
        
        // Set a flag in storage to prevent redirect loops after onboarding completes
        sessionStorage.setItem('onboardingCompleted', Date.now().toString());
        sessionStorage.setItem('lastRedirectTime', Date.now().toString());
        console.log("Onboarding completed successfully - marked as completed");
        
        // Explicitly redirect to the main page and refresh session data
        setTimeout(() => {
          // Remove the in-progress flag
          sessionStorage.removeItem('onboardingInProgress');
          console.log("Redirecting to home page after successful onboarding");
          router.push('/');
          router.refresh();
        }, 500); // Small delay to allow the toast to be seen
      } else {
        // Remove the in-progress flag on error
        sessionStorage.removeItem('onboardingInProgress');
        console.log("Onboarding completion failed:", error);
        
        // Handle specific errors like username taken again, if API returns it
        if (error?.message?.includes('Username already taken')) {
           toast.error("მომხმარებლის სახელი დაკავებულია. გთხოვთ, დაბრუნდეთ და აირჩიოთ სხვა.");
           // Optionally force back to step 1: setCurrentStep(1);
        } else {
          toast.error(error?.message || "პროფილის შენახვა ვერ მოხერხდა.");
        }
      }
    } catch (err) { 
      // Remove the in-progress flag on exception
      sessionStorage.removeItem('onboardingInProgress');
      console.error("Onboarding submission error:", err);
      toast.error("დაფიქსირდა შეცდომა.");
    } 
  };
  
  const pageIsLoading = authLoading || (!user && !authLoading) || checkingOnboardingStatus;

  if (pageIsLoading) {
     return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    ); 
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black p-4 bg-[url('/images/onboarding/bg-pattern.png')] bg-repeat bg-opacity-10">
      <motion.div 
        className="w-full max-w-xl p-8 space-y-6 bg-black/60 rounded-xl backdrop-blur-lg border border-purple-500/20 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            {currentStep === 1 ? (
              <span>მოგესალმებით Manganime-ში!</span>
            ) : (
              <span>კეთილი იყოს თქვენი მობრძანება!</span>
            )}
          </h1>
          {currentStep > 1 && (
            <p className="text-gray-300 mt-1">
              გაიარეთ პროფილის შევსების პროცესი ({currentStep - 1}/{steps.length - 2})
            </p>
          )}
        </div>
        
        {/* Progress Bar - only show after welcome step */}
        {currentStep > 1 && (
          <div className="w-full bg-gray-900 rounded-full h-1.5 mb-6">
            <motion.div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden flex justify-center">
                    {/* You'd need to create or find these images */}
                    <Image 
                      src={welcomeImage}
                      alt="Welcome to Manganime"
                      width={200}
                      height={100}
                    />
                  </div>
                  
                  <div className="space-y-4 text-center">
                    <p className="text-lg text-gray-200">
                      გთხოვთ გაიაროთ პროფილის შევსების პროცესი რათა შეძლოთ Manganime-ის სრული გამოცდილების მიღება.
                    </p>
                    <p className="text-sm text-gray-400">
                      ეს რამდენიმე წუთს წაიღებს. შეგიძლიათ შეავსოთ ძირითადი ინფორმაცია, მონიშნოთ თქვენი ინტერესები და მოგვცეთ საშუალება მოგაწოდოთ პერსონალიზებული კონტენტი.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-3 pt-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  </div>
                </div>
              )}
              
              {/* Step 2: Basic Info */} 
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-gray-300">სახელი (არასავალდებულო)</Label>
                      <Input id="first_name" {...register("first_name")} placeholder="მაგ., გიორგი" className="bg-black/70 border-purple-500/20 focus:border-purple-500" />
                      {errors.first_name && <p className="text-xs text-red-400">{errors.first_name.message}</p>}
                    </div>
                     <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-gray-300">გვარი (არასავალდებულო)</Label>
                      <Input id="last_name" {...register("last_name")} placeholder="მაგ., ბერიძე" className="bg-black/70 border-purple-500/20 focus:border-purple-500" />
                      {errors.last_name && <p className="text-xs text-red-400">{errors.last_name.message}</p>}
                    </div>
                  </div>
                   <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-gray-300">მომხმარებლის სახელი *</Label>
                      <Input 
                        id="username" 
                        {...register("username")} 
                        placeholder="აირჩიეთ უნიკალური მომხმარებლის სახელი" 
                        className="bg-black/70 border-purple-500/20 focus:border-purple-500" 
                      />
                      {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
                    </div>
                    
                    <div className="relative mt-4">
                      <div className="h-32 flex-row-reverse rounded-lg bg-black/40 border border-purple-500/10 flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/images/mascot/mascot-username.png" 
                          alt="Create a username"
                          width={80}
                          height={100}
                          className="opacity-90 p-2"
                        />
                        <div className="relative z-10 text-center max-w-xs mx-auto px-4">
                          <p className="text-sm text-gray-400">
                            მომხმარებლის სახელი გამოჩნდება თქვენს პროფილზე და კომენტარებში. აირჩიეთ ისეთი, რომელიც გამოხატავს თქვენს პიროვნებას!
                          </p>
                        </div>
                      </div>
                    </div>
                </div>
              )}
              
              {/* Step 3: Interests */} 
              {currentStep === 3 && (
                <div className="space-y-4">
                  <Label className="text-base font-medium text-gray-200">რა გაინტერესებთ?</Label>
                   <p className="text-sm text-gray-400">აირჩიეთ ყველა შესაბამისი. ეს დაგვეხმარება გამოცდილების პერსონალიზებაში.</p>
                  
                  <div className="relative flex justify-center h-44 mb-6 overflow-hidden rounded-lg">
                    <Image 
                      src="/images/onboarding/onboarding-question.png" 
                      alt="Select your interests" 
                      width={160}
                      height={128}
                    />
                  </div>
                  
                  <div className="flex justify-center flex-row-reverse gap-3 pt-2">
                    {[ { id: 'comics', label: 'კომიქსი', image: '/images/onboarding/onboarding-manga-icon.png' }, 
                       { id: 'manga', label: 'მანგა', image: '/images/onboarding/onboarding-comic-icon.png' } ].map((item) => (
                      <Controller
                        key={item.id}
                        name="interests"
                        control={control}
                        render={({ field }) => (
                          <Label 
                            htmlFor={item.id}
                            className={cn(
                              "flex items-center space-x-3 rounded-md border p-4 cursor-pointer transition-all",
                              field.value?.includes(item.id) 
                                ? 'border-purple-500 bg-purple-900/20' 
                                : 'border-purple-500/10 bg-black/60 hover:bg-black/80'
                            )}
                          >
                            <div className=" overflow-hidden mr-2">
                              <Image 
                                src={item.image} 
                                alt={item.label} 
                                width={40} 
                                height={40} 
                                className="object-cover"
                              />
                            </div>
                            <Checkbox 
                              id={item.id}
                              checked={field.value?.includes(item.id)} 
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), item.id])
                                  : field.onChange(field.value?.filter((value) => value !== item.id));
                              }}
                              className={cn(
                                 "transition-colors",
                                 field.value?.includes(item.id) 
                                  ? "border-purple-500 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white" 
                                  : "border-gray-500"
                              )}
                            />
                            <span className="text-lg">{item.label}</span>
                          </Label>
                        )}
                      />
                    ))}
                  </div>
                  {errors.interests && <p className="text-xs text-red-400">{errors.interests.message}</p>}
                </div>
              )}

              {/* Step 4: Optional Details */} 
              {currentStep === 4 && (
                 <div className="space-y-4">
                   <p className="text-sm text-gray-400">ეს დეტალები არასავალდებულოა და შეგიძლიათ მოგვიანებით დაამატოთ.</p>
                   
                   <div className="relative h-36 mb-6 overflow-hidden flex justify-center rounded-lg">
                     <Image 
                       src="/images/onboarding/onboarding-details.png" 
                       alt="Additional details" 
                       width={140}
                       height={128}
                     />
                   </div>
                   
                   <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-gray-300">მდებარეობა</Label>
                      <div className="relative">
                         <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                         <Input id="location" {...register("location")} placeholder="მაგ., თბილისი, საქართველო" className="bg-black/70 border-purple-500/20 pl-10" />
                      </div>
                      {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                       <Label htmlFor="birth_date" className="text-gray-300">დაბადების თარიღი</Label>
                        <Controller
                           name="birth_date"
                           control={control}
                           render={({ field }) => {
                             const [open, setOpen] = useState(false)
                             return (
                               <Popover open={open} onOpenChange={setOpen}>
                                 <PopoverTrigger asChild>
                                   <Button
                                     variant={"outline"}
                                     className={cn(
                                       "w-full justify-start text-left font-normal bg-black/70 border-purple-500/20",
                                       !field.value && "text-muted-foreground"
                                     )}
                                   >
                                     <CalendarIcon className="mr-2 h-4 w-4" />
                                     {field.value ? format(field.value, "PPP") : <span>აირჩიეთ თარიღი</span>}
                                   </Button>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-auto p-0">
                                   <Calendar
                                     mode="single"
                                     selected={field.value ?? undefined}
                                     onSelect={(date) => {
                                       field.onChange(date)
                                       setOpen(false)
                                     }}
                                     disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                     initialFocus
                                     captionLayout="dropdown"
                                     fromYear={1950}
                                     toYear={new Date().getFullYear() - 5}
                                   />
                                 </PopoverContent>
                               </Popover>
                             )
                           }}
                       />
                      {errors.birth_date && <p className="text-xs text-red-400">{errors.birth_date.message}</p>}
                    </div>
                 </div>
              )}

              {/* Step 5: Review */} 
              {currentStep === 5 && (
                 <div className="space-y-4">
                    <h3 className="font-medium text-lg text-gray-200">ინფორმაციის მიმოხილვა</h3>
                    
                    <div className="relative h-36 mb-6 overflow-hidden rounded-lg">
                      <Image 
                        src="/images/onboarding/review-banner.jpg" 
                        alt="Review your information" 
                        width={800}
                        height={144}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    
                    <div className="space-y-3 text-sm bg-black/40 p-6 rounded-md border border-purple-500/20">
                      <p><strong className="text-purple-400">მომხმარებლის სახელი:</strong> <span className="text-white">{getValues("username")}</span></p>
                      <p><strong className="text-purple-400">სახელი:</strong> <span className="text-white">{getValues("first_name") || '-'}</span></p>
                      <p><strong className="text-purple-400">გვარი:</strong> <span className="text-white">{getValues("last_name") || '-'}</span></p>
                      <p><strong className="text-purple-400">ინტერესები:</strong> <span className="text-white">{getValues("interests")?.map(i => i === 'comics' ? 'კომიქსი' : i === 'manga' ? 'მანგა' : i).join(', ') || 'არჩეული არ არის'}</span></p>
                      <p><strong className="text-purple-400">მდებარეობა:</strong> <span className="text-white">{getValues("location") || '-'}</span></p>
                      <p><strong className="text-purple-400">დაბადების თარიღი:</strong> <span className="text-white">{getValues("birth_date") ? format(getValues("birth_date")!, 'PPP') : '-'}</span></p>
                    </div>
                    
                    <p className="text-center text-sm text-gray-400 mt-4">
                      თქვენი პროფილის შექმნისთანავე, შეძლებთ სრულად ისარგებლოთ Manganime-ის ყველა ფუნქციით!
                    </p>
                 </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */} 
          <div className="flex justify-between pt-4 border-t border-purple-500/10 mt-6">
            <Button 
              type="button"
              variant="outline"
              onClick={handlePreviousStep} 
              disabled={currentStep === 1 || isSubmitting}
              className={cn(
                "border-purple-500/20 hover:bg-purple-500/10 text-white",
                currentStep === 1 && "invisible"
              )}
            >
              უკან
            </Button>
            
            {currentStep < steps.length ? (
              <Button 
                type="button"
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-w-[100px] text-white"
              >
                {currentStep === 1 ? (
                  <div className="flex items-center gap-2">
                    დაწყება <ArrowRight className="h-4 w-4" />
                  </div>
                ) : currentStep === steps.length - 1 ? (
                  'მიმოხილვა'
                ) : (
                  'შემდეგი'
                )}
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 min-w-[120px] flex items-center gap-2 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Send className="h-4 w-4" /> დასრულება</>
                )}
              </Button>
            )}
          </div>
        </form>
      </motion.div>
      
      <div className="mt-6 text-center text-gray-500 text-xs">
        <p>© 2025 Manganime • გააზიარეთ თქვენი სიყვარული ანიმესა და მანგასადმი</p>
      </div>
    </div>
  );
} 