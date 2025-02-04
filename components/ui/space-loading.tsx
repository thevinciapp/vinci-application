'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface SpaceLoadingProps {
  message?: string;
}

// Generate deterministic star positions using a seed
const generateStarPositions = (count: number) => {
  const positions = [];
  for (let i = 0; i < count; i++) {
    // Use a deterministic formula based on the index
    const left = ((i * 137.508) % 100).toFixed(2);
    const top = ((i * 222.713) % 100).toFixed(2);
    // Vary the size slightly based on index
    const size = 1 + (i % 3);
    positions.push({ 
      left: `${left}%`, 
      top: `${top}%`,
      size,
      delay: i * 0.1
    });
  }
  return positions;
};

export const SpaceLoading = ({ message = 'Preparing your space...' }: SpaceLoadingProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Memoize star positions to keep them consistent across renders
  const starPositions = useMemo(() => generateStarPositions(50), []);

  useEffect(() => {
    // Delay the initial appearance
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    // Delay the message change
    const messageTimer = setTimeout(() => {
      setCurrentMessage(message);
    }, 800);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(messageTimer);
    };
  }, [message]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden">
      <div className="relative">
        {/* Outer space glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-20 blur-xl"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        
        {/* Loading spinner */}
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            rotate: 360 
          }}
          transition={{
            opacity: { duration: 0.5 },
            rotate: {
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }
          }}
        >
          <Loader2 className="w-12 h-12 text-white" />
        </motion.div>
      </div>

      {/* Message with typing effect */}
      <AnimatePresence mode="wait">
        {isVisible && currentMessage && (
          <motion.div
            key={currentMessage}
            className="mt-8 text-lg font-medium text-white/80"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {currentMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stars background */}
      <div className="fixed inset-0 -z-10">
        {starPositions.map((position, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              left: position.left,
              top: position.top,
              width: `${position.size}px`,
              height: `${position.size}px`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0.5, 1, 0],
              scale: [0, 1, 0.8, 1, 0],
              filter: [
                'blur(0px)',
                'blur(1px)',
                'blur(0px)',
                'blur(1px)',
                'blur(0px)'
              ]
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: position.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};
