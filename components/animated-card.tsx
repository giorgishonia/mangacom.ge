import React, { useRef, useState } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  perspective?: number; // Controls the 3D perspective effect
  tiltFactor?: number; // Controls how much the card tilts (0-1)
  parallaxFactor?: number; // Controls the parallax effect intensity (0-1)
  disabled?: boolean; // Disables the interactive effects
}

export function AnimatedCard({
  children,
  className,
  perspective = 1000,
  tiltFactor = 0.5,
  parallaxFactor = 0.02,
  disabled = false,
  ...props
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values for tracking mouse position
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Spring physics for smooth animation
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10 * tiltFactor, -10 * tiltFactor]), {
    stiffness: 300,
    damping: 30
  });
  
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10 * tiltFactor, 10 * tiltFactor]), {
    stiffness: 300,
    damping: 30
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled || !ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate normalized position (-0.5 to 0.5)
    const normalizedX = (e.clientX - centerX) / rect.width;
    const normalizedY = (e.clientY - centerY) / rect.height;
    
    x.set(normalizedX);
    y.set(normalizedY);
  }

  function handleMouseLeave() {
    if (disabled) return;
    
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }

  const { 
    // HTML Drag events
    onDrag, 
    onDragStart, 
    onDragEnd, 
    onDragOver, 
    onDragEnter, 
    onDragLeave, 
    onDrop, 
    // HTML Animation events
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    // HTML Transition events
    onTransitionEnd,
    ...restProps 
  } = props;

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative overflow-hidden transition-all",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: perspective,
        transformStyle: "preserve-3d",
        rotateX: disabled ? 0 : rotateX,
        rotateY: disabled ? 0 : rotateY,
      }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...restProps}
    >
      {/* Content container */}
      <div className="relative z-10 transform-gpu">
        {children}
      </div>
      
      {/* Parallax container for elements that move differently */}
      {!disabled && isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            transform: `translateX(${x.get() * 10 * parallaxFactor}px) translateY(${y.get() * 10 * parallaxFactor}px)`,
          }}
        >
          {/* This div can be used to add elements that move with parallax effect */}
        </div>
      )}
    </motion.div>
  );
} 