"use client"

import { useState, useEffect } from "react"
import { motion as m, AnimatePresence } from "framer-motion"

interface TypewriterTextProps {
  text: string
  speed?: number
}

export function TypewriterText({ text, speed = 25 }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayText("")
    setCurrentIndex(0)
    setIsComplete(false)
  }, [text])

  useEffect(() => {
    if (currentIndex < text.length) {
      const randomDelay = speed * (0.8 + Math.random() * 0.4) // Add slight randomness for more natural effect
      
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
        
        if (currentIndex === text.length - 1) {
          setIsComplete(true)
        }
      }, randomDelay)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, speed])

  return (
    <m.span
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayText}
    </m.span>
  )
}
