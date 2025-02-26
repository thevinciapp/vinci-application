import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickActionsCommandStore } from '@/lib/stores/quick-actions-command-store';

// Define the SimilarMessage type
interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  metadata?: Record<string, any>;
}

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
    isCreatingSpace?: boolean;
    showSimilarMessages?: boolean; // for showing similar messages
    setShowSimilarMessages?: (show: boolean) => void; // for showing similar messages
    similarMessages?: SimilarMessage[]; // the similar messages to display
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
    setShowConversations,
    showSimilarMessages,
    setShowSimilarMessages
}: CommandModalProps) {

    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { commandSearchValue, setCommandSearchValue } = useQuickActionsCommandStore();

    useEffect(() => {
        if (isOpen && !hideSearch) {
            // Small delay to ensure the modal is rendered
            const timeoutId = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, hideSearch]);

    // Handle search value change
    const handleSearchChange = (value: string) => {
        setCommandSearchValue(value);
        onSearchChange?.(value);
    };

    // Reset search value when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCommandSearchValue('');
        }
    }, [isOpen, setCommandSearchValue]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
                    {/* Enhanced backdrop with deeper blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Command Menu with enhanced animations */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ 
                            duration: 0.25,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className="relative w-full max-w-2xl"
                    >
                        <Command
                            className="relative overflow-hidden w-full bg-black/80 backdrop-blur-md border border-white/[0.1] shadow-[0_0_30px_rgba(62,207,255,0.1)] rounded-xl"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    onClose();
                                } else if (e.key === 'Backspace' && !commandSearchValue) {
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
                                    } else if (showConversations && setShowConversations) { //handle back for conv.
                                        setShowConversations(false);
                                        e.preventDefault();
                                    } else if (showSimilarMessages && setShowSimilarMessages) { // handle back for similar messages
                                        setShowSimilarMessages(false);
                                        e.preventDefault();
                                    }
                                    handleSearchChange('');
                                }
                            }}
                            shouldFilter={true} // Always enable filtering
                            filter={(value, search) => {
                                if (!search) return 1;
                                // For similar messages, we need special handling
                                if (showSimilarMessages && value.startsWith('similar-message-')) {
                                    // The value contains id, role, conversation title, and content
                                    // This should match against all those elements
                                    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                                }
                                // Default filtering for other items
                                return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                            }}
                            loop
                        >
                            <div
                                className={cn(
                                    "flex items-center px-4 gap-3",
                                    !hideSearch ? 'border-b border-white/[0.08]' : 'py-3'
                                )}
                            >
                                {/* Don't show back button for similar messages */}
                                {leftElement && !showSimilarMessages && (
                                    <div className="text-white/60 transition-colors duration-200 group-hover:text-white/80">
                                        {leftElement}
                                    </div>
                                )}
                                {!hideSearch && (
                                    <div className="flex items-center flex-1">
                                        <Search className="w-5 h-5 text-white/50 transition duration-150 hover:text-white/70" />
                                        <Command.Input
                                            ref={inputRef}
                                            value={commandSearchValue}
                                            onValueChange={handleSearchChange}
                                            placeholder={placeholder}
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                            className={cn(
                                                "flex-1 h-12 bg-transparent text-white/90 outline-none",
                                                "text-base placeholder:text-white/50",
                                                "focus:placeholder:text-white/70 focus:bg-white/[0.02]",
                                                "px-3 py-2"
                                            )}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col h-[min(70vh,500px)]">
                                <Command.List className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 p-4 space-y-2">
                                    {!hideSearch && commandSearchValue && !showSimilarMessages && (
                                        <Command.Empty className="py-12 text-center flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-gray-800/70 flex items-center justify-center mb-4">
                                                <Search className="w-8 h-8 text-gray-500" />
                                            </div>
                                            <p className="text-lg text-white/60 font-medium">No results found</p>
                                            <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
                                                Try searching for actions, conversations, or spaces
                                            </p>
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