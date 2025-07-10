import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // Controls the intensity of the light effect (0-1)
  glassOpacity?: number; // Controls the glass opacity (0-1)
  disabled?: boolean; // Disables the interactive effects
}

export function GlassCard({
  children,
  className,
  intensity = 0.15,
  glassOpacity = 0.1,
  disabled = false,
  ...props
}: GlassCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle mouse movement to track light source position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePosition({ x, y });
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-xl backdrop-blur-md border transition-all duration-300",
        isHovered && !disabled ? "shadow-lg" : "shadow-md",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: `rgba(10, 10, 30, ${glassOpacity})`,
        borderColor: isHovered && !disabled 
          ? "rgba(255, 255, 255, 0.2)" 
          : "rgba(255, 255, 255, 0.05)",
      }}
      initial={{ scale: 1 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {/* Dynamic light reflection effect */}
      {!disabled && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isHovered 
              ? `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(255, 255, 255, ${intensity}), transparent 50%)`
              : "none",
            mixBlendMode: "overlay"
          }}
        />
      )}
      
      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
} 