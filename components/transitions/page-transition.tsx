import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Page transition variants
const pageVariants = {
  initial: {
    clipPath: 'circle(0% at 50% 50%)',
    opacity: 0,
  },
  animate: {
    clipPath: 'circle(100% at 50% 50%)',
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 70,
      damping: 20,
      mass: 1,
      duration: 0.6,
    },
  },
  exit: {
    clipPath: 'circle(0% at 95% 5%)',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 70,
      damping: 20,
      duration: 0.4,
    },
  },
};

// Page curl variants
const curlVariants = {
  initial: {
    opacity: 0,
    x: '100%',
    rotate: 0,
  },
  animate: {
    opacity: 1,
    x: 0,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 50,
      damping: 10,
    },
  },
  exit: {
    opacity: 0,
    x: '-100%',
    rotate: -10,
    transition: {
      type: 'spring',
      stiffness: 50,
      damping: 10,
    },
  },
};

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  transitionType?: 'fade' | 'slide' | 'curl' | 'circle';
}

export function PageTransition({
  children,
  className,
  transitionType = 'circle',
}: PageTransitionProps) {
  const router = useRouter();
  const routerKey = useRef(Math.random().toString(36).slice(2, 9));

  // Update the key when the route changes to trigger a new animation
  useEffect(() => {
    const handleRouteChange = () => {
      routerKey.current = Math.random().toString(36).slice(2, 9);
    };

    // Placeholder for route change listener
    // In a real implementation, we'd need to subscribe to router events
    
    return () => {
      // Cleanup router events listener
    };
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routerKey.current}
        className={cn('w-full h-full', className)}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={transitionType === 'circle' ? pageVariants : curlVariants}
      >
        {children}
        
        {/* Shadow overlay for the curl effect */}
        {transitionType === 'curl' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, rgba(0,0,0,0.2), transparent 20%)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
            }}
            variants={curlVariants}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
} 