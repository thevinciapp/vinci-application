"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';


interface UnifiedInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void> | void;
  disabled?: boolean;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);



  return (
          <div
            className={`
              bg-black border border-white/[0.2]
              before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-white/[0.02] before:-z-10
              p-3 transition-all duration-300 rounded-xl relative overflow-visible
              shadow-[0_0_15px_-5px_rgba(94,106,210,0.4)]
              after:absolute after:inset-0 after:rounded-xl after:-z-20 after:transition-opacity after:duration-300
              after:bg-gradient-to-t after:from-[#5E6AD2]/20 after:to-transparent after:blur-xl
              ${isFocused
                ? 'ring-2 ring-[#5E6AD2]/30 ring-offset-0 shadow-[0_0_30px_-5px_rgba(94,106,210,0.6)] after:opacity-100'
                : 'after:opacity-70'
              }
            `}
          >
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={onChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (value.trim()) {
                        onSubmit();
                      }
                    }
                  }}
                  placeholder="Type your message..."
                  className="w-full text-sm resize-none min-h-[48px] max-h-[200px] px-1 py-0.5 focus:bg-transparent bg-transparent focus:outline-none transition-colors duration-200 overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-white/90 placeholder:text-white/40"
                  rows={1}
                  disabled={disabled}
                />
              </div>
              <button
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md relative
                  bg-white/[0.03] border border-white/[0.1]
                  transition-all duration-300
                  overflow-hidden backdrop-blur-sm
                  group
                  ${false || disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.06] hover:border-white/[0.15]'}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  if (value.trim()) {
                    onSubmit();
                  }
                }}
                disabled={false || disabled}
              >
                {/* Glow effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent opacity-80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                <div className="absolute inset-0 bg-white/5 shadow-[inset_0_0_15px_rgba(255,255,255,0.2)]" />

                {/* Content */}
                <div className="relative z-10 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-white/90" />
                  <span className="text-sm font-medium text-white/90">Send</span>
                </div>

                {/* Hover glow */}
                <div className={`
                  absolute inset-0 bg-white/5 opacity-0 blur-md
                  transition-opacity duration-300
                  group-hover:opacity-100
                `} />
              </button>
            </div>
          </div>
  );
};