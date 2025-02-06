import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function CommandModal({ isOpen, onClose, placeholder = 'Type a command or search...', children }: CommandModalProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop with enhanced blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Command Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-2xl w-full mx-auto mt-[20vh]"
          >
            <div
              className={`
                relative overflow-hidden rounded-xl
                bg-black border border-white/[0.2]
                before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-white/[0.02] before:-z-10
                transition-all duration-300
                shadow-[0_0_15px_-5px_rgba(94,106,210,0.4)]
                after:absolute after:inset-0 after:rounded-xl after:-z-20 after:transition-opacity after:duration-300
                after:bg-gradient-to-t after:from-[#5E6AD2]/20 after:to-transparent after:blur-xl
                ${isFocused 
                  ? 'ring-2 ring-[#5E6AD2]/30 ring-offset-0 shadow-[0_0_30px_-5px_rgba(94,106,210,0.6)] after:opacity-100'
                  : 'after:opacity-70'
                }
              `}
            >
              <Command
                className="relative overflow-hidden w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onClose();
                  }
                }}
              >
                <div 
                  className="flex items-center border-b border-white/10 px-4"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
                  }}
                >
                  <Command.Input
                    placeholder={placeholder}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="flex-1 h-14 bg-transparent text-white/90 placeholder:text-white/40 outline-none"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  <Command.Empty className="py-6 text-center text-sm text-white/40">
                    No results found.
                  </Command.Empty>

                  {children}
                </div>
              </Command>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
