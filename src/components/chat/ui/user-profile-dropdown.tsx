import { useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth();
  
  const toggleDropdown = () => setIsOpen(!isOpen);
  
  return (
    <div className="relative">
      <button 
        onClick={toggleDropdown}
        className="flex items-center space-x-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <User size={20} />
        <span className="hidden sm:inline-block">{user?.email || 'User'}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded shadow-lg z-10 py-1">
          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
            {user?.email || 'Unknown User'}
          </div>
          <button
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
