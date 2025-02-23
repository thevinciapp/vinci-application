"use client";

import React, { ChangeEvent, useRef, useState, useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from './button';

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

  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  useHotkeys('/', (e) => {
    e.preventDefault();
    focusInput();
  }, { enableOnFormTags: true });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    };

    adjustHeight();
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit();
  };

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
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={"Type your message... (Press / to focus)"}
            className="flex-1 text-sm resize-none min-h-[48px] max-h-[200px] px-4 py-3 focus:bg-transparent bg-transparent focus:outline-none transition-colors duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent text-white/90 placeholder:text-white/40"
            style={{ overflow: value.split('\n').length > 8 ? 'auto' : 'hidden' }}
            rows={1}
          />

            <Button
              variant="cyan"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={disabled}
              className="h-8"
            >
              Send
            </Button>
          </div>
        </div>
        </div>
  );
};