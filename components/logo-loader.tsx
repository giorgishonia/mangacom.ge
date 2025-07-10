import { motion, AnimatePresence } from "framer-motion"
import React from "react"

interface LogoLoaderProps {
  /** PNG/SVG path of the logo to be filled */
  src: string
  /** Optional callback that fires once the fill animation has completed */
  onComplete?: () => void
  /** Optional className for extra styling */
  className?: string
}

/**
 * Full-screen overlay that animates a logo from left → right.
 * It uses a double-image technique:
 *   1. A faint base logo (outlined / low-opacity)
 *   2. The same logo on top, revealed via a left-to-right clip-path animation
 */
export const LogoLoader: React.FC<LogoLoaderProps> = ({ src, onComplete, className }) => {
  return (
    <AnimatePresence>
      <motion.div
        key="logo-loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={
          // Semi-transparent dark overlay with backdrop blur so underlying
          // page is still visible but softly defocused.
          "fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-lg " +
          (className ?? "")
        }
      >
        <motion.div
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          exit={{ scale: 1.1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-52 sm:w-64 md:w-72 lg:w-80 select-none"
        >
          {/* Faint base logo */}
          <img
            src={src}
            alt="content logo outline"
            className="w-full h-auto opacity-15 pointer-events-none"
          />

          {/* Animated fill – keyframed so it starts fast and eases towards the end. */}
          <motion.img
            src={src}
            alt="content logo fill"
            className="absolute top-0 left-0 w-full h-auto pointer-events-none"
            style={{
              // Feather the right-hand edge so the leading edge is smooth.
              WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
              maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
            }}
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{
              clipPath: [
                "inset(0 100% 0 0)", // 0 %
                "inset(0 20% 0 0)",  // ~80 % revealed quickly
                "inset(0 0% 0 0)"    // final 20 % slow reveal
              ]
            }}
            transition={{
              duration: 1.8,
              times: [0, 0.6, 1],   // first 60 % of duration covers 80 % of width
              ease: "easeOut"
            }}
            onAnimationComplete={onComplete}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 