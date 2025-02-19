"use client";

import React, { ChangeEvent, useRef, useState, useEffect } from 'react';
import { Send } from 'lucide-react';

interface UnifiedInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  children
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    console.log(value)
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    };

    adjustHeight();
  }, [value]);

  return (
    <div className="relative">
      {children}
      <div 
        className={`
          relative rounded-2xl rounded-t-none
          bg-white/[0.03] border border-white/[0.05]
          transition-all duration-300
          overflow-hidden backdrop-blur-xl
          ${isFocused ? 'bg-white/[0.05] border-white/[0.1]' : ''}
        `}
      >
        <div className="flex items-start gap-3">
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
              className="w-full text-sm resize-none min-h-[48px] max-h-[200px] px-4 py-3 focus:bg-transparent bg-transparent focus:outline-none transition-colors duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent text-white/90 placeholder:text-white/40"
              style={{ overflow: value.split('\n').length > 8 ? 'auto' : 'hidden' }}
              rows={1}
              disabled={disabled}
            />
          </div>
          <button
            className={`
              flex items-center gap-2 px-4 py-2 mt-2 mr-2 rounded-xl relative
              bg-[#1B1B1B] border border-white/[0.05]
              transition-all duration-300
              overflow-hidden backdrop-blur-xl
              group shrink-0
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.06] hover:border-white/[0.15]'}
            `}
            onClick={(e) => {
              e.preventDefault();
              if (value.trim()) {
                onSubmit();
              }
            }}
            disabled={disabled}
          >
            <span className="text-white/90 text-sm font-medium">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};