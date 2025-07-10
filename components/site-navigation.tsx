import {
  Clock,
  Compass,
  Film,
  Flame,
  Heart,
  History,
  Home,
  Image,
  Settings,
  BookOpen,
  LibraryBig,
  MessageSquare
} from "lucide-react";

export function SiteNavigation() {
  const mainNavItems = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Discover",
      href: "/explore",
      icon: <Compass className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Trending",
      href: "/trending",
      icon: <Flame className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Anime",
      href: "/anime",
      icon: <Film className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Manga",
      href: "/manga",
      icon: <BookOpen className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Library",
      href: "/library",
      icon: <LibraryBig className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Stickers",
      href: "/stickers",
      icon: <Image className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Feedback",
      href: "/feedback",
      icon: <MessageSquare className="h-5 w-5" />,
      variant: "default" as const,
    },
  ];
} 