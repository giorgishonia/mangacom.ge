import React from "react";
import { Crown, ShieldCheck, Star, Zap } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/supabase-auth-provider";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface VipPromoBannerProps {
  className?: string;
}

// Array of quick benefit strings for display
const BENEFITS: { icon: React.ReactNode; label: string }[] = [
  { icon: <Star className="h-4 w-4 text-yellow-400" />, label: "VIP ნიშანი პროფილსა და კომენტარებში" },
  { icon: <ShieldCheck className="h-4 w-4 text-green-400" />, label: "რეკლამების გარეშე გამოცდილება" },
  { icon: <Zap className="h-4 w-4 text-purple-400" />, label: "GIF ავატარი და პერსონალური ბანერი" },
];

export function VipPromoBanner({ className }: VipPromoBannerProps) {
  const { profile } = useAuth();

  // Already VIP? Don't render the banner
  if (profile?.vip_status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex w-full flex-col sm:flex-row items-center overflow-hidden rounded-xl border border-purple-500/30 bg-transparent p-4 md:p-6 backdrop-blur-lg shadow-lg",
        className,
      )}
    >
      {/* Background accent */}
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-purple-600 opacity-20 blur-[120px]" />

      {/* Mascot image */}
      <div className="relative z-10 mb-3 sm:mb-0 sm:mr-4 flex-shrink-0">
        <Image
          src="/images/vip-banner.png"
          alt="VIP Mascot"
          width={96}
          height={96}
          className="sm:w-[120px] sm:h-[120px]"
          priority
        />
      </div>

      {/* Textual content */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 md:gap-4">
        <h3 className="text-lg md:text-xl font-bold text-white sm:text-left text-center leading-tight">
          გაიუმჯობესე გამოცდილება
        </h3>
        <p className="text-xs md:text-sm text-gray-300 w-full sm:text-left text-center">
          მხარი დაუჭირე Manganime-ს, ისარგებლე პლატფორმით რეკლამების გარეშე და ექსკლუზიური პროფილის ფუნქციებით.
        </p>

        <ul className="hidden sm:flex flex-wrap gap-2">
          {BENEFITS.map((b, i) => (
            <li key={i} className="flex items-center gap-1 rounded bg-black/30 px-2 py-1 text-[11px] text-gray-200">
              {b.icon}
              {b.label}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA button */}
      <Link
        href="/vip"
        className="relative z-10 sm:ml-auto mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:scale-105 hover:from-purple-500 hover:to-pink-400"
      >
        <Crown className="h-4 sm:text-left text-center w-4" /> მიიღე VIP
      </Link>
    </motion.div>
  );
} 