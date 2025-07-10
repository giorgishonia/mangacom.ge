import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function MainNav() {
  return (
    <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:space-x-6">
      <Link
        href="/discover"
        className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium")}
      >
        Discover
      </Link>
      <Link
        href="/anime"
        className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium")}
      >
        Anime
      </Link>
      <Link
        href="/manga"
        className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium")}
      >
        Manga
      </Link>
      <Link
        href="/feedback"
        className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium")}
      >
        Feedback
      </Link>
      {/* Add new navigation links above this line */}
    </div>
  );
} 