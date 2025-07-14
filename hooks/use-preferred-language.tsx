'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'ge' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Comprehensive translations object
const translations = {
  // Common UI elements
  save: { ge: 'შენახვა', en: 'Save' },
  cancel: { ge: 'გაუქმება', en: 'Cancel' },
  delete: { ge: 'წაშლა', en: 'Delete' },
  edit: { ge: 'რედაქტირება', en: 'Edit' },
  loading: { ge: 'იტვირთება...', en: 'Loading...' },
  error: { ge: 'შეცდომა', en: 'Error' },
  success: { ge: 'წარმატება', en: 'Success' },
  warning: { ge: 'გაფრთხილება', en: 'Warning' },
  back: { ge: 'უკან', en: 'Back' },
  next: { ge: 'შემდეგი', en: 'Next' },
  finish: { ge: 'დასრულება', en: 'Finish' },
  continue: { ge: 'გაგრძელება', en: 'Continue' },
  close: { ge: 'დახურვა', en: 'Close' },

  // Settings page
  settings: { ge: 'პარამეტრები', en: 'Settings' },
  profile: { ge: 'პროფილი', en: 'Profile' },
  appearance: { ge: 'გარეგნობა', en: 'Appearance' },
  notifications: { ge: 'შეტყობინებები', en: 'Notifications' },
  language: { ge: 'ენა', en: 'Language' },
  languagePreference: { ge: 'ენის პრეფერენცია', en: 'Language Preference' },
  georgian: { ge: 'ქართული', en: 'Georgian' },
  english: { ge: 'ინგლისური', en: 'English' },

  // Toast messages
  profileUpdated: { ge: 'პროფილი წარმატებით განახლდა!', en: 'Profile updated successfully!' },
  languageUpdated: { ge: 'ენის პრეფერენცია განახლებულია!', en: 'Language preference updated!' },
  languageUpdateFailed: { ge: 'ენის განახლება ვერ მოხერხდა.', en: 'Failed to update language.' },
  loginRequired: { ge: 'გთხოვთ შეხვიდეთ სისტემაში პარამეტრების სანახავად.', en: 'Please log in to access settings.' },
  profileLoadError: { ge: 'შეცდომა: თქვენი პროფილის მონაცემების ჩატვირთვა ვერ მოხერხდა. გთხოვთ განაახლოთ გვერდი ან ხელახლა შეხვიდეთ სისტემაში.', en: 'Error: Could not load your profile data. Please try refreshing the page or re-logging in.' },

  // Appearance settings
  commentBanners: { ge: 'კომენტარების ბანერები', en: 'Comment Banners' },
  chooseBanner: { ge: 'აირჩიეთ ფონის ბანერი თქვენი კომენტარების სექციებისთვის საიტზე.', en: 'Choose a background banner for your comment sections across the site.' },
  imageBanners: { ge: 'სურათის ბანერები', en: 'Image Banners' },
  gifBanners: { ge: 'GIF ბანერები', en: 'GIF Banners' },
  vipExclusiveImages: { ge: 'VIP ექსკლუზიური სურათის ბანერები', en: 'VIP exclusive image banners' },
  vipExclusiveGifs: { ge: 'VIP ექსკლუზიური ანიმაციური ბანერები', en: 'VIP exclusive animated banners' },
  upgradeToVip: { ge: 'VIP-ზე განახლება გასაღებად', en: 'Upgrade to VIP to unlock' },
  bannerSelected: { ge: 'ბანერი არჩეულია', en: 'Banner selected' },
  usingDefaultBackground: { ge: 'ნაგულისხმევი ფონის გამოყენება', en: 'Using default background' },
  saving: { ge: 'ინახება...', en: 'Saving...' },
  saveChanges: { ge: 'ცვლილებების შენახვა', en: 'Save Changes' },
  commentBackgroundUpdated: { ge: 'კომენტარის ფონი განახლდა!', en: 'Comment background updated!' },
  backgroundUpdateFailed: { ge: 'ფონის განახლება ვერ მოხერხდა', en: 'Failed to update background' },

  // Suggestions page
  feedback: { ge: 'უკუკავშირი', en: 'Feedback' },
  feedbackDescription: { ge: 'წარმოადგინეთ თქვენი იდეები, შეგვატყობინეთ შეცდომების შესახებ ან შემოგვთავაზეთ გაუმჯობესების იდეები. ასევე შეგიძლიათ მისცეთ ხმა მოთხოვნებს ან იდეებს, რომელთა დანერგვაც გსურთ.', en: 'Submit your ideas, report bugs, or suggest improvements. You can also vote on requests or ideas you\'d like to see implemented.' },
  searchSuggestions: { ge: 'მოთხოვნების ძიება...', en: 'Search suggestions...' },
  newSuggestion: { ge: 'ახალი მოთხოვნა', en: 'New Suggestion' },
  popular: { ge: 'პოპულარული', en: 'Popular' },
  newest: { ge: 'ახალი', en: 'Newest' },
  all: { ge: 'ყველა', en: 'All' },
  anime: { ge: 'ანიმე', en: 'Anime' },
  manga: { ge: 'მანგა', en: 'Manga' },
  stickers: { ge: 'სტიკერები', en: 'Stickers' },
  bugs: { ge: 'შეცდომები', en: 'Bugs' },
  features: { ge: 'ფუნქციები', en: 'Features' },
  suggestionsNotFound: { ge: 'მოთხოვნები ვერ მოიძებნა', en: 'No suggestions found' },
  tryDifferentSearch: { ge: 'სცადეთ სხვა საძიებო ტერმინი', en: 'Try a different search term' },
  beFirst: { ge: 'იყავით პირველი, ვინც დაამატებს მოთხოვნას!', en: 'Be the first to add a suggestion!' },
  suggestionsLoadFailed: { ge: 'მოთხოვნების ჩატვირთვა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.', en: 'Could not load suggestions. Please try again later.' },
  voteRequiresAuth: { ge: 'ხმის მისაცემად უნდა იყოთ ავტორიზებული', en: 'You must be signed in to vote' },
  voteFailed: { ge: 'ხმის მიცემა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.', en: 'Could not register your vote. Please try again.' },
  downvoteFailed: { ge: 'ხმის მიცემა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა.', en: 'Could not register your downvote. Please try again.' },
  anonymous: { ge: 'ანონიმური', en: 'Anonymous' },

  // General navigation
  home: { ge: 'მთავარი', en: 'Home' },
  search: { ge: 'ძიება', en: 'Search' },
  library: { ge: 'ბიბლიოთეკა', en: 'Library' },
  favorites: { ge: 'ფავორიტები', en: 'Favorites' },
  history: { ge: 'ისტორია', en: 'History' },
  friends: { ge: 'მეგობრები', en: 'Friends' },
  vip: { ge: 'VIP', en: 'VIP' },

  // Auth related
  signIn: { ge: 'შესვლა', en: 'Sign In' },
  signOut: { ge: 'გასვლა', en: 'Sign Out' },
  signUp: { ge: 'რეგისტრაცია', en: 'Sign Up' },
  email: { ge: 'ელ. ფოსტა', en: 'Email' },
  password: { ge: 'პაროლი', en: 'Password' },
  username: { ge: 'მომხმარებლის სახელი', en: 'Username' },
  firstName: { ge: 'სახელი', en: 'First Name' },
  lastName: { ge: 'გვარი', en: 'Last Name' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ge');

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let current: any = translations;
    
    for (const k of keys) {
      current = current?.[k];
      if (!current) break;
    }
    
    if (current && typeof current === 'object' && current[language]) {
      return current[language];
    }
    
    // Fallback to key if translation not found
    return key;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Keep the old hook for backward compatibility
export function usePreferredLanguage() {
  const { language } = useLanguage();
  return language;
}