import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type InkVariant = 'splash' | 'brushStroke' | 'drip';

interface InkTransitionProps {
  children: React.ReactNode;
  className?: string;
  variant?: InkVariant;
  color?: string;
  isVisible?: boolean;
}

// SVG Paths for different ink variants
const inkPaths = {
  splash: "M0,0 C50,40 70,50 100,40 C150,10 170,80 200,90 C250,100 270,80 300,70 C350,50 370,30 400,50 L400,400 L0,400 Z",
  brushStroke: "M0,100 C100,90 150,110 200,80 C250,60 300,90 350,70 C400,50 450,90 500,80 L500,400 L0,400 Z",
  drip: "M0,0 L500,0 L500,90 C480,100 470,120 475,150 C450,200 470,250 450,300 C430,350 440,380 430,400 L0,400 Z"
};

export function InkTransition({
  children,
  className,
  variant = 'splash',
  color = '#6d28d9', // Default purple color
  isVisible = true,
}: InkTransitionProps) {
  const [path, setPath] = useState(inkPaths[variant]);
  const [isRendered, setIsRendered] = useState(false);

  // Update path when variant changes
  useEffect(() => {
    setPath(inkPaths[variant]);
  }, [variant]);

  // Handle animation complete
  const handleAnimationComplete = () => {
    if (!isVisible) {
      setIsRendered(false);
    }
  };

  // When isVisible changes to true, start rendering
  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
    }
  }, [isVisible]);

  return (
    <div className={cn('relative overflow-hidden w-full h-full', className)}>
      {children}
      
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {isRendered && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-50"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={isVisible 
              ? { clipPath: "inset(0 0% 0 0)" }
              : { clipPath: "inset(0 0 0 100%)" }
            }
            exit={{ clipPath: "inset(0 0 0 100%)" }}
            transition={{ 
              type: "spring", 
              stiffness: 70, 
              damping: 20,
              duration: 0.8 
            }}
          >
            {/* SVG Mask for ink transition */}
            <svg
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 400"
              preserveAspectRatio="none"
            >
              <motion.path
                d={path}
                fill={color}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 