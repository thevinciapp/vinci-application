import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/avatar";
import { Button } from "@/shared/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu";
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/services/user/user-service';
import { useNotifications } from '@/features/notifications/use-notifications';
import { useUser } from "@/features/user/use-user";
import { cn } from "@/shared/utils/cn-utils";

interface UserProfileDropdownProps {
  user: User | UserProfile;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const navigate = useNavigate();
  const { signOut } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const userInitials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full border border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200"
          aria-label="User profile"
        >
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500"></span>
            </span>
          )}
          <Avatar>
            <AvatarImage src={('user_metadata' in user) ? user.user_metadata?.avatar_url : undefined} alt={user.email || ''} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm font-medium leading-none text-white/90 truncate max-w-[200px]">
              {('user_metadata' in user) ? user.user_metadata?.full_name || user.email : user.email}
            </p>
            <p className="text-xs leading-none text-white/40 truncate max-w-[200px]">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setShowNotifications(!showNotifications);
            }}
            className="cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs">
                {unreadCount}
              </div>
            )}
          </DropdownMenuItem>
          {showNotifications && (
            <>
              {unreadCount > 0 && (
                <div className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs text-white/70 hover:text-white hover:bg-white/[0.05]"
                    onClick={handleMarkAllAsRead}
                  >
                    Mark all as read
                  </Button>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-white/50">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-3 py-2 text-sm hover:bg-white/[0.05] transition-colors',
                        !notification.is_read && 'bg-white/[0.03]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-white/90">{notification.title}</div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-white/70 hover:text-white hover:bg-white/[0.05]"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                      <div className="mt-1 text-white/70 text-xs">{notification.description}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          <Link to="/protected/profile">
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <Link to="/protected/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-cyan-400 hover:text-cyan-300 focus:text-cyan-300"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 