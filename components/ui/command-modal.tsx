import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandModalProps {
    isOpen: boolean;
    onClose: () => void;
    placeholder?: string;
    children?: React.ReactNode;
    leftElement?: React.ReactNode;
    footerElement?: React.ReactNode;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    hideSearch?: boolean;
    // Navigation state
    showSpaceForm?: boolean;
    setShowSpaceForm?: (show: boolean) => void;
    showSpaces?: boolean;
    setShowSpaces?: (show: boolean) => void;
    showModels?: boolean;
    setShowModels?: (show: boolean) => void;
    selectedProvider?: any;
    setSelectedProvider?: (provider: any) => void;
    showConversations?: boolean; //for showing conversations list
    setShowConversations?: (show: boolean) => void; //for showing conversations list
}

export function CommandModal({
    isOpen,
    onClose,
    placeholder = 'Type a command or search...',
    children,
    leftElement,
    footerElement,
    searchValue,
    onSearchChange,
    hideSearch = false,
    showSpaceForm,
    setShowSpaceForm,
    showSpaces,
    setShowSpaces,
    showModels,
    setShowModels,
     selectedProvider,
    setSelectedProvider,
    showConversations,
    setShowConversations
}: CommandModalProps) {

    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && !hideSearch) {
            // Small delay to ensure the modal is rendered
            const timeoutId = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, hideSearch]);



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
                    {/* Enhanced backdrop with deeper blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90"
                        onClick={onClose}
                    />

                    {/* Command Menu with enhanced animations */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ 
                            duration: 0.2,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className="relative w-full max-w-2xl"
                    >
                        <Command
                            className="relative overflow-hidden w-full bg-black/80 border border-white/[0.1] shadow-[0_0_30px_rgba(62,207,255,0.1)] rounded-xl"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    onClose();

                                } else if (e.key === 'Backspace' && !searchValue) {
                                    // Handle back navigation when search is empty

                                    if (showSpaceForm && setShowSpaceForm) {
                                        setShowSpaceForm(false);
                                        e.preventDefault();
                                    } else if (showSpaces && setShowSpaces) {
                                        setShowSpaces(false);
                                        e.preventDefault();
                                     } else if (showModels && setShowModels) {
                                        if(selectedProvider && setSelectedProvider){
                                            setSelectedProvider(null);
                                        } else {
                                            setShowModels(false);
                                        }
                                        e.preventDefault();
                                    }
                                     else if (showConversations && setShowConversations) { //handle back for conv.
                                        setShowConversations(false);
                                        e.preventDefault();
                                    }
                                    onSearchChange?.('');
                                }
                            }}
                           shouldFilter={true} // Enable filtering.
                            loop
                        >
                            <div
                                className={cn(
                                    "flex items-center px-4 gap-3",
                                    !hideSearch ? 'border-b border-white/[0.08]' : 'py-3'
                                )}
                            >
                                {leftElement && (
                                    <div className="text-white/60 transition-colors duration-200 group-hover:text-white/80">
                                        {leftElement}
                                    </div>
                                )}
                                {!hideSearch && (
                                    <div className="flex items-center flex-1 gap-3">
                                        <Search className="w-5 h-5 text-white/40" />
                                        <Command.Input
                                            ref={inputRef}
                                            value={searchValue}
                                            onValueChange={onSearchChange}
                                            placeholder={placeholder}
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                            className={cn(
                                                "flex-1 h-14 bg-transparent text-white/90 outline-none",
                                                "text-base placeholder:text-white/40 transition-colors duration-200",
                                                "focus:placeholder:text-white/60 focus:bg-white/[0.02]"
                                            )}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col h-[min(70vh,500px)]">
                                <Command.List className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 p-4 space-y-2">
                                    {!hideSearch && searchValue && (
                                        <Command.Empty className="py-8 text-center">
                                            <p className="text-sm text-white/40">No results found.</p>
                                            <p className="text-xs text-white/30 mt-1">Try searching for actions, conversations, or spaces</p>
                                        </Command.Empty>
                                    )}

                                    {children}
                                </Command.List>

                                {footerElement && (
                                    <div className="flex items-center justify-center p-2 border-t border-white/[0.08]">
                                        {footerElement}
                                    </div>
                                )}
                            </div>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}