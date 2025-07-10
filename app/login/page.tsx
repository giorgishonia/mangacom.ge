"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion as m } from "framer-motion"
import { FaDiscord } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

// Define interface for anime/manga card data
interface MediaCard {
  id: number
  title: string
  image: string
  imageLoaded?: boolean
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [mediaCards, setMediaCards] = useState<MediaCard[]>([])
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const libraryRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial window size
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch anime/manga data
  useEffect(() => {
    async function fetchMedia() {
      try {
        const placeholderData = [
          { id: 1, title: "Attack on Titan", image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg" },
          { id: 2, title: "Death Note", image: "https://cdn.myanimelist.net/images/anime/9/9453.jpg" },
          { id: 3, title: "Fullmetal Alchemist", image: "https://cdn.myanimelist.net/images/anime/10/75815.jpg" },
          { id: 4, title: "One Punch Man", image: "https://cdn.myanimelist.net/images/anime/12/76049.jpg" },
          { id: 5, title: "Demon Slayer", image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg" },
          { id: 6, title: "My Hero Academia", image: "https://cdn.myanimelist.net/images/anime/10/78745.jpg" },
          { id: 7, title: "Naruto", image: "https://cdn.myanimelist.net/images/anime/13/17405.jpg" },
          { id: 8, title: "One Piece", image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg" },
          { id: 9, title: "Tokyo Ghoul", image: "https://cdn.myanimelist.net/images/anime/5/64449.jpg" },
          { id: 10, title: "Hunter x Hunter", image: "https://cdn.myanimelist.net/images/anime/11/33657.jpg" },
          { id: 11, title: "Sword Art Online", image: "https://cdn.myanimelist.net/images/anime/11/39717.jpg" },
          { id: 12, title: "Steins;Gate", image: "https://cdn.myanimelist.net/images/anime/5/73199.jpg" },
          { id: 13, title: "Jujutsu Kaisen", image: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg" },
          { id: 14, title: "Chainsaw Man", image: "https://cdn.myanimelist.net/images/anime/1806/126216.jpg" },
          { id: 15, title: "Bleach", image: "https://cdn.myanimelist.net/images/anime/3/40451.jpg" },
          { id: 16, title: "Dragon Ball Z", image: "https://cdn.myanimelist.net/images/anime/1277/142022.jpg"},
          { id: 17, title: "Spy x Family", image: "https://cdn.myanimelist.net/images/anime/1441/122795.jpg" },
          { id: 18, title: "Cowboy Bebop", image: "https://cdn.myanimelist.net/images/anime/4/19644.jpg" },
          { id: 19, title: "Vinland Saga", image: "https://cdn.myanimelist.net/images/anime/1500/103005.jpg" },
          { id: 20, title: "Your Name", image: "https://cdn.myanimelist.net/images/anime/5/87048.jpg" },
          { id: 21, title: "Haikyuu!!", image: "https://cdn.myanimelist.net/images/anime/7/76014.jpg" },
          { id: 22, title: "Violet Evergarden", image: "https://cdn.myanimelist.net/images/anime/1795/95088.jpg" },
          { id: 23, title: "Made in Abyss", image: "https://cdn.myanimelist.net/images/anime/6/86733.jpg" },
          { id: 24, title: "Mob Psycho 100", image: "https://cdn.myanimelist.net/images/anime/8/80356.jpg" },
          { id: 25, title: "Re:Zero", image: "https://cdn.myanimelist.net/images/anime/11/79410.jpg" },
          { id: 26, title: "Berserk", image: "https://cdn.myanimelist.net/images/manga/1/157897.jpg" },
          { id: 27, title: "Vagabond", image: "https://cdn.myanimelist.net/images/manga/1/259070.jpg" },
          { id: 28, title: "Vinland Saga", image: "https://cdn.myanimelist.net/images/manga/2/188925.jpg" },
          { id: 29, title: "Monster", image: "https://cdn.myanimelist.net/images/anime/10/18793.jpg" },
          { id: 30, title: "20th Century Boys", image: "https://cdn.myanimelist.net/images/manga/5/260006.jpg" },
          { id: 31, title: "Goodnight Punpun", image: "https://cdn.myanimelist.net/images/manga/2/166996.jpg" },
          { id: 32, title: "Kingdom", image: "https://cdn.myanimelist.net/images/manga/2/171872.jpg" },
        ];
        
        // Shuffle and duplicate the data to fill the wall
        const shuffled = [...placeholderData].sort(() => 0.5 - Math.random());
        const expandedData = [...shuffled, ...shuffled].map((item, index) => ({
          ...item,
          id: index + 1, // Ensure unique IDs
        }));
        
        setMediaCards(expandedData);
      } catch (err) {
        console.error("Failed to fetch media data:", err);
      }
    }

    fetchMedia();
  }, []);

  const handleImageError = (cardId: number) => {
    setMediaCards(prev => 
      prev.map(card => 
        card.id === cardId ? { ...card, imageLoaded: false } : card
      )
    );
  };

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true);
    setError("");
    try {
      if (provider === "google") {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      } else if (provider === "discord") {
        await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      }
    } catch (error) {
      console.error("OAuth error:", error);
      setIsLoading(false);
      setError("OAuth პროვაიდერით შესვლა ვერ მოხერხდა");
    }
  };

  // Calculate grid layout based on window size
  const getGridLayout = () => {
    const aspectRatio = 1.5; // Typical poster aspect ratio (height/width)
    const spacing = windowSize.width < 640 ? 6 : 12; // Smaller gap on mobile
    
    // Adjust minimum card width based on screen size
    let minCardWidth = 90; // Default minimum
    if (windowSize.width < 640) minCardWidth = 65; // Smaller on mobile
    if (windowSize.width < 480) minCardWidth = 55; // Even smaller on very small screens
    
    // Calculate number of cards per row based on window width
    let cardsPerRow = Math.floor(windowSize.width / (minCardWidth + spacing));
    // Ensure sensible limits based on screen size
    if (windowSize.width < 480) {
      cardsPerRow = Math.min(Math.max(cardsPerRow, 3), 5);
    } else if (windowSize.width < 768) {
      cardsPerRow = Math.min(Math.max(cardsPerRow, 4), 8);
    } else {
      cardsPerRow = Math.min(Math.max(cardsPerRow, 6), 12);
    }
    
    // Calculate actual card width based on available space
    const cardWidth = (windowSize.width - (spacing * (cardsPerRow + 1))) / cardsPerRow;
    const cardHeight = cardWidth * aspectRatio;
    
    // Calculate rows needed to fill the screen (plus one extra row)
    const rowsNeeded = Math.ceil(windowSize.height / (cardHeight + spacing)) + 1;
    
    return {
      cardsPerRow,
      cardWidth,
      cardHeight,
      rowsNeeded,
      spacing
    };
  };

  // Only calculate layout if window dimensions are known
  const layout = windowSize.width > 0 ? getGridLayout() : {
    cardsPerRow: 6,
    cardWidth: 90,
    cardHeight: 135,
    rowsNeeded: 5,
    spacing: 12
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      {/* Dark background with subtle texture */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#000] pointer-events-none">
        {/* Texture effect */}
        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")',
               backgroundSize: '20px 20px',
             }} />
      </div>

      {/* Library Wall Container */}
      <div 
        ref={libraryRef}
        className="fixed inset-0 perspective-[1500px] overflow-hidden"
      >
        <div className="absolute inset-0">
          {/* Create a wall of covers with rows and columns */}
          {Array.from({ length: layout.rowsNeeded }).map((_, rowIndex) => (
            <div 
              key={`row-${rowIndex}`} 
              className="flex" 
              style={{ 
                position: 'absolute',
                top: `${rowIndex * (layout.cardHeight + layout.spacing)}px`, 
                left: 0,
                right: 0,
                height: `${layout.cardHeight}px`,
                padding: `0 ${layout.spacing}px`,
                gap: `${layout.spacing}px`
              }}
            >
              {Array.from({ length: layout.cardsPerRow }).map((_, colIndex) => {
                const cardIndex = (rowIndex * layout.cardsPerRow + colIndex) % mediaCards.length;
                const card = mediaCards[cardIndex];
                
                // Skip rendering if we don't have enough cards
                if (!card) return null;
                
                // Randomize the breathing animation slightly for each card
                const breathingDuration = 3 + Math.random() * 2;
                const breathingDelay = Math.random() * 2;
                const breathingAmount = 1.02 + (Math.random() * 0.03);
                
                return (
                  <m.div
                    key={`card-${rowIndex}-${colIndex}`}
                    className="relative rounded-md overflow-hidden shadow-md"
                    style={{ 
                      width: `${layout.cardWidth}px`,
                      height: `${layout.cardHeight}px`,
                    }}
                    animate={{
                      // Subtle breathing animation
                      scale: [1, breathingAmount, 1],
                    }}
                    transition={{
                      duration: breathingDuration,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                      delay: breathingDelay,
                    }}
                  >
                    {/* Card Content */}
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />
                      
                      {card.imageLoaded !== false ? (
                        <Image
                          src={card.image}
                          alt={card.title}
                          fill
                          sizes={`${layout.cardWidth}px`}
                          className="object-cover"
                          priority={rowIndex < 2} // Prioritize loading the first two rows
                          onError={() => handleImageError(card.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                          <div className="text-2xl font-bold text-white/30 p-2 text-center">
                            {card.title.substring(0, 1)}
                          </div>
                        </div>
                      )}
                      
                      <div className="hidden absolute bottom-0 left-0 right-0 p-2 z-10">
                        <h3 className="text-xs font-medium text-white line-clamp-1">{card.title}</h3>
                      </div>
                    </div>
                    
                    {/* Spine effect/side shadow */}
                    <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-r from-black/30 to-transparent" />
                  </m.div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Library ambiance effects */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/90 via-transparent to-black/90 z-10" />
      </div>
      
      {/* Ambient dust particles */}
      <div className="fixed inset-0 pointer-events-none z-20">
        {[...Array(20)].map((_, i) => (
          <m.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-white/20"
            style={{
              width: 1 + Math.random() * 2,
              height: 1 + Math.random() * 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: "blur(1px)",
            }}
            animate={{
              y: [0, -30 - Math.random() * 70],
              x: [0, (Math.random() - 0.5) * 20],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>
      
      {/* Login form */}
      <m.div 
        className="relative z-30 w-full max-w-md mx-4 p-4 sm:p-8 space-y-4 sm:space-y-8 bg-black/70 rounded-xl backdrop-blur-xl border border-white/10 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <m.div 
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl shadow-lg shadow-indigo-500/20"></div>
            <div className="absolute inset-1 bg-black rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold text-white">M</div>
        </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">კეთილი იყოს თქვენი მობრძანება Manganime-ში</h1>
          <p className="text-zinc-400 mt-1 sm:mt-2 text-sm sm:text-base">გააგრძელეთ შესვლა</p>
        </m.div>

        <m.div 
          className="space-y-3 sm:space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button 
            variant="outline" 
            className="w-full h-10 sm:h-12 bg-[#5865F2]/10 border-[#5865F2]/30 hover:bg-[#5865F2]/20 hover:text-white flex items-center gap-3 text-white/80"
            onClick={() => handleOAuthSignIn("discord")}
            disabled={isLoading}
          >
            <FaDiscord className="h-4 w-4 sm:h-5 sm:w-5 text-[#5865F2]" />
            <span className="text-sm sm:text-base">Discord-ით გაგრძელება</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-10 sm:h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white flex items-center gap-3 text-white/80"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
          >
            <FcGoogle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Google-ით გაგრძელება</span>
          </Button>
        </m.div>
              
              {error && (
          <m.p 
            className="text-red-500 text-xs sm:text-sm text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </m.p>
        )}
        
        <m.div 
          className="text-center text-zinc-500 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          შესვლით თქვენ ეთანხმებით ჩვენს მომსახურების პირობებსა და კონფიდენციალურობის პოლიტიკას
        </m.div>
      </m.div>
    </div>
  )
}
