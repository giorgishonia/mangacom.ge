import React from "react";
import { motion, AnimationDefinition, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

// Props that Framer Motion re-types with its own signatures
type FramerMotionOverriddenProps = 'onAnimationStart' | 'onAnimationComplete' | 'onDragStart' | 'onDrag' | 'onDragEnd' | 'onHoverStart' | 'onHoverEnd' | 'onTap' | 'onTapStart' | 'onTapCancel';

interface VIPBadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, FramerMotionOverriddenProps> {
  // If you need to expose Framer Motion's specific versions of these handlers, define them here, e.g.:
  // onAnimationStart?: (definition: AnimationDefinition) => void;
  // onDrag?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;

  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCrown?: boolean;
}

// Default color for the badge
const defaultBadgeColor = 'from-purple-500 to-purple-300';

// Size mappings
const sizeMappings = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function VIPBadge({
  animated = true,
  size = 'sm',
  showCrown = true,
  className,
  ...props
}: VIPBadgeProps) {
  // Animation variants
  const variants = {
    initial: { scale: 1 },
    hover: animated ? { 
      scale: 1.05, 
      boxShadow: `0 0 8px rgba(128, 0, 128, 0.5)` // Default purple shadow
    } : {}
  };
  
  return (
    <motion.div
      className={cn(
        "rounded-full ml-2 font-bold flex items-center justify-center",
        `bg-gradient-to-r ${defaultBadgeColor}`,
        sizeMappings[size],
        'text-white', // Default text color
        className
      )}
      initial="initial"
      whileHover="hover"
      variants={variants}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      {...props}
    >
      {showCrown && (
        <span className="mr-1">
          <CrownIcon className={cn(
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
          )} />
        </span>
      )}
      VIP
    </motion.div>
  );
}

// Crown icon component
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path d="M12 1l3.22 3.22h4.56v4.56L23 12l-3.22 3.22v4.56h-4.56L12 23l-3.22-3.22H4.22v-4.56L1 12l3.22-3.22V4.22h4.56L12 1z" />
    </svg>
  );
} 