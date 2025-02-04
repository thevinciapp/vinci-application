import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpaceCommand } from './space-command-provider';

interface CommandItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  actions?: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    onSelect: () => void;
  }>;
}

export const CommandModal = ({
  isOpen,
  onClose,
  position = 'top',
  items,
  searchPlaceholder = 'Search...',
}: {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom';
  items: CommandItem[];
  searchPlaceholder?: string;
}) => {
  const { isExecuting, handleGlobalCommand } = useSpaceCommand();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className={`fixed inset-x-0 ${position === 'top' ? 'top-16' : 'bottom-24'} flex items-${position} justify-center`}>
            <motion.div
              initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
              className="w-full max-w-2xl px-4"
            >
              <Command 
                className="w-full bg-zinc-900/95 backdrop-blur-xl border border-white/5 rounded-lg shadow-2xl overflow-hidden"
                shouldFilter={true}
                loop={true}
              >
                <div className="border-b border-white/5">
                  <Command.Input 
                    placeholder={searchPlaceholder}
                    className="w-full px-4 py-3 bg-transparent text-white/90 placeholder:text-white/40 focus:outline-none text-sm"
                    autoFocus
                  />
                </div>
                <Command.List className="py-2 max-h-[300px] overflow-y-auto">
                  <Command.Empty className="px-4 py-2 text-sm text-white/40">
                    No results found.
                  </Command.Empty>
                  {items.map((item) => (
                    <Command.Group key={item.key}>
                      <Command.Item
                        value={item.label}
                        onSelect={() => !isExecuting && handleGlobalCommand(item.onSelect)}
                        className={`flex items-center gap-3 px-4 py-2 text-sm text-white/90 outline-none transition-colors duration-100
                          ${isExecuting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          data-[selected=true]:bg-white/10 data-[selected=true]:text-white
                          hover:bg-white/5 relative group`}
                      >
                        <div className="flex-shrink-0 w-5 h-5 text-white/60">
                          {item.icon}
                        </div>
                        <span className="flex-1">{item.label}</span>
                        {item.actions && (
                          <div className="absolute right-2 hidden group-hover:flex gap-2">
                            {item.actions.map(action => (
                              <button
                                key={action.key}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  !isExecuting && handleGlobalCommand(action.onSelect);
                                }}
                                className="p-1 hover:bg-white/10 rounded transition-colors duration-100"
                              >
                                {action.icon}
                              </button>
                            ))}
                          </div>
                        )}
                      </Command.Item>
                    </Command.Group>
                  ))}
                </Command.List>
              </Command>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
