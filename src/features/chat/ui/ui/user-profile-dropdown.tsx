import { User } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/use-auth';
import { Button } from 'shared/components/button';
import { useState, useRef, useEffect } from 'react';

interface UserProfileDropdownProps {
  user: User;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initials = user.user_metadata.full_name
    ?.split(' ')
    .map((name: string) => name[0])
    .join('') || user.email?.[0] || '?';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="h-8 w-8 rounded-full p-0 overflow-hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-full h-full bg-white/5">
          {user.user_metadata.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={initials}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-medium">
              {initials}
            </div>
          )}
        </div>
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white/5 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-lg">
          <div className="px-4 py-3">
            <p className="text-sm font-medium">{user.user_metadata.full_name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <div className="border-t border-white/[0.08]">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-none px-4 py-2 text-sm text-red-500 hover:text-red-400"
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
