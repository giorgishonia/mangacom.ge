import { motion, AnimatePresence } from "framer-motion"
import React, { useEffect, useState } from "react"

interface LogoLoaderProps {
  /** PNG/SVG path of the logo to be filled */
  src: string
  /** Optional callback that fires once the fill animation has completed */
  onComplete?: () => void
  /** Optional className for extra styling */
  className?: string
  /** Optional progress value (0-100) to control animation externally */
  progress?: number
  /** Optional text to display below the logo */
  loadingText?: string
}

/**
 * Full-screen overlay that animates a logo from left → right.
 * It uses a double-image technique:
 *   1. A faint base logo (outlined / low-opacity)
 *   2. The same logo on top, revealed via a left-to-right clip-path animation
 * Now supports external progress control for chapter loading indication.
 */
export const LogoLoader: React.FC<LogoLoaderProps> = ({ 
  src, 
  onComplete, 
  className, 
  progress,
  loadingText = "იტვირთება..."
}) => {
  const [internalProgress, setInternalProgress] = useState(0)

  // Use external progress if provided, otherwise use internal animation
  const currentProgress = progress !== undefined ? progress : internalProgress

  // Handle completion
  useEffect(() => {
    if (currentProgress >= 100 && onComplete) {
      const timer = setTimeout(onComplete, 200) // Small delay for smoother UX
      return () => clearTimeout(timer)
    }
  }, [currentProgress, onComplete])

  // Internal animation when no external progress is provided
  useEffect(() => {
    if (progress === undefined) {
      const timer = setTimeout(() => {
        setInternalProgress(100)
      }, 1600) // Match original animation timing
      return () => clearTimeout(timer)
    }
  }, [progress])

  // Calculate clip path based on progress
  const clipPathValue = `inset(0 ${100 - currentProgress}% 0 0)`

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
          className="relative w-52 sm:w-64 md:w-72 lg:w-80 select-none flex flex-col items-center"
        >
          <div className="relative">
            {/* Faint base logo */}
            <img
              src={src}
              alt="content logo outline"
              className="w-full h-auto opacity-15 pointer-events-none"
            />

            {/* Animated fill – controlled by progress */}
            <motion.img
              src={src}
              alt="content logo fill"
              className="absolute top-0 left-0 w-full h-auto pointer-events-none"
              style={{
                // Feather the right-hand edge so the leading edge is smooth.
                WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
                maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
                clipPath: clipPathValue,
              }}
              animate={{
                clipPath: clipPathValue
              }}
              transition={{
                duration: 0.3,
                ease: "easeOut"
              }}
            />
          </div>

          {/* Loading text and progress indicator */}
          <div className="mt-6 text-center">
            <motion.p 
              className="text-white/80 text-sm font-medium mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {loadingText}
            </motion.p>
            
            {/* Progress bar */}
            <motion.div 
              className="w-48 h-1 bg-white/10 hidden rounded-full overflow-hidden"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full origin-left"
                animate={{
                  scaleX: currentProgress / 100
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut"
                }}
              />
            </motion.div>
            
            {/* Percentage display */}
            <motion.p 
              className="text-white/60 text-xs mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {Math.round(currentProgress)}%
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 